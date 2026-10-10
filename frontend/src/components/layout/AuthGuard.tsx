import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/lib/auth";
import TopNav from "./TopNav";
import { motion, AnimatePresence } from "framer-motion";
import SessionTimeoutManager from "./SessionTimeoutManager";
import { checkConsentStatus, acceptEula } from "@/lib/apiAuth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const { token, isDemo } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [inIframe, setInIframe] = useState(false);

  // EULA Consent state
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [showEula, setShowEula] = useState(false);
  const [eulaVersion, setEulaVersion] = useState("1.0");
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      setInIframe(window.self !== window.top);
    } catch (e) {
      setInIframe(true);
    }
  }, []);

  useEffect(() => {
    if (mounted && !token) {
      navigate("/login");
    } else if (mounted && token && !consentChecked && !consentError) {
      if (isDemo) {
        // Frontend-only demo session: there is no backend to query consent
        // against, and the session is explicitly disclosed as simulated.
        setConsentChecked(true);
        return;
      }
      // Check EULA consent status from backend
      checkConsentStatus()
        .then((res) => {
          setEulaVersion(res.current_version);
          if (!res.accepted || res.requires_reaccept) {
            setShowEula(true);
          }
          setConsentChecked(true);
        })
        .catch(() => {
          // Fail closed: an undeterminable consent state must not grant access
          // to protected clinical functionality. Retry rather than assume consent.
          setConsentError(true);
        });
    }
  }, [token, navigate, pathname, mounted, consentChecked, consentError, isDemo]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    // User is close to bottom (within 10px)
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 10) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAcceptEula = () => {
    setIsAccepting(true);
    setAcceptError(null);
    acceptEula(eulaVersion)
      .then(() => {
        setShowEula(false);
        setIsAccepting(false);
      })
      .catch((err) => {
        console.error("Failed to accept EULA:", err);
        setIsAccepting(false);
        // Fail closed: a failed acceptance must not close the mandatory gate
        // as though the user had accepted. Keep it open and offer a retry.
        setAcceptError("We could not record your acceptance. Please try again.");
      });
  };

  const retryConsentCheck = () => {
    setConsentError(false);
    setConsentChecked(false);
  };

  if (!mounted || !token) return null;

  // Fail-closed gate: protected content is withheld until the authoritative
  // consent status is known.
  if (consentError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
          <div className="mb-3">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold tracking-wide uppercase text-slate-100 mb-2">
            Consent status unavailable
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-5">
            We could not verify your consent status, so clinical functionality
            stays locked until we can. Nothing has been granted access.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={retryConsentCheck}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors text-xs uppercase"
            >
              Retry
            </button>
            <button
              onClick={() => {
                useAuthStore.getState().logout();
                navigate("/login");
              }}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors text-xs uppercase"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SessionTimeoutManager>
      <div className="flex flex-col h-screen overflow-hidden w-full bg-transparent relative">
        <TopNav mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
        
        <main className="flex-1 overflow-auto relative w-full pt-16">
          {inIframe && (
            <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 pt-4 w-full">
              <div className="p-3 bg-[rgba(234,179,8,0.1)] text-[var(--warning)] border border-yellow-500/20 text-[10px] font-mono rounded-xl flex items-center justify-between gap-4 uppercase tracking-wide">
                <div className="flex items-center gap-2">
                  <span className="text-[14px]">⚠️</span>
                  <span>Running in iframe. Logins/sessions may not persist across tabs.</span>
                </div>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1 px-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors text-[9px] shrink-0"
                >
                  Switch to Direct Link ↗️
                </a>
              </div>
            </div>
          )}

          <div className="h-full p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="h-full w-full gpu-accelerated"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* SOTA EULA Consent Overlay Gate */}
        <AnimatePresence>
          {showEula && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xl p-4 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl flex flex-col max-h-[85vh]"
              >
                {/* Header */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-indigo-400 mb-1">
                    <span className="text-xl">⚖️</span>
                    <h2 className="text-lg font-bold tracking-wide uppercase">End User License Agreement</h2>
                  </div>
                  <p className="text-xs text-slate-400">
                    You must read and accept the Aurevia Health AI terms and clinical disclaimers before continuing. (Version {eulaVersion})
                  </p>
                </div>

                {/* Terms Body */}
                <div
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto bg-slate-950/50 rounded-xl p-4 border border-slate-800/80 text-xs text-slate-300 font-sans leading-relaxed space-y-4 mb-6 scrollbar-thin scrollbar-thumb-slate-800"
                >
                  <section className="space-y-1">
                    <h3 className="font-bold text-indigo-300">1. CDS Medical Safe Harbor Disclaimer</h3>
                    <p>
                      Aurevia Health AI is a Clinical Decision Support (CDS) tool designed for licensed medical professionals. It is NOT a substitute for professional medical judgment, diagnosis, or treatment. Attending clinicians are solely responsible for verifying and making all medical determinations, care pathways, and treatment actions.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h3 className="font-bold text-indigo-300">2. "AS IS" Warranty Clause</h3>
                    <p>
                      Aurevia Health AI is provided "AS IS", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement. Under no circumstances shall the platform provider be liable for diagnostic errors, system downtime, database locks, or data loss.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h3 className="font-bold text-indigo-300">3. Strict Limitation of Liability</h3>
                    <p>
                      The maximum aggregate liability for Aurevia Health AI for any claims or damages shall be strictly capped at the total amount paid by the licensee for the active licensing term or software component. We assume zero liability for failures in third-party communications (e.g. vital calling, SMS alert networks).
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h3 className="font-bold text-indigo-300">4. HIPAA Privacy & Audit Trail Logging</h3>
                    <p>
                      To maintain regulatory compliance, Aurevia Health AI logs encrypted, FHIR-compliant AuditEvents tracking all access to Patient Health Information (PHI). We employ automated PII redaction (masking email, SSN, Aadhaar, phone numbers, and credit cards) and symmetric encryption at rest for sensitive database fields.
                    </p>
                  </section>

                  <section className="space-y-1">
                    <h3 className="font-bold text-indigo-300">5. 72-Hour Breach Notification</h3>
                    <p>
                      In alignment with HIPAA §164.408 and GDPR Article 33, any detected data integrity breach triggers a 72-hour regulatory notification window tracked securely in the administrative audit logs.
                    </p>
                  </section>
                  
                  <div className="pt-2 text-center text-[10px] text-slate-500 font-mono italic">
                    --- Please scroll down to activate acceptance ---
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800 pt-4">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={hasScrolledToBottom}
                      readOnly
                      className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 h-3 w-3 bg-slate-950"
                    />
                    <span>Verified EULA scroll-through compliance</span>
                  </div>

                  {acceptError && (
                    <p
                      role="alert"
                      className="w-full text-[11px] text-red-400 font-mono mb-2"
                    >
                      {acceptError}
                    </p>
                  )}

                  <div className="flex gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        useAuthStore.getState().logout();
                        navigate("/login");
                      }}
                      className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all text-xs uppercase"
                    >
                      Decline
                    </button>
                    <button
                      onClick={handleAcceptEula}
                      disabled={!hasScrolledToBottom || isAccepting}
                      className={`flex-1 sm:flex-none px-6 py-2 rounded-xl font-bold text-xs uppercase transition-all ${
                        hasScrolledToBottom && !isAccepting
                          ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                          : "bg-slate-800 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      {isAccepting ? "Accepting..." : "I Accept & Proceed"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SessionTimeoutManager>
  );
}
