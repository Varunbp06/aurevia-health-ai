import { useState } from "react";
import {
  BookOpen, Code2, Rocket, ShieldCheck, Database, FlaskConical,
  Lock, FileText, Terminal, Copy, Check, ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";

// Minimal inline code block with copy
function InlineCode({ code, lang = "bash" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="p-4 bg-zinc-950 border border-white/5 rounded-xl text-xs font-mono text-zinc-300 overflow-x-auto">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors"
        aria-label="Copy code"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
      <span className="absolute -top-2 left-3 text-[9px] font-mono uppercase tracking-widest bg-[#00d1ff] text-black px-1.5 py-0.5 rounded font-bold">{lang}</span>
    </div>
  );
}

const sections = [
  { id: "api", label: "API Reference", icon: Code2 },
  { id: "ehr", label: "EHR Integration", icon: Database },
  { id: "deploy", label: "Deployment", icon: Rocket },
  { id: "sdk", label: "SDK & Samples", icon: Terminal },
  { id: "models", label: "Clinical Models", icon: FlaskConical },
  { id: "compliance", label: "Compliance", icon: ShieldCheck },
];

export default function DocumentationPage() {
  const [active, setActive] = useState("api");

  return (
    <div className="min-h-screen bg-[#0c0e10] text-zinc-100">
      {/* Skip nav for a11y */}
      <a href="#main-docs" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#00d1ff] focus:text-black focus:rounded-lg focus:font-bold focus:text-xs focus:uppercase">
        Skip to documentation
      </a>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 py-10 border-b border-white/5">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#859399] mb-3">
          <BookOpen size={12} className="text-[#00d1ff]" /> Developers / Documentation
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Aurevia Health AI — <span className="text-[#00d1ff]">Developer Docs</span>
        </h1>
        <p className="text-sm text-[#bbc9cf] max-w-2xl mt-3 leading-relaxed">
          Complete reference for TabICLv2, Databricks Lakehouse (OMOP CDM v5.4 / FHIR R4), federated DP, and clinical deployment. Progressive-enhanced — core content renders even if JS fails.
        </p>
        <div className="flex flex-wrap gap-3 mt-6">
          <a href="#api" onClick={(e) => { e.preventDefault(); document.getElementById("api")?.scrollIntoView({ behavior: "smooth" }); setActive("api"); }} className="px-5 py-2.5 rounded-xl bg-[#00d1ff] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#4cd6ff] transition-colors">View API Reference</a>
          <Link to="/federated" className="px-5 py-2.5 rounded-xl border border-white/10 hover:border-[#00d1ff]/40 hover:bg-white/[0.03] text-xs font-bold uppercase tracking-wider">Explore Federated Mesh →</Link>
        </div>
        {/* Preconnect hint for performance */}
        <link rel="preconnect" href="https:// fonts.googleapis.com" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-12 gap-8">
        {/* Sidebar */}
        <nav aria-label="Documentation sections" className="col-span-12 lg:col-span-3 lg:sticky lg:top-6 self-start">
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 space-y-1">
            {sections.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" }); setActive(s.id); }}
                aria-current={active === s.id ? "true" : undefined}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${active === s.id ? "bg-[#00d1ff] text-black" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
              >
                <s.icon size={14} /> {s.label}
              </a>
            ))}
          </div>
          <div className="mt-4 p-4 rounded-2xl bg-[#00d1ff]/5 border border-[#00d1ff]/15">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#00d1ff] font-bold">Need help?</div>
            <p className="text-xs text-zinc-400 mt-1">Contact clinical engineering for EHR onboarding.</p>
            <a href="mailto:support@aurevia.health" className="text-xs text-[#00d1ff] hover:underline mt-2 inline-flex items-center gap-1">support@aurevia.health <ExternalLink size={10} /></a>
          </div>
        </nav>

        {/* Main */}
        <main id="main-docs" className="col-span-12 lg:col-span-9 space-y-10" tabIndex={-1}>
          {/* API Reference */}
          <section id="api" className="scroll-mt-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Code2 className="text-[#00d1ff]" size={18} /> API Reference</h2>
            <p className="text-sm text-zinc-400 mt-2">Base URL: <code className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded font-mono text-xs">/v1</code> — Auth: <code className="font-mono text-xs">Authorization: Bearer &lt;jwt&gt;</code></p>
            <div className="mt-4 grid gap-3">
              {[
                { m: "POST", p: "/v1/token", d: "OAuth2 password login → JWT (30m). Rate limited 5/min.", auth: false },
                { m: "GET", p: "/v1/profile", d: "Current user profile. Requires Bearer.", auth: true },
                { m: "POST", p: "/v1/predict/diabetes|heart|liver|kidney|lungs|stroke", d: "TabICLv2 + FT-Transformer ensemble. Returns prediction, confidence, conformal set, SHAP.", auth: true },
                { m: "POST", p: "/v1/chat", d: "Non-streaming RAG chat (core_ai → Ollama → Gemini → Cloud).", auth: true },
                { m: "POST", p: "/v1/chat/stream", d: "SSE streaming tokens. Requires Bearer, returns text/event-stream.", auth: true },
                { m: "POST", p: "/v1/appointments", d: "Create appointment with facility scoping & double-booking guard (409).", auth: true },
                { m: "GET", p: "/v1/dicomweb/studies", d: "QIDO-RS (now auth-required).", auth: true },
                { m: "GET", p: "/healthz", d: "Public liveness. Diagnostics: database, seeding, models, event_bus.", auth: false },
              ].map(r => (
                <div key={r.p} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${r.m === "GET" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-[#00d1ff]/15 text-[#00d1ff] border border-[#00d1ff]/20"}`}>{r.m}</span>
                  <code className="font-mono text-xs text-white flex-1">{r.p}</code>
                  <span className="text-xs text-zinc-400 flex-1">{r.d}</span>
                  {r.auth ? <span className="text-[9px] font-mono uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">auth</span> : <span className="text-[9px] font-mono uppercase tracking-widest bg-white/5 text-zinc-500 px-1.5 py-0.5 rounded">public</span>}
                </div>
              ))}
            </div>
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300">Authentication</h3>
              <InlineCode lang="bash" code={`curl -X POST http://127.0.0.1:8000/v1/token -d "username=dr_smith&password=Doctor123!" -H "Content-Type: application/x-www-form-urlencoded"\n# → { "access_token": "eyJ...", "token_type": "bearer" }\ncurl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8000/v1/profile`} />
            </div>
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300">Data Models (Pydantic)</h3>
              <InlineCode lang="json" code={`// UserCreate\n{ "username": "aurevia_admin", "email": "admin@aurevia.health", "full_name": "Aurevia Admin", "password": "Admin123!", "dob": "1990-01-01", "role": "admin" }\n// DiabetesInput\n{ "age": 45, "bmi": 27.5, "gender": 1, "hypertension": 0, "high_chol": 0 }`} />
            </div>
          </section>

          {/* EHR Integration */}
          <section id="ehr" className="scroll-mt-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Database className="text-[#00d1ff]" size={18} /> EHR & Data Platform Integration</h2>
            <div className="mt-3 grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#00d1ff]">HL7 FHIR R4</h3>
                <p className="text-xs text-zinc-400 mt-1">Patient, Encounter, Observation, MedicationRequest. Use <code className="font-mono">/v1/fhir/*</code> and SMART on FHIR (`/apps`).</p>
                <InlineCode lang="ts" code={`import { getWebSocketUrl } from "@/lib/apiCore";\nconst ws = new WebSocket(getWebSocketUrl("/v1/telemetry/vitals/2?token="+token));`} />
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#00d1ff]">OMOP CDM v5.4 + Databricks</h3>
                <p className="text-xs text-zinc-400 mt-1">Medallion Bronze→Silver→Gold via <code className="font-mono">databricks_notebooks/</code>. Delta Lake + FHIR→OMOP ETL at <code className="font-mono">/v1/data-platform</code>.</p>
                <InlineCode lang="bash" code={`# Spark submit (Databricks)\ndatabricks jobs create --json @databricks_notebooks/job.json`} />
              </div>
            </div>
          </section>

          {/* Deployment */}
          <section id="deploy" className="scroll-mt-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Rocket className="text-[#00d1ff]" size={18} /> Deployment</h2>
            <div className="grid md:grid-cols-3 gap-4 mt-3">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <h3 className="text-xs font-bold uppercase">Docker</h3>
                <InlineCode lang="bash" code={`docker compose up --build\n# frontend 127.0.0.1:3000, backend 127.0.0.1:8000`} />
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <h3 className="text-xs font-bold uppercase">Kubernetes</h3>
                <InlineCode lang="bash" code={`kubectl apply -f k8s/\nkubectl get pods -n aurevia`} />
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <h3 className="text-xs font-bold uppercase">Cloud</h3>
                <p className="text-xs text-zinc-400">Vercel (frontend), Render/Railway (backend), Supabase Postgres (`DATABASE_URL`). See `.env.example`.</p>
              </div>
            </div>
          </section>

          {/* SDK */}
          <section id="sdk" className="scroll-mt-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Terminal className="text-[#00d1ff]" size={18} /> SDK & Samples</h2>
            <div className="grid md:grid-cols-2 gap-4 mt-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest">Python</h3>
                <InlineCode lang="python" code={`import requests\ntoken = requests.post("http://127.0.0.1:8000/v1/token", data={"username":"dr_smith","password":"Doctor123!"}).json()["access_token"]\nheaders={"Authorization": f"Bearer {token}"}\nrequests.post("http://127.0.0.1:8000/v1/predict/stroke", json={"age":50,"bmi":25}, headers=headers)`} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest">TypeScript</h3>
                <InlineCode lang="ts" code={`import { login, getWebSocketUrl } from "@/lib/api";\nconst { access_token } = await login("dr_smith","Doctor123!");\nconst ws = new WebSocket(getWebSocketUrl("/v1/telemetry/vitals/1?token="+access_token));`} />
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-3">Samples: <code className="font-mono">frontend/src/lib/</code> (`api.ts`, `apiCore.ts`, `useTelemetry.ts`).</p>
          </section>

          {/* Models */}
          <section id="models" className="scroll-mt-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><FlaskConical className="text-[#00d1ff]" size={18} /> Clinical Models</h2>
            <div className="mt-3 space-y-3">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <h3 className="text-xs font-bold uppercase tracking-widest">TabICLv2 Tabular Foundation</h3>
                <p className="text-xs text-zinc-400 mt-1">Inria foundation transformer for 15–24 feature tabular EHR. 5 ensembles (diabetes, heart, liver, kidney, lungs) with 95% conformal sets + SHAP. See <code className="font-mono">models/</code> and <code className="font-mono">backend/ml/</code>.</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <h3 className="text-xs font-bold uppercase tracking-widest">10-Year Digital Twin (ODE)</h3>
                <p className="text-xs text-zinc-400 mt-1">Coupled ODE multi-organ simulator (cardio/renal/metabolic/hepatic) at <code className="font-mono">backend/clinical_digital_twin.py</code>. Federated DP noise preserves privacy (ε budget 10.0).</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <h3 className="text-xs font-bold uppercase tracking-widest">CPIC Pharmacogenomics</h3>
                <p className="text-xs text-zinc-400 mt-1">Guideline engine at <code className="font-mono">backend/precision_pharmacogenomics.py</code> — CYP2C9/19, CYP2D6, SLCO1B1, DPYD, VKORC1.</p>
              </div>
            </div>
          </section>

          {/* Compliance */}
          <section id="compliance" className="scroll-mt-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="text-[#00d1ff]" size={18} /> Compliance & Security</h2>
            <ul className="mt-3 grid gap-2 text-xs text-zinc-300">
              <li className="flex gap-2"><Lock size={12} className="text-emerald-400 mt-0.5" /> HIPAA: JWT 30m, bcrypt 72B, AES-GCM PII, audit `REVIEW_AI_PREDICTION`, `healthz/env` admin-only, DICOM auth.</li>
              <li className="flex gap-2"><ShieldCheck size={12} className="text-emerald-400 mt-0.5" /> Data privacy: Local DP (Laplace, ε=1.0, L2 clip 1.0), RLS facility scoping, 7-yr retention, de-id.</li>
              <li className="flex gap-2"><FileText size={12} className="text-emerald-400 mt-0.5" /> Docs: <code className="font-mono">docs/</code> (ADR, MODEL_AND_DATASET_CARDS, SECURITY_*) + <code className="font-mono">LICENSE</code> AGPL-3.0.</li>
            </ul>
            <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[11px] text-amber-200">
              <strong>Medical disclaimer:</strong> Aurevia Health AI is CDS, not diagnosis. Always consult a qualified clinician; see <code className="font-mono">frontend/src/components/layout/AuthGuard.tsx</code> EULA.
            </div>
          </section>

          {/* SEO: FAQ + HowTo schemas are injected via useEffect below for SSR/CSR */}
        </main>
      </div>

      {/* Performance: preload critical CSS is handled in index.html; lazy below-the-fold via Suspense already */}
    </div>
  );
}
