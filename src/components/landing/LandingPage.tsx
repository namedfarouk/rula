import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { Pencil, Zap, Layers, Shield } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Fade-in wrapper                                                    */
/* ------------------------------------------------------------------ */

function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Nav                                                                */
/* ------------------------------------------------------------------ */

function Nav() {
  return (
    <nav style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E7E5E4' }} className="fixed top-0 left-0 right-0 z-50 h-14">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px' }} className="h-full flex items-center justify-between">
        <Link
          to="/"
          className="font-mono text-lg font-bold tracking-wider flex items-center gap-2"
          style={{ color: '#2563EB' }}
        >
          <Shield size={28} strokeWidth={2.5} fill="#2563EB" color="#FFFFFF" />
          Rula
        </Link>

        <div className="flex items-center gap-8">
          <Link
            to="/demo"
            style={{ backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: 6, padding: '8px 14px', cursor: 'pointer' }}
            className="text-[10px] font-medium transition-opacity"
          >
            Demo
          </Link>
          <Link
            to="/demo"
            style={{ backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: 6, padding: '8px 14px', cursor: 'pointer' }}
            className="text-[10px] font-medium transition-opacity whitespace-nowrap"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                               */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F4' }}>
      {/* Blue orb */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] blur-[150px] pointer-events-none" style={{ backgroundColor: 'rgba(37, 99, 235, 0.06)' }} />

      <div className="relative max-w-3xl mx-auto text-center px-6">
        <motion.h1
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight"
          style={{ color: '#1C1917' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          Set Rules for Your Wallet.
          <br />
          <span style={{ color: '#2563EB' }}>Rula</span> Enforces Them.
        </motion.h1>

        <motion.p
          className="text-lg max-w-xl mx-auto mt-6"
          style={{ color: '#78716C' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        >
          Define spending limits, time locks, and alerts in plain English. Your
          AI agent monitors every transaction on X Layer.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        >
          <Link
            to="/demo"
            style={{ backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: 6, padding: '8px 14px', cursor: 'pointer' }}
            className="inline-block mt-8 mb-6 text-[10px] font-medium whitespace-nowrap transition-opacity"
          >
            Demo
          </Link>
        </motion.div>

        <motion.div
          className="flex flex-wrap gap-4 mt-6 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
        >
          {["Plain English Rules", "Real-Time Monitoring", "Auto-Enforce", "Demo Mode"].map(
            (tag) => (
              <span
                key={tag}
                className="rounded-[4px] px-3 py-1 text-[11px] font-mono uppercase tracking-wider"
                style={{ border: '1px solid #E7E5E4', color: '#78716C' }}
              >
                {tag}
              </span>
            )
          )}
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Problem                                                            */
/* ------------------------------------------------------------------ */

function Problem() {
  return (
    <section style={{ paddingTop: 100, paddingBottom: 100, backgroundColor: '#F5F5F4' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px' }} className="text-center">
        <FadeIn>
          <p className="uppercase tracking-[0.2em] text-[10px] mb-4" style={{ color: '#78716C' }}>
            The Problem
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6" style={{ color: '#1C1917' }}>
            On-chain wallets have zero guardrails.
          </h2>
          <p className="text-base leading-[1.6] max-w-2xl mx-auto" style={{ color: '#44403C' }}>
            One bad approval. One fat-finger transfer. One compromised session.
            Your funds are gone. Traditional finance has fraud detection, spending
            limits, and real-time alerts. Crypto has nothing.
          </p>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="flex flex-col sm:flex-row justify-center pt-10 mt-14" style={{ gap: 80, borderTop: '1px solid #E7E5E4' }}>
            {[
              { value: "$3.4B", label: "stolen in crypto in 2025 (Chainalysis)" },
              { value: "158K", label: "individual wallet compromises in 2025" },
              { value: "44%", label: "of stolen value from personal wallets" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="font-mono text-3xl font-bold" style={{ color: '#2563EB' }}>
                  {stat.value}
                </p>
                <p className="text-[11px] uppercase tracking-[0.16em] mt-1" style={{ color: '#78716C' }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* How It Works                                                       */
/* ------------------------------------------------------------------ */

const steps = [
  {
    num: "01",
    title: "Write a rule",
    description: "Describe what you want in plain English.",
    code: "> block transfers over 500 USDT",
  },
  {
    num: "02",
    title: "Rula parses it",
    description:
      "AI converts your sentence into structured on-chain logic.",
    code: '{ type: "limit", token: "USDT", max: 500 }',
  },
  {
    num: "03",
    title: "Every tx is checked",
    description:
      "Transactions evaluated against your rules in real time.",
    code: "TX 0x3fa1... \u2192 BLOCKED by rule #1",
  },
];

function HowItWorks() {
  return (
    <section style={{ paddingTop: 100, paddingBottom: 100, backgroundColor: '#F5F5F4' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px' }} className="text-center">
        <FadeIn>
          <p className="uppercase tracking-[0.2em] text-[10px] mb-4" style={{ color: '#78716C' }}>
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: '#1C1917' }}>
            Three steps. Full control.
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-12 text-left">
          {steps.map((s, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div>
                <p className="font-mono text-[11px] tracking-widest" style={{ color: '#D6D3D1' }}>
                  {s.num}
                </p>
                <h3 className="font-medium text-sm mt-3 mb-2" style={{ color: '#1C1917' }}>
                  {s.title}
                </h3>
                <p className="text-[13px] leading-relaxed" style={{ color: '#78716C' }}>
                  {s.description}
                </p>
                <div className="rounded-[4px] p-3 mt-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E7E5E4' }}>
                  <p className="font-mono text-[12px]" style={{ color: '#44403C' }}>
                    {s.code}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Terminal Preview — STAYS DARK                                      */
/* ------------------------------------------------------------------ */

interface TerminalLine {
  timestamp: string;
  text: string;
  status?: "check" | "ALLOWED" | "BLOCKED";
  indent?: boolean;
  ruleText?: string;
}

const terminalLines: TerminalLine[] = [
  {
    timestamp: "14:32:01",
    text: 'rule loaded: "block transfers over $200"',
    status: "check",
  },
  {
    timestamp: "14:32:01",
    text: 'rule loaded: "alert if gas > 0.01 ETH"',
    status: "check",
  },
  {
    timestamp: "14:32:01",
    text: 'rule loaded: "no transfers after midnight"',
    status: "check",
  },
  {
    timestamp: "14:32:05",
    text: "monitoring wallet 0x7a3f...c891",
  },
  {
    timestamp: "14:32:12",
    text: "tx 0xa1b2...f3d4 \u2192 150 USDT to 0x8b2...f19",
    status: "ALLOWED",
  },
  {
    timestamp: "14:32:28",
    text: "tx 0xc3d4...a5b6 \u2192 850 USDT to 0x3c9...a07",
    status: "BLOCKED",
  },
  {
    indent: true,
    timestamp: "",
    text: "",
    ruleText: '"block transfers over $200"',
  },
  {
    timestamp: "14:32:45",
    text: "tx 0xe5f6...c7d8 \u2192 50 OKB swap on OKX DEX",
    status: "ALLOWED",
  },
];

function TerminalPreview() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section style={{ paddingTop: 100, paddingBottom: 100, backgroundColor: '#0F172A' }} ref={ref}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 40px' }}>
        <div className="shadow-2xl border border-gray-800 rounded-lg overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
          {/* Title bar */}
          <div className="h-10 flex items-center px-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
            </div>
            <span className="ml-auto font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.15)' }}>
              rula v1.0
            </span>
          </div>

          {/* Body */}
          <div className="p-5 font-mono text-[12px] leading-7">
            {terminalLines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{
                  duration: 0.4,
                  ease: "easeOut",
                  delay: 0.3 + i * 0.15,
                }}
                className="flex items-start"
              >
                {line.indent ? (
                  <span className="ml-[86px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    {"\u21b3 rule: "}
                    <span style={{ color: 'rgba(255,255,255,0.25)' }}>{line.ruleText}</span>
                  </span>
                ) : (
                  <>
                    <span className="shrink-0 w-[86px]" style={{ color: 'rgba(255,255,255,0.15)' }}>
                      [{line.timestamp}]
                    </span>
                    <span className="flex-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{line.text}</span>
                    {line.status && (
                      <span
                        className="shrink-0 ml-4"
                        style={{
                          color: line.status === "BLOCKED"
                            ? 'rgba(239, 68, 68, 0.6)'
                            : 'rgba(37, 99, 235, 0.6)'
                        }}
                      >
                        {line.status === "check"
                          ? "\u2713"
                          : line.status === "ALLOWED"
                          ? "ALLOWED"
                          : "BLOCKED"}
                      </span>
                    )}
                  </>
                )}
              </motion.div>
            ))}
          </div>

          {/* Status bar */}
          <div className="px-4 py-2 flex justify-between items-center" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#2563EB' }} />
              <span className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.15)' }}>
                Live
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.15)' }}>
              3 rules &middot; 2 allowed &middot; 1 blocked
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Features                                                           */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: Pencil,
    title: "Plain English Rules",
    description: "No Solidity. No config files. Just say what you want.",
  },
  {
    icon: Zap,
    title: "Sub-100ms Enforcement",
    description: "Every transaction checked before execution.",
  },
  {
    icon: Layers,
    title: "X Layer Native",
    description: "Built on X Layer with OnchainOS integration.",
  },
  {
    icon: Shield,
    title: "Agentic Wallet",
    description: "Powered by OKX Agentic Wallet for secure control.",
  },
];

function Features() {
  return (
    <section style={{ paddingTop: 100, paddingBottom: 100, backgroundColor: '#F5F5F4' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px' }} className="text-center">
        <FadeIn>
          <p className="uppercase tracking-[0.2em] text-[10px] mb-4" style={{ color: '#78716C' }}>
            Built for X Layer
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left" style={{ maxWidth: 800, margin: '0 auto' }}>
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <FadeIn key={i} delay={i * 0.1}>
                <div
                  className="p-8 border border-gray-200 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md rounded-xl bg-white"
                >
                  <Icon size={16} style={{ color: '#2563EB' }} />
                  <h3 className="font-medium text-sm mt-4" style={{ color: '#1C1917' }}>
                    {f.title}
                  </h3>
                  <p className="text-[13px] mt-2 leading-relaxed" style={{ color: '#78716C' }}>
                    {f.description}
                  </p>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* CTA                                                                */
/* ------------------------------------------------------------------ */

function CTA() {
  return (
    <section style={{ paddingTop: 100, paddingBottom: 100, backgroundColor: '#F5F5F4' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px' }} className="text-center">
        <FadeIn>
          <h2 className="text-2xl font-bold" style={{ color: '#1C1917' }}>
            Try Rula. No wallet needed.
          </h2>
          <div className="mt-6">
            <Link
              to="/demo"
              style={{ backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: 6, padding: '8px 14px', cursor: 'pointer' }}
              className="inline-block text-[10px] font-medium whitespace-nowrap transition-opacity"
            >
              Demo
            </Link>
          </div>
          <p className="font-mono text-[11px] mt-4" style={{ color: '#78716C' }}>
            Rula earns a small fee on each enforced transaction. Free to set up.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Footer — DARK                                                      */
/* ------------------------------------------------------------------ */

function Footer() {
  return (
    <footer style={{ backgroundColor: '#1C1917', padding: '32px 0' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px' }} className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-mono text-sm flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <Shield size={14} strokeWidth={2.5} fill="rgba(255,255,255,0.4)" color="#1C1917" />
          Rula
        </span>
        <span className="text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Built for OKX Build X Hackathon &middot; Powered by OnchainOS
        </span>
        <a
          href="https://github.com/namedfarouk/rula"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] transition-colors"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Landing Page                                                       */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F4', color: '#1C1917' }}>
      <Nav />
      <Hero />
      <Problem />
      <HowItWorks />
      <TerminalPreview />
      <Features />
      <CTA />
      <Footer />
    </div>
  );
}
