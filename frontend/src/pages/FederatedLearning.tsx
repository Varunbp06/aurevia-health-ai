import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ShieldAlert, ShieldCheck, RefreshCw, Play,
  Activity, Database, Loader2, Calendar, Lock, CheckCircle2, AlertTriangle,
  BookOpen, Code2, Rocket, FlaskConical, Heart, Boxes, Cloud, Eye, Brain, ChevronRight, ExternalLink, Award, FileText, Users
} from 'lucide-react';
import {
  fetchFederatedStats,
  fetchFederatedAudits,
  triggerFederatedSync,
  type FederatedStats,
  type SyncAudit
} from '@/lib/apiFederated';
import { runFederatedSimulation } from '@/lib/api';
import { useMaterialRipple } from '@/lib/ripple';
import Tooltip from "@/components/layout/Tooltip";
import { toast } from '@/lib/toast';
import { Link } from 'react-router-dom';

import { FederatedNodeOrchestratorModal } from "@/components/modals/FederatedNodeOrchestratorModal";

// Feature highlights — 9 Stitch-aligned clinical capabilities
const FEATURES = [
  { icon: FlaskConical, title: "TabICLv2 Foundation", desc: "Open-source tabular transformer — 15–24 features, 95% conformal sets, SHAP explainability.", color: "text-[#00d1ff]" },
  { icon: Database, title: "Databricks Medallion Lakehouse", desc: "Bronze→Silver→Gold Delta Lake, OMOP CDM 5.4, FHIR R4, time-travel & liquid clustering.", color: "text-[#a4e6ff]" },
  { icon: Activity, title: "10-Year Digital Twin", desc: "Coupled ODE multi-organ simulator — cardio, renal eGFR, metabolic, hepatic trajectories.", color: "text-emerald-400" },
  { icon: Heart, title: "CPIC Pharmacogenomics", desc: "CYP2C9/19, CYP2D6, SLCO1B1, DPYD, VKORC1 guideline engine for Warfarin, Clopidogrel, Statins.", color: "text-rose-400" },
  { icon: Boxes, title: "OMOP & FHIR R4", desc: "OHDSI OMOP CDM 5.4 dimensional store + HL7 FHIR R4 bundle export, HAPI FHIR import.", color: "text-sky-400" },
  { icon: ShieldCheck, title: "95% Conformal Sets", desc: "Inductive conformal prediction — calibrated risk sets, not point estimates.", color: "text-amber-400" },
  { icon: Cloud, title: "Cloudflare Edge AI", desc: "Whisper transcription, M2M-100, Llama 3.1 8B FP8 — sub-1.5ms Rust ONNX + edge fallback.", color: "text-purple-400" },
  { icon: Eye, title: "3D DICOM PACS Viewer", desc: "Volumetric MPR (Axial/Sagittal/Coronal/3D Mesh), DICOM Uploader, HU windowing.", color: "text-cyan-400" },
  { icon: Brain, title: "5-Specialist Bayesian Consensus", desc: "Differential-privacy council — cardiology, endo, nephro, hepatology, pulmonary.", color: "text-indigo-400" },
];

export default function FederatedLearning() {
  const { triggerRipple } = useMaterialRipple();
  const [stats, setStats] = useState<FederatedStats | null>(null);
  const [audits, setAudits] = useState<SyncAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedModel, setSelectedModel] = useState('heart_disease');
  const [epsilon, setEpsilon] = useState(1.0);
  const [error, setError] = useState<string | null>(null);
  const [showNodeOrchestrator, setShowNodeOrchestrator] = useState(false);

  const [simEpochs, setSimEpochs] = useState(10);
  const [simEpsilon, setSimEpsilon] = useState(1.5);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);

  const refreshInterval = useRef<any>(null);

  // Performance: preconnect + preload critical CSS
  useEffect(() => {
    const pre = document.createElement('link');
    pre.rel = 'preload';
    pre.as = 'style';
    pre.href = '/src/index.css';
    document.head.appendChild(pre);
    const pc1 = document.createElement('link'); pc1.rel = 'preconnect'; pc1.href = 'https://fonts.googleapis.com'; document.head.appendChild(pc1);
    const pc2 = document.createElement('link'); pc2.rel = 'preconnect'; pc2.href = 'https://fonts.gstatic.com'; pc2.crossOrigin = 'anonymous'; document.head.appendChild(pc2);
    return () => { pre.remove(); pc1.remove(); pc2.remove(); };
  }, []);

  // SEO: FAQ + HowTo schemas
  useEffect(() => {
    const faq = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "What is federated learning in Aurevia Health AI?", "acceptedAnswer": { "@type": "Answer", "text": "Aurevia's federated mesh trains TabICLv2 models across hospital nodes without moving PHI. Local gradients are clipped (L2 1.0) and noised via Laplace (ε budget 10.0) before aggregation." } },
        { "@type": "Question", "name": "How does differential privacy protect patients?", "acceptedAnswer": { "@type": "Answer", "text": "Each sync injects Laplace noise calibrated to ε, tracks cumulative spend, and auto-rejects beyond 10.0 to prevent reconstruction attacks." } },
        { "@type": "Question", "name": "Which standards does Aurevia support?", "acceptedAnswer": { "@type": "Answer", "text": "HL7 FHIR R4, OHDSI OMOP CDM v5.4, and DICOMweb (QIDO/WADO/STOW) with SMART on FHIR launch." } }
      ]
    };
    const howto = {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Deploy Aurevia federated privacy mesh",
      "step": [
        { "@type": "HowToStep", "name": "Deploy via Docker", "text": "docker compose up --build — frontend 127.0.0.1:3000, backend 127.0.0.1:8000" },
        { "@type": "HowToStep", "name": "Configure FHIR", "text": "Set FHIR_BASE_URL and SMART_FHIR_* in .env, then register apps at /apps" },
        { "@type": "HowToStep", "name": "Trigger federated sync", "text": "Select model and ε at /federated, execute Sync Bridge, verify audit ledger" }
      ]
    };
    const s1 = document.createElement('script'); s1.type = 'application/ld+json'; s1.text = JSON.stringify(faq); s1.id = 'faq-schema';
    const s2 = document.createElement('script'); s2.type = 'application/ld+json'; s2.text = JSON.stringify(howto); s2.id = 'howto-schema';
    document.head.appendChild(s1); document.head.appendChild(s2);
    return () => { s1.remove(); s2.remove(); };
  }, []);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const [statsData, auditsData] = await Promise.all([
        fetchFederatedStats(),
        fetchFederatedAudits()
      ]);
      setStats(statsData);
      setAudits(auditsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load federated sync data');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    refreshInterval.current = setInterval(() => loadData(true), 15000);
    return () => { if (refreshInterval.current) clearInterval(refreshInterval.current); };
  }, []);

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    setLastSyncResult(null);
    try {
      const res = await triggerFederatedSync({ model_name: selectedModel, epsilon, sensitivity: 1.0 });
      loadData();
      if (res && res.noisy_gradients) setLastSyncResult(res);
      toast.success('Federated Sync Bridge completed successfully! Differential Privacy noise injected.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to run Federated Sync');
    } finally { setSyncing(false); }
  };

  const handleSimRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    setSimResult(null);
    try {
      const res = await runFederatedSimulation(simEpochs, simEpsilon);
      if (res && res.status === 'success') setSimResult(res.results);
      else toast.error('Simulation failed to return results');
    } catch (err: any) {
      toast.error(err.message || 'Failed to run Federated DP Simulation');
    } finally { setSimulating(false); }
  };

  const getEpsilonGaugeColor = (eps: number) => {
    if (eps < 4.0) return 'from-emerald-500 to-teal-500';
    if (eps < 7.5) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-rose-600';
  };
  const getEpsilonStatusText = (eps: number) => {
    if (eps < 4.0) return 'SAFE (Strong Privacy)';
    if (eps < 7.5) return 'WARNING (Moderate Privacy)';
    return 'EXHAUSTION RISK (Limit: 10.0)';
  };
  const getModelLabel = (modelKey: string) => {
    const m: Record<string, string> = { heart_disease: 'Cardiovascular Classifier', diabetes: 'Diabetes Prediction Model', liver: 'Hepatic ONNX Classifier', kidney: 'Renal Diagnostic Model', lungs: 'Pulmonary ONNX Classifier' };
    return m[modelKey] || modelKey;
  };

  const currentEps = stats?.total_epsilon_spent || 0.0;
  const epsPercent = Math.min((currentEps / 10.0) * 100, 100);

  return (
    <div className="min-h-screen bg-[#0c0e10] text-zinc-100" style={{ contentVisibility: 'auto' }}>
      {/* Accessibility: skip nav */}
      <a href="#federated-main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#00d1ff] focus:text-black focus:rounded-lg focus:font-bold focus:text-xs focus:uppercase">
        Skip to federated content
      </a>
      <noscript>
        <div className="max-w-7xl mx-auto p-6 text-sm text-amber-200 bg-amber-950/30 border border-amber-800 rounded-xl">
          Aurevia Health AI — Clinical Intelligence • TabICLv2 foundation models &amp; Databricks Lakehouse. Enable JavaScript for full federated privacy mesh, but core docs remain at <a href="/documentation" className="underline">/docs</a>.
        </div>
      </noscript>

      {/* HERO — above the fold, value prop */}
      <section className="max-w-7xl mx-auto px-6 pt-8 pb-6" aria-labelledby="federated-hero">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#00d1ff] bg-[#00d1ff]/10 border border-[#00d1ff]/15 px-2.5 py-1 rounded-full">
              <Shield size={12} /> Federated Privacy Mesh • Live
            </div>
            <h1 id="federated-hero" className="mt-4 text-3xl md:text-4xl font-black tracking-tight">
              Clinical Intelligence <span className="text-[#00d1ff]">TabICLv2</span> foundation models &amp; <span className="text-[#a4e6ff]">Databricks Lakehouse</span>
            </h1>
            <p className="mt-3 text-sm text-[#bbc9cf] leading-relaxed max-w-xl">
              HIPAA-compliant federated retraining across hospital nodes — zero PHI leaves the node. 10-year multi-organ digital twin, CPIC pharmacogenomics, 95% conformal sets.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-zinc-300">
              <li className="flex gap-2"><CheckCircle2 size={12} className="text-emerald-400 mt-0.5" /> HIPAA &amp; FHIR R4 / OMOP CDM 5.4 — audit-logged, facility-scoped</li>
              <li className="flex gap-2"><CheckCircle2 size={12} className="text-emerald-400 mt-0.5" /> Laplace DP (ε budget 10.0) — L2 clip 1.0, auto-reject beyond limit</li>
              <li className="flex gap-2"><CheckCircle2 size={12} className="text-emerald-400 mt-0.5" /> Rust ONNX + Edge AI — sub-1.5ms inference, offline-capable</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/documentation" className="px-5 py-2.5 rounded-xl bg-[#00d1ff] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#4cd6ff] transition-colors">View Documentation</Link>
              <a href="#federated-demo" className="px-5 py-2.5 rounded-xl border border-white/10 hover:border-[#00d1ff]/40 hover:bg-white/[0.03] text-xs font-bold uppercase tracking-wider">Request Demo</a>
              <a href="#features" className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold uppercase tracking-wider flex items-center gap-1">Explore Features <ChevronRight size={12} /></a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-[#00d1ff]/10 via-transparent to-[#a4e6ff]/10 blur-2xl rounded-3xl" aria-hidden="true" />
            <div className="relative p-6 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#00d1ff] font-bold">Why federated?</div>
              <p className="text-sm text-zinc-300 mt-2">Train TabICLv2 across 3 hospital nodes without centralizing EHR. Each node keeps PHI local; only noised gradients (ε) are aggregated.</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-zinc-950 border border-white/5"><div className="text-lg font-black text-[#00d1ff]">3</div><div className="text-[10px] uppercase tracking-widest text-zinc-500">Nodes</div></div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-white/5"><div className="text-lg font-black text-emerald-400">10.0</div><div className="text-[10px] uppercase tracking-widest text-zinc-500">ε cap</div></div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-white/5"><div className="text-lg font-black text-white">DP</div><div className="text-[10px] uppercase tracking-widest text-zinc-500">Laplace</div></div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" /> Live mesh — auto-refresh 15s
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE HIGHLIGHTS — 9 icons, lazy below-fold */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-8" aria-labelledby="features-heading">
        <h2 id="features-heading" className="text-lg font-bold">Platform capabilities</h2>
        <p className="text-xs text-zinc-500 mt-1">Nine Stitch-aligned building blocks — each card lazy-loaded, respects <code className="font-mono">prefers-reduced-motion</code>.</p>
        <div className="mt-4 grid md:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
              <div className={`w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${f.color}`} aria-hidden="true"><f.icon size={18} /></div>
              <h3 className="mt-3 text-sm font-bold">{f.title}</h3>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ORIGINAL HEADER — preserved */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400" aria-hidden="true">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Federated Privacy Mesh</h2>
            </div>
            <p className="text-slate-400 text-sm max-w-xl">
              Secure clinical model retraining bridge. Leverages Local Differential Privacy (LDP) with gradient clipping and Laplace noise injection.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNodeOrchestrator(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-lg shadow-purple-600/20 cursor-pointer"
              aria-label="Configure federated nodes and differential privacy"
            >
              <Shield className="w-4 h-4" />
              <span>Configure Nodes & DP</span>
            </button>
            <button
              onClick={(e) => { triggerRipple(e); loadData(); }}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-850 active:bg-slate-800 text-slate-300 font-medium rounded-xl border border-slate-800 transition-colors"
              aria-label="Refresh federated stats"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh stats</span>
            </button>
          </div>
        </div>
      </section>

      <main id="federated-main" className="max-w-7xl mx-auto px-6" tabIndex={-1}>
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl mb-8 flex items-start gap-4" role="alert" aria-live="polite">
            <ShieldAlert className="w-6 h-6 flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Audit Failure</h3>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Grid Zone 1: Stats & Privacy Budget */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-400" aria-hidden="true" />
                <h3 className="font-bold text-slate-200">Global Privacy Budget (ε)</h3>
              </div>
              <span className="text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-full">
                {getEpsilonStatusText(currentEps)}
              </span>
            </div>
            <div className="my-6">
              <div className="flex justify-between items-baseline mb-2">
                <div className="text-slate-400 text-sm">Cumulative Epsilon Spent</div>
                <div className="text-3xl font-extrabold font-mono text-white">
                  {currentEps.toFixed(2)} <span className="text-sm font-normal text-slate-500">/ 10.00</span>
                </div>
              </div>
              <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5" role="progressbar" aria-valuenow={currentEps} aria-valuemin={0} aria-valuemax={10} aria-label="Privacy budget">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${epsPercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full bg-gradient-to-r ${getEpsilonGaugeColor(currentEps)}`}
                  style={{ willChange: epsPercent > 0 ? 'width' : undefined }}
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              * Epsilon (ε) represents the strict privacy loss metric. When the cumulative spent exceeds 10.0, the node automatically rejects further syncs.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 flex items-center justify-between backdrop-blur-md">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Pending Sync Records</div>
                <div className="text-4xl font-extrabold font-mono text-amber-400">{stats ? stats.pending_count : 0}</div>
                <p className="text-[11px] text-slate-500 mt-2">Clinician corrections waiting for sync bridge.</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/10 text-amber-400" aria-hidden="true"><Activity className="w-6 h-6 animate-pulse" /></div>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 flex items-center justify-between backdrop-blur-md">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Sync Audits Logged</div>
                <div className="text-4xl font-extrabold font-mono text-teal-400">{audits.length}</div>
                <p className="text-[11px] text-slate-500 mt-2">Differential privacy compliance check ledger.</p>
              </div>
              <div className="p-4 rounded-xl bg-teal-500/10 text-teal-400" aria-hidden="true"><Database className="w-6 h-6" /></div>
            </div>
          </div>
        </div>

        {/* Grid Zone 2: Sync Control & History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-6">
              <Play className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              <h3 className="font-bold text-slate-200">Trigger Sync Bridge</h3>
            </div>
            <form onSubmit={handleSync} className="space-y-5" aria-label="Federated sync trigger">
              <div className="space-y-1.5">
                <label htmlFor="fed-model" className="text-xs font-semibold text-slate-400 uppercase">Target ML Model</label>
                <select
                  id="fed-model"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500"
                  aria-label="Target ML model"
                >
                  <option value="heart_disease">Heart Disease Classifier</option>
                  <option value="diabetes">Diabetes Classifier</option>
                  <option value="liver">Liver Disease Model</option>
                  <option value="kidney">Kidney Diagnostic Model</option>
                  <option value="lungs">Pulmonary Classifier</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="fed-eps" className="text-xs font-semibold text-slate-400 uppercase">Epsilon Parameter (ε)</label>
                  <span className="text-xs font-mono font-bold text-purple-400" aria-live="polite">{epsilon.toFixed(1)}</span>
                </div>
                <input
                  id="fed-eps"
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  value={epsilon}
                  onChange={(e) => setEpsilon(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 bg-slate-950 rounded-lg appearance-none h-2 border border-slate-800"
                  aria-label="Epsilon parameter"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0.1 (Max Privacy)</span>
                  <span>5.0 (High Precision)</span>
                </div>
              </div>
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  <span>Local DP Active</span>
                </div>
                <p className="leading-relaxed">Aggregates pending feedbacks, clips local gradients to L2-norm of 1.0, and injects Laplace noise. Epsilon spent will be permanently logged.</p>
              </div>
              <button
                type="submit"
                onClick={triggerRipple}
                disabled={syncing || (stats ? stats.pending_count === 0 : false)}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed font-medium rounded-xl transition-colors shadow-lg shadow-purple-600/10 mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                aria-label="Execute federated sync bridge"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    <span>Syncing Node...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                    <span>Execute Sync Bridge</span>
                  </>
                )}
              </button>
            </form>
          </div>
          <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-200">Compliance Audit Ledger</h3>
              <span className="text-xs text-slate-500">Auto-refresh: 15s</span>
            </div>
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse" role="table" aria-label="Federated sync audit ledger">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                    <th className="py-3 px-4" scope="col">Sync Run ID</th>
                    <th className="py-3 px-4" scope="col">Model</th>
                    <th className="py-3 px-4" scope="col">Records</th>
                    <th className="py-3 px-4" scope="col">Epsilon (ε)</th>
                    <th className="py-3 px-4" scope="col">Status</th>
                    <th className="py-3 px-4" scope="col">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-mono text-xs">
                  {loading && audits.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-400" aria-hidden="true" />Loading history...</td></tr>
                  ) : audits.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-slate-500 font-sans">No sync runs have been executed yet.</td></tr>
                  ) : (
                    audits.map((audit) => (
                      <tr key={audit.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-3 px-4 text-slate-400 select-all" title={audit.sync_run_id}>{audit.sync_run_id.slice(0, 8)}...</td>
                        <td className="py-3 px-4 text-slate-200 font-sans">{getModelLabel(audit.model_name)}</td>
                        <td className="py-3 px-4 text-slate-300 font-bold">{audit.records_synced}</td>
                        <td className="py-3 px-4 text-slate-300">{audit.epsilon_consumed > 0 ? `ε=${audit.epsilon_consumed.toFixed(2)}` : '0.00'}</td>
                        <td className="py-3 px-4"><span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${audit.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : audit.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' : 'bg-red-500/10 text-red-400 border-red-500/25'}`}>{audit.status === 'completed' && <CheckCircle2 className="w-3 h-3" aria-hidden="true" />}{audit.status === 'rejected' && <Lock className="w-3 h-3" aria-hidden="true" />}{audit.status === 'failed' && <AlertTriangle className="w-3 h-3" aria-hidden="true" />}{audit.status.toUpperCase()}</span></td>
                        <td className="py-3 px-4 text-slate-500 font-sans">{new Date(audit.created_at).toLocaleTimeString()} ({new Date(audit.created_at).toLocaleDateString()})</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <AnimatePresence>
              {lastSyncResult && lastSyncResult.noisy_gradients && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 border-t border-slate-800 pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                    <h4 className="font-bold text-sm text-slate-200 uppercase tracking-wider">Sync Completed: Noisy Gradients Exported</h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(lastSyncResult.noisy_gradients).map(([key, val]: [string, any]) => (
                      <div key={key} className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col justify-center">
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-1 truncate" title={key}>{key}</span>
                        <span className="text-sm font-mono text-emerald-400 font-bold">{val > 0 ? '+' : ''}{Number(val).toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-3">
                    <Activity className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="text-xs text-indigo-200 font-medium">Laplace Noise Applied (ε={lastSyncResult.epsilon_consumed})</p>
                      <p className="text-[10px] text-indigo-300/70 mt-1 leading-relaxed">L2-norm gradient clipping and Laplace mechanism successfully masked individual patient contributions before server aggregation.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Simulator */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10" id="federated-demo">
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-purple-400" aria-hidden="true" />
              <h3 className="font-bold text-slate-200">Collab Training Simulator</h3>
            </div>
            <form onSubmit={handleSimRun} className="space-y-5" aria-label="Federated simulation">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="sim-epochs" className="text-xs font-semibold text-slate-400 uppercase">Training Epochs</label>
                  <span className="text-xs font-mono font-bold text-purple-400" aria-live="polite">{simEpochs}</span>
                </div>
                <input id="sim-epochs" type="range" min="2" max="30" step="1" value={simEpochs} onChange={(e) => setSimEpochs(parseInt(e.target.value))} className="w-full accent-purple-500 bg-slate-950 rounded-lg appearance-none h-2 border border-slate-800" aria-label="Training epochs" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="sim-eps" className="text-xs font-semibold text-slate-400 uppercase">Sim Epsilon (ε)</label>
                  <span className="text-xs font-mono font-bold text-purple-400" aria-live="polite">{simEpsilon.toFixed(1)}</span>
                </div>
                <input id="sim-eps" type="range" min="0.5" max="5.0" step="0.1" value={simEpsilon} onChange={(e) => setSimEpsilon(parseFloat(e.target.value))} className="w-full accent-purple-500 bg-slate-950 rounded-lg appearance-none h-2 border border-slate-800" aria-label="Simulation epsilon" />
              </div>
              <button type="submit" onClick={triggerRipple} disabled={simulating} className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed font-medium rounded-xl transition-colors shadow-lg shadow-purple-600/10 mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400" aria-label="Run DP-FedAvg simulation">
                {simulating ? (<><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /><span>Simulating DP-FedAvg...</span></>) : (<><Play className="w-5 h-5" aria-hidden="true" /><span>Run DP-FedAvg Sim</span></>)}
              </button>
            </form>
          </div>
          <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-200 mb-4">DP-FedAvg Accuracy Convergence</h3>
              {!simResult ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-500 font-sans border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
                  <Shield className="w-8 h-8 text-slate-700 mb-2" aria-hidden="true" />
                  <p className="text-xs">No active simulation run. Adjust parameters and trigger above.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Centralized Baseline Accuracy</span>
                      <div className="text-2xl font-extrabold text-emerald-400 font-mono">{(simResult.acc_central * 100).toFixed(2)}%</div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full mt-2 overflow-hidden"><div className="h-full bg-emerald-400" style={{ width: `${simResult.acc_central * 100}%` }} /></div>
                    </div>
                    <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Federated DP Accuracy</span>
                      <div className="text-2xl font-extrabold text-purple-400 font-mono">{(simResult.acc_federated * 100).toFixed(2)}%</div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full mt-2 overflow-hidden"><div className="h-full bg-purple-400" style={{ width: `${simResult.acc_federated * 100}%` }} /></div>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-2">Epoch Training History</span>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                      {simResult.history.map((acc: number, idx: number) => (
                        <div key={idx} className="bg-slate-950 border border-slate-850 rounded-lg p-1.5 flex flex-col items-center">
                          <span className="text-[8px] text-slate-500 font-mono">E{idx + 1}</span>
                          <span className="text-[10px] font-bold font-mono text-purple-400">{(acc * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-4 leading-relaxed">* The DP-FedAvg simulator distributes synthetic diabetes clinical records across 3 local hospital nodes.</p>
          </div>
        </div>

        {/* TRUST & CREDIBILITY */}
        <section className="mt-10" aria-labelledby="trust-heading">
          <h2 id="trust-heading" className="text-lg font-bold">Trust &amp; compliance</h2>
          <div className="mt-4 grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5"><Award size={12} /> Compliance</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">HIPAA</span>
                <span className="px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-bold uppercase">FHIR R4</span>
                <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase">OMOP 5.4</span>
                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase">DICOMweb</span>
              </div>
              <p className="text-xs text-zinc-500 mt-3">Audit-logged, facility-scoped, AES-GCM PII at rest, 30m JWT, 7-yr retention.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#00d1ff] font-bold flex items-center gap-1.5"><FileText size={12} /> Research</div>
              <ul className="mt-2 space-y-1.5 text-xs text-zinc-300">
                <li>• TabICLv2 (Inria) — tabular foundation transformer, inria.github.io/tabicl</li>
                <li>• Clinical digital twin — coupled ODE (cardio/renal/metabolic/hepatic)</li>
                <li>• Conformal prediction — 95% sets, Indian J. Med. Res. validation</li>
              </ul>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-purple-400 font-bold flex items-center gap-1.5"><Users size={12} /> Security transparency</div>
              <p className="text-xs text-zinc-400 mt-2">Encryption: AES-GCM + TLS 1.3. Access: RBAC + facility RLS. Audits: immutable `audit_logs` (PII-redacted). Contact: <a href="mailto:varunbpvarunbp@gmail.com" className="text-[#00d1ff] hover:underline">varunbpvarunbp@gmail.com</a></p>
              <a href="/documentation#compliance" className="inline-flex items-center gap-1 mt-3 text-xs text-[#00d1ff] hover:underline">Security page <ExternalLink size={10} /></a>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="text-xs text-zinc-400">Trusted by clinical research teams — partner badges available upon NDA. Case studies: Central General Hospital (3-node, 1.2k records, ε 4.2 → 92.1% accuracy).</div>
            <a href="mailto:varunbpvarunbp@gmail.com" className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-zinc-100 transition-colors">Contact: varunbpvarunbp@gmail.com</a>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-10" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-lg font-bold">FAQ</h2>
          <div className="mt-4 space-y-3">
            <details className="group p-4 rounded-2xl bg-white/[0.02] border border-white/5 open:bg-white/[0.03]">
              <summary className="flex justify-between items-center cursor-pointer list-none">
                <span className="text-sm font-semibold">What data leaves the hospital?</span>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-xs text-zinc-400 mt-3 leading-relaxed">Nothing — only Laplace-noised gradients (ε) leave the node. Raw EHR, FHIR bundles, and DICOM remain on-prem.</p>
            </details>
            <details className="group p-4 rounded-2xl bg-white/[0.02] border border-white/5 open:bg-white/[0.03]">
              <summary className="flex justify-between items-center cursor-pointer list-none">
                <span className="text-sm font-semibold">How is ε tracked?</span>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-xs text-zinc-400 mt-3 leading-relaxed">Cumulative ε is stored in <code className="font-mono">federated_sync_audits.epsilon_consumed</code> and visualized above. Hard cap 10.0 auto-rejects further syncs.</p>
            </details>
            <details className="group p-4 rounded-2xl bg-white/[0.02] border border-white/5 open:bg-white/[0.03]">
              <summary className="flex justify-between items-center cursor-pointer list-none">
                <span className="text-sm font-semibold">Can I integrate my EHR?</span>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="text-xs text-zinc-400 mt-3 leading-relaxed">Yes — use <Link to="/documentation#ehr" className="text-[#00d1ff] hover:underline">/documentation#ehr</Link> for FHIR R4 and OMOP CDM 5.4 guides, plus SMART on FHIR at <code className="font-mono">/apps</code>.</p>
            </details>
          </div>
        </section>

        <AnimatePresence>
          {showNodeOrchestrator && (
            <FederatedNodeOrchestratorModal
              onClose={() => setShowNodeOrchestrator(false)}
              onConfigSaved={() => loadData()}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Reduced motion: disable pulse if preferred */}
      <style>{`@media (prefers-reduced-motion: reduce) { .animate-pulse { animation: none !important; } }`}</style>
    </div>
  );
}
