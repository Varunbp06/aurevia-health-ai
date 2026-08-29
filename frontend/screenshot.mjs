import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outDirMobile = path.join(outDir, 'mobile');
if (!fs.existsSync(outDirMobile)) fs.mkdirSync(outDirMobile, { recursive: true });

const BASE = 'http://127.0.0.1:3000';
const API_BASE = 'http://127.0.0.1:8000';

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Server not ready at ${url}`);
}

async function login(page, username, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('#login-username', { timeout: 10000 });
  await page.fill('#login-username', username);
  await page.fill('#login-password', password);
  await page.click('button[type="submit"]');
  // wait for navigation to dashboard or error
  try {
    await page.waitForURL('**/dashboard', { timeout: 8000 });
    return true;
  } catch {
    // check if error shown
    const err = await page.locator('text=Incorrect').first().isVisible().catch(() => false);
    if (err) console.log(`Login failed for ${username}`);
    // still check if we are on dashboard via localStorage
    if (page.url().includes('dashboard')) return true;
    return false;
  }
}

async function shot(page, route, name, viewport) {
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch (e) {
    console.log(`goto failed ${route}: ${e.message}`);
  }
  await page.waitForTimeout(1800); // let animations + data settle
  const file = path.join(viewport === 'mobile' ? outDirMobile : outDir, `${name}-${viewport}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`✓ ${name}-${viewport} -> ${file}`);
  return file;
}

(async () => {
  console.log('Waiting for frontend server...');
  await waitForServer(`${BASE}/`, 30000);
  console.log('Frontend ready, launching browser...');
  const browser = await chromium.launch({ headless: true });
  
  // --- Desktop ---
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktop.newPage();
  
  // collect console errors
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[console error] ${msg.text()}`);
  });
  page.on('pageerror', err => console.log(`[pageerror] ${err.message}`));

  console.log('=== Login as admin ===');
  let ok = await login(page, 'aurevia_admin', 'Admin123!');
  if (!ok) {
    console.log('trying dr_smith');
    ok = await login(page, 'dr_smith', 'Doctor123!');
  }
  if (!ok) {
    console.log('login failed, will still screenshot public routes');
  } else {
    console.log('login ok, current url', page.url());
  }

  // Public routes
  await shot(page, '/login', '01-login', 'desktop');
  await shot(page, '/signup', '02-signup', 'desktop');

  // Protected routes (after login, we should be authenticated)
  const routes = [
    ['/dashboard', '03-dashboard'],
    ['/patients', '04-patients'],
    ['/patients/2', '05-patient-detail'],
    ['/chat', '06-chat'],
    ['/predict', '07-predict-hub'],
    ['/predict/diabetes', '08-predict-diabetes'],
    ['/predict/heart', '09-predict-heart'],
    ['/predict/kidney', '10-predict-kidney'],
    ['/capacity', '11-capacity'],
    ['/infrastructure', '12-infrastructure'],
    ['/telemetry', '13-telemetry'],
    ['/admin', '14-admin'],
    ['/profile', '15-profile'],
    ['/pricing', '16-pricing'],
    ['/about', '17-about'],
    ['/apps', '18-apps'],
    ['/federated', '19-federated'],
    ['/docs', '25-docs'],
    ['/developers', '26-developers'],
    ['/intelligence', '20-intelligence'],
    ['/companion', '21-companion'],
    ['/data-engineering', '22-data-engineering'],
    ['/abdm', '23-abdm'],
    ['/telemedicine', '24-telemedicine'],
  ];

  for (const [route, name] of routes) {
    try {
      await shot(page, route, name, 'desktop');
    } catch (e) {
      console.log(`failed ${name}: ${e.message}`);
    }
  }

  await desktop.close();

  // --- Mobile ---
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mPage = await mobile.newPage();
  mPage.on('console', msg => { if (msg.type() === 'error') console.log(`[mobile console error] ${msg.text()}`); });
  console.log('=== Mobile login ===');
  await login(mPage, 'aurevia_admin', 'Admin123!').catch(() => {});
  // also try dr_smith fallback
  if (!mPage.url().includes('dashboard')) {
    await login(mPage, 'dr_smith', 'Doctor123!').catch(()=>{});
  }
  for (const [route, name] of routes.slice(0, 8)) { // sample mobile for first 8
    try {
      await shot(mPage, route, name, 'mobile');
    } catch (e) { console.log(`mobile failed ${name}`); }
  }
  // also login mobile
  await shot(mPage, '/login', '01-login', 'mobile');
  
  await mobile.close();
  await browser.close();
  console.log('DONE');
})();
