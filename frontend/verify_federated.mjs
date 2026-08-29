import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// helper to login + handle EULA overlay
async function login() {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#login-username', { timeout: 8000 });
  await page.fill('#login-username', 'aurevia_admin');
  await page.fill('#login-password', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 8000 }).catch(()=>{});
  // Handle EULA modal if present (AuthGuard) — try API first, then UI, then force-remove
  try {
    const eulaTitle = page.locator('text=End User License Agreement').first();
    const hasEula = await eulaTitle.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasEula) {
      console.log('EULA modal detected, accepting...');
      // Try API accept via token in localStorage
      await page.evaluate(async () => {
        try {
          const raw = localStorage.getItem('healthcare-auth');
          if (raw) {
            const parsed = JSON.parse(raw);
            const token = parsed?.state?.token || parsed?.token;
            if (token) {
              await fetch('http://127.0.0.1:8000/v1/consent/accept', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ version: '1.0' })
              }).catch(()=>{});
              await fetch('http://127.0.0.1:8000/v1/eula/accept', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ version: '1.0' })
              }).catch(()=>{});
            }
          }
        } catch {}
      });
      await page.waitForTimeout(500);
      // Try UI scroll + click
      try {
        const terms = page.locator('div.flex-1.overflow-y-auto').first();
        if (await terms.isVisible({ timeout: 1000 }).catch(() => false)) {
          await terms.evaluate(el => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll')); });
          await page.waitForTimeout(600);
        }
        const acceptBtn = page.locator('button:has-text("I Accept")').first();
        if (await acceptBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('I Accept'));
            if (btn) { btn.disabled = false; btn.click(); }
          });
          await page.waitForTimeout(1000);
        }
      } catch {}
      // Force-remove modal if still there
      await page.evaluate(() => {
        const modal = document.querySelector('div.fixed.inset-0.z-50');
        if (modal) modal.remove();
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog && dialog.textContent.includes('End User License')) dialog.remove();
      });
      await page.waitForTimeout(500);
      console.log('EULA handled');
    }
  } catch (e) {
    console.log('EULA handling err', e.message);
  }
}

await login();
console.log('logged in, url', page.url());

// Check federated
await page.goto(`${BASE}/federated`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
let content = await page.content();
console.log('federated hero check:', content.includes('TabICLv2') ? 'PASS' : 'FAIL');
console.log('federated CTA check:', content.includes('View Documentation') ? 'PASS' : 'FAIL');
console.log('federated features check:', content.includes('Platform capabilities') ? 'PASS' : 'FAIL');
console.log('federated trust check:', content.includes('Trust &amp; compliance') || content.includes('Trust & compliance') ? 'PASS' : 'FAIL');
console.log('federated FAQ check:', content.includes('FAQ') ? 'PASS' : 'FAIL');
console.log('federated skip nav check:', content.includes('Skip to federated content') ? 'PASS' : 'FAIL');

// Check docs
await page.goto(`${BASE}/documentation`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
content = await page.content();
console.log('docs page check:', content.includes('Developer Docs') ? 'PASS' : 'FAIL');
console.log('docs API check:', content.includes('API Reference') ? 'PASS' : 'FAIL');
console.log('docs EHR check:', content.includes('EHR') ? 'PASS' : 'FAIL');

// Check nav
await page.goto(`${BASE}/federated`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
// hover over Developers to see mega menu
const devTab = page.locator('button:has-text("Developers")').first();
if (await devTab.isVisible()) {
  console.log('nav Developers tab visible: PASS');
  await devTab.hover();
  await page.waitForTimeout(500);
  const docLink = page.locator('a[href="/documentation"]').first();
  console.log('nav doc link visible:', await docLink.isVisible() ? 'PASS' : 'FAIL');
} else {
  console.log('nav Developers tab visible: FAIL');
}

// Check SEO schemas
const schemas = await page.evaluate(() => {
  const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s => s.textContent);
  return scripts.join('|').substring(0, 800);
});
console.log('SEO schemas present:', schemas.includes('FAQPage') && schemas.includes('HowTo') ? 'PASS' : 'FAIL');
console.log(schemas.substring(0, 400));

await browser.close();
console.log('DONE');
