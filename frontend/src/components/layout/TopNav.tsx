
import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/lib/auth";
import { prefetchRoute } from "@/lib/prefetch";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, BrainCircuit, ShieldCheck, HelpCircle, BookOpen, Key, AlertTriangle, Cpu, X, Bell, BellRing, CreditCard } from "lucide-react";
import Tooltip from "./Tooltip";
import { useTranslation } from "@/lib/i18n";
import { toast } from "@/lib/toast";
import {
  type MenuItem, type MenuGroup,
  operationsItems, diagnosticsItems, intelligenceItems, healthcareSystemItems, developersItems,
  MENU_GROUPS, getIconStyles, colorKeyFromMenuItem,
  COMMAND_ITEMS,
} from "./nav-config";
import MegaMenuPanel from "./MegaMenuPanel";
import CommandSearch from "./CommandSearch";
import TelemetryDropdown from "./TelemetryDropdown";
import LanguageSelector from "./LanguageSelector";
import ProfileDropdown from "./ProfileDropdown";
import { useNetworkStatus } from "@/lib/offlineSync";

const MobileDrawer = lazy(() => import("@/components/layout/MobileDrawer"));
const ShiftHandoffModal = lazy(() => import("@/components/modals/ShiftHandoffModal").then(m => ({ default: m.ShiftHandoffModal })));
const SoapDenialAuditModal = lazy(() => import("@/components/modals/SoapDenialAuditModal").then(m => ({ default: m.SoapDenialAuditModal })));
const DischargeSummaryModal = lazy(() => import("@/components/modals/DischargeSummaryModal").then(m => ({ default: m.DischargeSummaryModal })));
const TelephonyRoutingModal = lazy(() => import("@/components/modals/TelephonyRoutingModal").then(m => ({ default: m.TelephonyRoutingModal })));
const SecurityLockoutModal = lazy(() => import("@/components/modals/SecurityLockoutModal").then(m => ({ default: m.SecurityLockoutModal })));
const SelfHealingMaintenanceModal = lazy(() => import("@/components/modals/SelfHealingMaintenanceModal").then(m => ({ default: m.SelfHealingMaintenanceModal })));
const BillingClaimsModal = lazy(() => import("@/components/modals/BillingClaimsModal").then(m => ({ default: m.BillingClaimsModal })));
const OnboardingGuideModal = lazy(() => import("@/components/modals/OnboardingGuideModal").then(m => ({ default: m.OnboardingGuideModal })));

/* ═══════════════════════════════════════════════════
   TopNav Component
   ═══════════════════════════════════════════════════ */
export default function TopNav({
  mobileOpen,
  setMobileOpen,
}: {
  mobileOpen?: boolean;
  setMobileOpen?: (val: boolean) => void;
}) {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const { user, logout, isDemo } = useAuthStore();
  const { language, setLanguage, t } = useTranslation();

  const { isOnline, queueCount } = useNetworkStatus();

  // Menu & UI state
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  // guideOpen removed — onboarding handled by OnboardingGuideModal
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [showSoapAuditModal, setShowSoapAuditModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [showTelephonyModal, setShowTelephonyModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showHealingModal, setShowHealingModal] = useState(false);

  const [showBillingModal, setShowBillingModal] = useState(false);

  const [alarm, setAlarm] = useState<{ active: boolean; bed?: string; name?: string; hr?: number } | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const alarmRef = useRef(alarm);
  useEffect(() => {
    alarmRef.current = alarm;
  }, [alarm]);

  useEffect(() => {
    const handleAlarm = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newAlarm = customEvent.detail;
      
      // Only auto-open on the transition from inactive to active
      if (newAlarm?.active && !alarmRef.current?.active) {
        setShowNotifications(true);
      }
      
      setAlarm(newAlarm);
    };
    window.addEventListener("clinical-alarm", handleAlarm);
    return () => window.removeEventListener("clinical-alarm", handleAlarm);
  }, []);

  const resolveAlarm = (action: "code-blue" | "dismiss") => {
    window.dispatchEvent(new CustomEvent("resolve-alarm", { detail: { action } }));
    setShowNotifications(false);
  };

  // Refs
  const navContainerRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Click outside notifications dropdown to close it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showNotifications &&
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  // Close notifications dropdown when activeMenu (mega menu) is opened
  useEffect(() => {
    if (activeMenu) {
      setShowNotifications(false);
    }
  }, [activeMenu]);

  // Dynamic menu items and groups computation
  const dynamicOperationsItems = operationsItems.map(item => {
    if (item.id === "dashboard") return { ...item, title: t.commandCenter };
    if (item.id === "patients") return { ...item, title: t.patientRegistry };
    if (item.id === "capacity") return { ...item, title: t.infrastructure };
    if (item.id === "telemedicine") return { ...item, title: t.telemedicine };
    return item;
  });

  const dynamicIntelligenceItems = intelligenceItems.map(item => {
    if (item.id === "copilot") return { ...item, title: t.engageCopilot };
    if (item.id === "architecture") return { ...item, title: t.adminConsole };
    return item;
  });

  const dynamicHealthcareSystemItems = healthcareSystemItems.map(item => {
    return item;
  });

  const dynamicMenuGroups = [
    {
      key: "developers",
      label: language === "es" ? "Desarrolladores" : language === "hi" ? "डेवलपर्स" : "Developers",
      emoji: "📚",
      accentColor: "text-cyan-400 data-[state=open]:text-cyan-400",
      items: developersItems,
      cols: 1,
      routes: ["/docs", "/developers", "/documentation"],
    },
    {
      key: "operations",
      label: language === "es" ? "Operaciones" : language === "hi" ? "संचालन" : "Operations",
      emoji: "🛰️",
      accentColor: "text-indigo-400 data-[state=open]:text-indigo-400",
      items: dynamicOperationsItems,
      cols: 2,
      routes: ["/dashboard", "/patients", "/capacity", "/telemedicine", "/infrastructure"],
    },
    {
      key: "diagnostics",
      label: language === "es" ? "Diagnósticos AI" : language === "hi" ? "निदान एआई" : "Diagnostics AI",
      emoji: "🧬",
      accentColor: "text-rose-400 data-[state=open]:text-rose-400",
      items: diagnosticsItems,
      cols: 2,
      routes: ["/predict/heart", "/predict/lungs", "/predict/liver", "/predict/kidney", "/predict/diabetes"],
    },
    {
      key: "intelligence",
      label: language === "es" ? "Inteligencia" : language === "hi" ? "बुद्धिमत्ता" : "Intelligence",
      emoji: "⚡",
      accentColor: "text-purple-400 data-[state=open]:text-purple-400",
      items: dynamicIntelligenceItems,
      cols: 1,
      routes: ["/chat", "/about", "/pricing"],
    },
    {
      key: "aurevia",
      label: "Aurevia",
      emoji: "◆",
      accentColor: "text-cyan-400 data-[state=open]:text-cyan-400",
      items: dynamicHealthcareSystemItems,
      cols: 2,
      routes: ["/apps", "/federated", "/intelligence", "/companion"],
    },
  ];

  const closeAllMenus = () => {
    setActiveMenu(null);
    setHoveredTab(null);
  };

  // Reset menu on route change
  useEffect(() => {
    closeAllMenus();
  }, [pathname]);

  // Click / touch outside handler for menu
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Node;
      if (activeMenu && navContainerRef.current && !navContainerRef.current.contains(target)) {
        closeAllMenus();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("pointerdown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, [activeMenu]);

  // Escape key handler to close menu
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAllMenus();
        setShowNotifications(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Mousemove distance tracking: auto-close menu when cursor moves away from nav & menu bounds
  useEffect(() => {
    if (!activeMenu) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!navContainerRef.current) return;
      const rect = navContainerRef.current.getBoundingClientRect();
      const buffer = 40; // 40px buffer around header nav & mega menu bounds
      const isOutsideX = e.clientX < rect.left - buffer || e.clientX > rect.right + buffer;
      const isOutsideY = e.clientY < rect.top - buffer || e.clientY > rect.top + 550; // covers nav + mega menu height

      if (isOutsideX || isOutsideY) {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        closeAllMenus();
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [activeMenu]);

  const handleMouseEnter = (menuKey: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setActiveMenu(menuKey);
  };

  useEffect(() => {
    const toggleTheme = () => {
      const root = document.documentElement;
      const currentTheme = root.getAttribute("data-theme");
      if (currentTheme === "light") root.setAttribute("data-theme", "dark");
      else root.setAttribute("data-theme", "light");
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCmdShiftD = event.metaKey && event.shiftKey && event.key.toLowerCase() === "d";
      if (isCmdShiftD) {
        event.preventDefault();
        toggleTheme();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  };

  return (
    <>
      <header
        className="fixed top-2.5 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] md:w-[calc(100%-3rem)] max-w-[1550px] h-14 z-50 flex items-center px-4 md:px-6 justify-between border border-[var(--border)] bg-[var(--bg-card)] backdrop-blur-2xl rounded-2xl shadow-[var(--shadow-soft)] transition-all duration-300 hover:border-[var(--border-focus)] hover:shadow-[0_4px_30px_rgba(95,95,247,0.08)]"
        role="banner"
      >
        {/* Top glow */}
        <div
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-60"
          aria-hidden="true"
        />

        {/* ─── Left: Brand Logo — Aurevia Health AI ─── */}
        <Link
          to="/dashboard"
          onMouseEnter={() => prefetchRoute('/dashboard')}
          className="flex items-center gap-2 shrink-0 group"
          aria-label="Aurevia Health AI Dashboard"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d1ff] to-[#a4e6ff] flex items-center justify-center text-[#003543] shadow-[0_0_14px_rgba(0,209,255,0.35)] group-hover:scale-105 transition-transform duration-200">
            <Sparkles size={15} aria-hidden="true" />
          </div>
          <div className="hidden xl:block leading-none">
            <h1 className="text-[11px] font-black text-[var(--text-primary)] tracking-[0.14em] uppercase">
              Aurevia
            </h1>
            <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-[#00d1ff] -mt-0.5">Health AI</p>
          </div>
        </Link>

        {isDemo && (
          <span
            title="Frontend demo session — simulated data, no live backend"
            className="ml-1 shrink-0 rounded-full border border-[#00d1ff]/40 bg-[#00d1ff]/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#00d1ff]"
          >
            Demo mode
          </span>
        )}


        {/* ─── Center: Navigation with Mega Menus ─── */}
        <nav
          ref={navContainerRef}
          className="hidden lg:flex items-center gap-0.5 xl:gap-1.5 h-full relative"
          onMouseLeave={() => {
            handleMouseLeave();
            setHoveredTab(null);
          }}
          aria-label="Main navigation"
        >
          {dynamicMenuGroups.map((group) => {
            const isCurrentRoute = group.routes.some((r) => pathname?.startsWith(r));

            return (
              <div
                key={group.key}
                className="h-full flex items-center relative"
                onMouseEnter={() => {
                  if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                  setActiveMenu(group.key);
                  setHoveredTab(group.key);
                }}
              >
                <button
                  onClick={() => {
                    if (activeMenu === group.key) {
                      setActiveMenu(null);
                      setHoveredTab(null);
                    } else {
                      setActiveMenu(group.key);
                      setHoveredTab(group.key);
                    }
                  }}
                  className={`relative z-10 px-1.5 xl:px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                    activeMenu === group.key || isCurrentRoute
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                  aria-expanded={activeMenu === group.key}
                  aria-haspopup="true"
                >
                  <span className="text-sm">{group.emoji}</span>
                  {group.label}
                  <ChevronDown
                    size={11}
                    className={`transition-transform duration-200 ${
                      activeMenu === group.key
                        ? "rotate-180 text-[var(--accent)]"
                        : "text-[var(--text-dim)]"
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {/* Hover pill */}
                {hoveredTab === group.key && (
                  <motion.div
                    layoutId="nav-hover-pill"
                    className="absolute inset-0 bg-white/[0.04] border border-white/[0.02] rounded-lg -z-10"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}

                {/* Active underline */}
                {isCurrentRoute && activeMenu !== group.key && (
                  <motion.div
                    layoutId="nav-active-pill"
                    className="absolute bottom-1 inset-x-3.5 h-0.5 bg-[var(--accent)] rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </div>
            );
          })}

          {/* ─── Mega Menu Panel ─── */}
          <AnimatePresence mode="wait">
            {activeMenu && (
              <motion.div
                key={activeMenu}
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onMouseEnter={() => {
                  if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                }}
                onMouseLeave={() => {
                  handleMouseLeave();
                  setHoveredTab(null);
                }}
                className="absolute top-[44px] left-1/2 -translate-x-1/2 pt-2 z-50 gpu-accelerated"
              >
                {(() => {
                  const group = dynamicMenuGroups.find((g) => g.key === activeMenu);
                  if (!group) return null;
                  return (
                    <MegaMenuPanel
                      items={group.items}
                      cols={group.cols}
                      onNavigate={closeAllMenus}
                    />
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* ─── Right: Actions ─── */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* Offline Queue Indicator (only visible when offline) */}
          {!isOnline && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 border border-amber-500/20 bg-amber-500/10 rounded-lg text-[10px] font-extrabold tracking-wider uppercase text-amber-500">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <span>Offline ({queueCount})</span>
            </div>
          )}

          {/* Command Search */}
          <CommandSearch user={user} />

          {/* Notification Bell Dropdown */}
          <div ref={notificationsRef} className="relative flex items-center">
            <Tooltip content={alarm?.active ? "Active Vitals Alarm!" : "Notifications"} position="bottom">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 rounded-lg border transition-all duration-200 cursor-pointer ${
                  alarm?.active
                    ? "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse hover:bg-red-500/20"
                    : "text-[var(--text-secondary)] hover:text-[var(--accent)] border-transparent hover:border-[var(--border)] hover:bg-white/[0.02]"
                }`}
                aria-label="View notifications"
              >
                {alarm?.active ? <BellRing size={15} className="animate-bounce" /> : <Bell size={15} />}
                {alarm?.active && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border-2 border-[var(--bg-card)]" />
                )}
              </button>
            </Tooltip>

            {/* Notifications Popover */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-11 w-80 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] backdrop-blur-2xl shadow-[var(--shadow-hard)] z-50 space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
                    <span className="text-[11px] font-black tracking-wider uppercase text-[var(--text-primary)]">Notifications</span>
                    {alarm?.active && (
                      <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[8px] font-black tracking-widest uppercase">Critical</span>
                    )}
                  </div>

                  {alarm?.active ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={15} />
                        <div>
                          <p className="font-extrabold text-[10px] text-red-500 uppercase tracking-wide">Emergency Vitals Alarm</p>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-1 font-mono leading-relaxed text-left">
                            {alarm.bed}: {alarm.name} exhibits abnormal heart rate (HR: {alarm.hr} BPM).
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 pt-2">
                        <button
                          onClick={() => resolveAlarm("code-blue")}
                          className="w-full py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[9px] font-extrabold tracking-wider uppercase transition-colors cursor-pointer"
                        >
                          🚨 Send Emergency Team (Code Blue)
                        </button>
                        <button
                          onClick={() => resolveAlarm("dismiss")}
                          className="w-full py-1.5 rounded-lg border border-[var(--border)] hover:bg-white/[0.02] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[9px] font-extrabold tracking-wider uppercase transition-colors cursor-pointer"
                        >
                          ❌ Dismiss Alarm
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-[10px] text-[var(--text-dim)] uppercase tracking-wider">
                      No active alerts
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>


          {/* Language Selector Dropdown */}
          <LanguageSelector language={language} setLanguage={setLanguage} />

          {/* SOTA Interactive Zero-Learning-Curve Guide Toggle */}
          <Tooltip content="Zero-Learning-Curve Interactive Guide" position="bottom">
            <button
              onClick={() => setShowOnboardingModal(true)}
              className="p-2 text-blue-500 hover:text-blue-400 border border-blue-500/20 hover:border-blue-500/40 bg-blue-500/10 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
              aria-label="Open Interactive Onboarding Guide"
            >
              <Sparkles size={15} className="animate-pulse text-yellow-400" aria-hidden="true" />
            </button>
          </Tooltip>


          {/* User Profile Dropdown */}
          {user && (
            <ProfileDropdown user={user} logout={logout} adminLabel={t.adminConsole} />
          )}

          {/* Mobile Menu trigger */}
          <Tooltip content="Open Navigation Menu" position="bottom">
            <button
              onClick={() => {
                if (setMobileOpen) setMobileOpen(true);
              }}
              className="lg:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border-focus)] bg-white/[0.02] hover:bg-white/[0.05] rounded-lg transition-all cursor-pointer"
              aria-label="Open mobile menu"
            >
              <BrainCircuit size={16} aria-hidden="true" />
            </button>
          </Tooltip>
        </div>

      </header>

      {/* ─── Mobile Drawer ─── */}
      <AnimatePresence>
        {mobileOpen && (
          <Suspense fallback={null}>
            <MobileDrawer
              open={mobileOpen}
              onClose={() => {
                if (setMobileOpen) setMobileOpen(false);
              }}
              setCommandMenuOpen={(val) => {
                if (val) window.dispatchEvent(new CustomEvent("open-command-search"));
              }}
              dynamicMenuGroups={dynamicMenuGroups}
              telemetryStats={{ cpu: 12, latency: 22 }}
              user={user}
              logout={logout}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Guide is now handled by OnboardingGuideModal — dead drawer removed to fix z-index and bundle bloat */}
      {/* ── Clinical Action Modals ── */}
      <Suspense fallback={null}>
        <AnimatePresence>
          {showHandoffModal && (
            <ShiftHandoffModal onClose={() => setShowHandoffModal(false)} />
          )}
          {showSoapAuditModal && (
            <SoapDenialAuditModal onClose={() => setShowSoapAuditModal(false)} />
          )}
          {showDischargeModal && (
            <DischargeSummaryModal onClose={() => setShowDischargeModal(false)} />
          )}
          {showTelephonyModal && (
            <TelephonyRoutingModal onClose={() => setShowTelephonyModal(false)} />
          )}
          {showSecurityModal && (
            <SecurityLockoutModal onClose={() => setShowSecurityModal(false)} />
          )}
          {showHealingModal && (
            <SelfHealingMaintenanceModal onClose={() => setShowHealingModal(false)} />
          )}
          {showBillingModal && (
            <BillingClaimsModal onClose={() => setShowBillingModal(false)} />
          )}
          {showOnboardingModal && (
            <OnboardingGuideModal isOpen={showOnboardingModal} onClose={() => setShowOnboardingModal(false)} />
          )}
        </AnimatePresence>
      </Suspense>
    </>

  );
}
