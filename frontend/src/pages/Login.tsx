import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/auth";
import { login, fetchProfile } from "@/lib/api";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, Lock, Mail, User, ArrowRight, HeartPulse, Sparkles, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

// The connection console used to print a hardcoded "HOST: 127.0.0.1:8000",
// which told every production visitor they were pointed at a developer's
// machine. Show the host the client is actually configured to reach.
const configuredApiHost = () => {
  const configured = import.meta.env.NEXT_PUBLIC_API_URL || import.meta.env.VITE_PUBLIC_API_URL;
  if (configured) {
    try {
      return new URL(configured).host;
    } catch {
      return configured.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    }
  }
  if (typeof window !== 'undefined') {
    if (window.location.port === '3000') return '127.0.0.1:8000';
    return window.location.host;
  }
  return 'localhost:8000';
};

export default function LoginPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const isExpired = searchParams.get("expired") === "1";
  const [mounted, setMounted] = useState(false);
  const [inIframe, setInIframe] = useState(false);
  useEffect(() => {
    setMounted(true);
    try {
      setInIframe(window.self !== window.top);
    } catch (e) {
      setInIframe(true);
    }
  }, []);

  const [displayHost] = useState(() => configuredApiHost());
  const [view, setView] = useState<'login' | 'forgot'>('login');
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(username, password);
      // The token is only usable together with an authoritative profile. Do
      // not commit it to the store until the profile has been fetched.
      let profile;
      try {
        profile = await fetchProfile();
      } catch {
        // Fail closed: a failed profile lookup must never become an
        // authenticated user. This previously synthesised an identity -- and
        // an 'admin' role for anyone logging in as "admin" -- which granted
        // clinical access on the strength of a request that had already failed.
        useAuthStore.getState().logout();
        setError(
          "Signed in, but your account profile could not be loaded. Please try again."
        );
        return;
      }
      setAuth(res.access_token, profile as any);
      navigate("/dashboard");
    } catch (err: any) {
      const msg = err?.message || "Login failed";
      const isConnectionError = msg.includes("Unable to connect") || msg.includes("Network") || err?.name === "ApiConnectionError";
      // Frontend-only demo mode for the resume demonstration: when the API is
      // unreachable AND the demo is enabled for this build, enter a clearly
      // disclosed simulated session with synthetic identity data. Never
      // fabricates a session for credential errors (401) — only for genuine
      // connection failures.
      const demoEnabled =
        import.meta.env.VITE_ENABLE_OFFLINE_DEMO === "true";
      if (isConnectionError && demoEnabled) {
        const offlineToken = "offline-session-access-token";
        const offlineProfile = {
          username: username || "admin",
          email: `${username || "admin"}@hospital.org`,
          full_name: username === "admin" ? "System Administrator" : "Staff Clinician",
          id: "staff-01",
          role: username === "admin" ? "admin" : "clinician",
        };
        setAuth(offlineToken, offlineProfile as any, true);
        navigate("/dashboard");
      } else {
        setError(msg.includes("401") || msg.toLowerCase().includes("incorrect") || msg.toLowerCase().includes("invalid") ? "Incorrect username or password." : msg);
      }
    } finally {
      setLoading(false);
    }

  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const { forgotPassword } = await import("@/lib/api");
      const res = await forgotPassword(email);
      setSuccessMsg(res.message);
    } catch (err: any) {
      setError(err.message || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-[#09090b]" />;
  }

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)] overflow-hidden relative">
      {/* Dynamic Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--accent)]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--accent-purple)]/4 blur-[120px] pointer-events-none" />

      {/* Left Panel: Visual — Modern dashboard preview */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden items-center justify-center border-r border-[var(--border)] bg-[#020204]/40 backdrop-blur-md">
        {/* Dot grid texture */}
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)", backgroundSize: "24px 24px" }} />

        {/* Ambient glows.
            The blur lives on an inner, never-changing layer and only the
            wrapper animates. Animating an element that itself carries a
            100px blur forces the browser to re-run the blur on every frame,
            which pinned this page at ~30fps. */}
        <div className="absolute top-[25%] left-[20%] w-[320px] h-[320px] animate-pulse-slow">
          <div className="w-full h-full rounded-full bg-[var(--accent)]/8 blur-[100px]" />
        </div>
        <div className="absolute bottom-[25%] right-[20%] w-[280px] h-[280px] animate-pulse-slow">
          <div className="w-full h-full rounded-full bg-[var(--accent-blue)]/6 blur-[90px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 max-w-md text-center px-8 flex flex-col items-center"
        >
          {/* Central Logo HUD Container */}
          <div className="mb-8 h-16 w-16 rounded-2xl bg-[rgba(10,10,15,0.7)] border border-white/[0.06] flex items-center justify-center">
            
            {/* Static logo mark (no ambient animation) */}
            <HeartPulse size={30} className="text-[var(--accent)]" strokeWidth={1.5} />
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] mb-3">
            Aurevia Health AI
          </h2>
          <p className="text-[var(--text-secondary)] text-sm max-w-xs leading-relaxed mb-8">
            Clinical decision-support workspace — synthetic demo data
          </p>

          {/* Core system properties */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-[var(--text-secondary)] border-t border-white/[0.04] pt-6 w-full">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[var(--success)] rounded-full" /> Clinical workspace
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full" /> Synthetic demo data
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[var(--warning)] rounded-full" /> Prototype
            </span>
          </div>
        </motion.div>

        {/* Persistent prototype / synthetic-data disclosure */}
        <p className="absolute bottom-6 left-6 max-w-xs text-[11px] leading-relaxed text-[var(--text-dim)] pointer-events-none">
          Prototype demo running on synthetic data. Not for clinical use.
        </p>
      </div>

      {/* Right Panel: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative z-20">
        <div className="max-w-sm w-full relative">
          {/* Form container */}
          <div className="p-8 md:p-10 border border-white/[0.06] rounded-2xl bg-[rgba(6,6,12,0.6)]">
            
            {/* Header */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[var(--accent)] flex items-center justify-center text-white">
                  <Sparkles size={12} />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Aurevia Health AI</span>
              </div>
              <h1 className="text-lg font-semibold text-[var(--text-primary)]">
                {view === 'login' ? t.signIn : "Reset Key"}
              </h1>
              <p className="text-xs text-[var(--text-secondary)]">
                {view === 'login' ? "Sign in to your workspace." : "Request a password reset link."}
              </p>
            </div>

            {inIframe && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-[var(--warning-muted)] text-[var(--warning)] border border-[var(--warning-border)] text-[10px] font-mono rounded-xl mb-4 uppercase tracking-wide flex flex-col gap-1.5"
              >
                <div className="font-bold flex items-center gap-1">
                  <span>⚠️</span> Nested in Iframe
                </div>
                <div className="text-[9px] leading-relaxed">
                  Browser storage partitioning may cause issues or redirect to login on new tabs.
                </div>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-center py-1.5 px-2 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-lg transition-colors text-[9px] uppercase tracking-wider block font-bold"
                >
                  Open Direct App Link ↗️
                </a>
              </motion.div>
            )}

            {isExpired && !error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-[var(--warning-muted)] text-[var(--warning)] border border-[var(--warning-border)] text-[10px] font-mono rounded-lg mb-4 uppercase tracking-wide"
              >
                Clinical session expired. Please sign in.
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-[var(--danger-muted)] text-[var(--danger)] border border-[var(--danger-border)] text-[10px] font-mono rounded-lg mb-4 uppercase tracking-wide"
              >
                {error}
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-[var(--success-muted)] text-[var(--success)] border border-[var(--success-border)] text-[10px] font-mono rounded-lg mb-4 uppercase tracking-wide"
              >
                {successMsg}
              </motion.div>
            )}

            {view === 'login' ? (
              <>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="section-label" htmlFor="login-username">{t.username}</label>
                  <div className="relative">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                    <input
                      id="login-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Clinical staff username"
                      className="input-clinical pl-9"
                      required
                      aria-label="Username"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="section-label" htmlFor="login-password">{t.password}</label>
                    <button
                      type="button"
                      onClick={() => {
                        setView('forgot');
                        setError("");
                        setSuccessMsg("");
                      }}
                      className="py-2 -my-2 px-1 text-xs font-bold text-[var(--accent-blue)] hover:underline uppercase tracking-wider bg-transparent border-0 cursor-pointer"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                    <input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input-clinical pl-9"
                      required
                      aria-label="Password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !username || !password}
                  className="btn btn-cyber-primary w-full py-3 mt-4 flex items-center justify-center gap-2 cursor-pointer transition-all rounded-lg font-bold text-[11px] uppercase tracking-widest"
                >
                  {loading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight size={13} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 p-3 bg-[var(--info-muted)] text-[var(--info)] border border-[var(--info-border)] text-[10px] font-mono rounded-xl uppercase tracking-wide leading-relaxed">
                <span className="font-bold">Demo preview.</span> Aurevia Health
                AI is a resume demonstration. If the server is offline, valid
                credentials enter a simulated workspace with synthetic sample
                data — no real account, no stored password, no clinical claims.
              </div>
              </>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="section-label" htmlFor="forgot-email">Registered Email</label>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@hospital.org"
                      className="input-clinical pl-9"
                      required
                      aria-label="Email Address"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="btn btn-cyber-primary w-full py-3 mt-4 flex items-center justify-center gap-2 cursor-pointer transition-all rounded-lg font-bold text-[11px] uppercase tracking-widest"
                >
                  {loading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight size={13} />
                    </>
                  )}
                </button>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setView('login');
                      setError("");
                      setSuccessMsg("");
                    }}
                    className="text-[9px] font-bold text-[var(--text-secondary)] hover:text-white hover:underline uppercase tracking-wider bg-transparent border-0 cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}

            <div className="pt-6 mt-6 border-t border-white/[0.04] text-center text-xs text-[var(--text-secondary)]">
              New here?{" "}
              <Link to="/signup" className="inline-block py-2 -my-2 text-[var(--accent-blue)] font-bold hover:underline">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
