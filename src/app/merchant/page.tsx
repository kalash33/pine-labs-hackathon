"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowUpRight, TrendingUp, IndianRupee, RotateCcw, ShieldAlert,
  Zap, Brain, Activity, Wifi, AlertTriangle, CheckCircle2,
  ShoppingCart, CreditCard, Smartphone, Banknote, RefreshCw,
  ChevronRight, Menu, X, ExternalLink, Sparkles, Shield
} from "lucide-react";

// ─────────────────────────────────────────────
// Animated Counter Hook
// ─────────────────────────────────────────────
function useCounter(target: number, duration = 2000) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

// ─────────────────────────────────────────────
// Sparkline Component (SVG)
// ─────────────────────────────────────────────
function Sparkline({ data, color = "#22c55e" }: { data: number[]; color?: string }) {
  const max = Math.max(...data), min = Math.min(...data);
  const w = 120, h = 40;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d - min) / (max - min + 1)) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(data.length - 1) / (data.length - 1) * w} cy={h - ((data[data.length - 1] - min) / (max - min + 1)) * h} r="3" fill={color} />
    </svg>
  );
}

// ─────────────────────────────────────────────
// Live Transaction Feed
// ─────────────────────────────────────────────
const INITIAL_TRANSACTIONS = [
  { id: "TXN-9821", user: "Priya S.", method: "HDFC CC → GPay UPI", amount: 8400, status: "recovered", time: "2s ago", icon: <RefreshCw className="w-3 h-3" /> },
  { id: "TXN-9820", user: "Arjun M.", method: "Smart Tender: Points + EMI", amount: 45000, status: "optimized", time: "28s ago", icon: <Sparkles className="w-3 h-3" /> },
  { id: "TXN-9819", user: "Sneha K.", method: "Pine Labs UPI — Direct", amount: 1200, status: "success", time: "1m ago", icon: <CheckCircle2 className="w-3 h-3" /> },
  { id: "TXN-9818", user: "Rahul P.", method: "Network Timeout → Alternate Rail", amount: 3200, status: "recovered", time: "3m ago", icon: <RefreshCw className="w-3 h-3" /> },
  { id: "TXN-9817", user: "Ananya R.", method: "Smart Tender: Wallet + Card", amount: 12000, status: "optimized", time: "5m ago", icon: <Sparkles className="w-3 h-3" /> },
  { id: "TXN-9816", user: "Dev T.", method: "Pine Labs Cards — Direct", amount: 6500, status: "success", time: "8m ago", icon: <CheckCircle2 className="w-3 h-3" /> },
];

const statusStyles: Record<string, string> = {
  recovered: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  optimized: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  success:   "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

// ─────────────────────────────────────────────
// AI Model Health Panel
// ─────────────────────────────────────────────
const AI_MODELS = [
  { name: "Recovery Agent (Claude 3 Haiku)", status: 99.8, latency: "320ms", color: "#a78bfa" },
  { name: "Smart-Tender Optimizer", status: 99.2, latency: "410ms", color: "#34d399" },
  { name: "Live Network Radar", status: 100, latency: "18ms", color: "#38bdf8" },
  { name: "Pine Labs Gateway Bridge", status: 97.4, latency: "540ms", color: "#fb923c" },
];

// ─────────────────────────────────────────────
// Recovery Origin Bars
// ─────────────────────────────────────────────
const RECOVERY_ORIGINS = [
  { label: "Insufficient Funds → EMI Offset", pct: 45, color: "from-violet-500 to-purple-500" },
  { label: "Bank Limit Hit → Split UPI", pct: 30, color: "from-emerald-500 to-teal-500" },
  { label: "Bank Timeout → Alternate Rail", pct: 15, color: "from-sky-500 to-blue-500" },
  { label: "Card Decline → Smart Retry", pct: 10, color: "from-amber-500 to-orange-500" },
];

// ─────────────────────────────────────────────
// Sparkline data sets
// ─────────────────────────────────────────────
const REVENUE_TREND   = [12, 18, 14, 22, 19, 27, 24, 31, 28, 38, 35, 42];
const RECOVERY_TREND  = [45, 52, 49, 60, 55, 68, 62, 73, 70, 82, 79, 89];
const SUCCESS_TREND   = [88, 90, 87, 91, 93, 92, 94, 93, 95, 94, 96, 94];
const CONVERSION_TREND = [80, 95, 102, 115, 108, 124, 130, 142, 138, 155, 160, 171];

// ─────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────
export default function MerchantDashboard() {
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [agentActive, setAgentActive] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [now, setNow] = useState(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recoveredRupees = useCounter(245000);
  const intercepted = useCounter(423);
  const conversions = useCounter(1204);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Simulate new incoming transactions every 6 seconds
  useEffect(() => {
    const names = ["Kavya L.", "Rohan D.", "Meera S.", "Aditya B.", "Pooja N.", "Vikram R."];
    const methods = [
      "HDFC CC → GPay UPI",
      "Pine Labs Netbanking",
      "Smart Tender: Points + Card",
      "Bank Timeout → Quick Retry",
      "Amazon Pay Wallet",
      "UPI Direct"
    ];
    const statuses: Array<"recovered" | "optimized" | "success"> = ["recovered", "optimized", "success"];
    let txCount = 9822;

    intervalRef.current = setInterval(() => {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const newTx = {
        id: `TXN-${txCount++}`,
        user: names[Math.floor(Math.random() * names.length)],
        method: methods[Math.floor(Math.random() * methods.length)],
        amount: Math.floor(Math.random() * 50000) + 500,
        status,
        time: "just now",
        icon: status === "recovered"
          ? <RefreshCw className="w-3 h-3" />
          : status === "optimized"
          ? <Sparkles className="w-3 h-3" />
          : <CheckCircle2 className="w-3 h-3" />,
      };
      setTransactions(prev => [newTx, ...prev.slice(0, 7)]);
    }, 6000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside className={`${sidebarOpen ? "w-64" : "w-16"} transition-all duration-300 bg-[#0d0d14] border-r border-white/5 flex flex-col flex-shrink-0`}>
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm tracking-tight">Pine Labs AI</span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-white/5 rounded-lg text-white/50 hover:text-white transition-colors">
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {[
            { icon: <Activity className="w-4 h-4" />, label: "Command Center", active: true },
            { icon: <Brain className="w-4 h-4" />, label: "AI Agent Logs" },
            { icon: <CreditCard className="w-4 h-4" />, label: "Transactions" },
            { icon: <TrendingUp className="w-4 h-4" />, label: "Analytics" },
            { icon: <Shield className="w-4 h-4" />, label: "Risk Engine" },
            { icon: <Wifi className="w-4 h-4" />, label: "Network Radar" },
          ].map(item => (
            <button key={item.label} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${item.active ? "bg-violet-500/20 text-violet-300 border border-violet-500/20" : "text-white/40 hover:text-white/80 hover:bg-white/5"}`}>
              {item.icon}
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5">
          <Link href="/" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/80 hover:bg-white/5 transition-all`}>
            <ShoppingCart className="w-4 h-4" />
            {sidebarOpen && <span>Checkout Demo</span>}
          </Link>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-auto">

        {/* Top Bar */}
        <header className="sticky top-0 z-10 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5 px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">AI Command Center</h1>
            <p className="text-xs text-white/40">{now.toLocaleTimeString('en-IN', { hour12: false })} IST · Pine Labs UAT · MID: 121507</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${agentActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${agentActive ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
              {agentActive ? "Agent Active" : "Agent Offline"}
            </div>
            <button onClick={() => setAgentActive(!agentActive)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white/60 hover:text-white transition-all">
              Toggle
            </button>
            <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-xs font-medium transition-colors">
              Live Checkout <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </header>

        <div className="p-6 space-y-6">

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Revenue Recovered",
                value: `₹${recoveredRupees.toLocaleString('en-IN')}`,
                change: "+12.5%",
                sub: "this month",
                icon: <IndianRupee className="w-5 h-5" />,
                color: "from-emerald-500 to-teal-600",
                sparkData: REVENUE_TREND,
                sparkColor: "#34d399"
              },
              {
                label: "Failures Intercepted",
                value: intercepted.toString(),
                change: "+8.2%",
                sub: "transactions saved",
                icon: <ShieldAlert className="w-5 h-5" />,
                color: "from-amber-500 to-orange-600",
                sparkData: RECOVERY_TREND,
                sparkColor: "#fbbf24"
              },
              {
                label: "AI Recovery Rate",
                value: "94.2%",
                change: "+2.4%",
                sub: "success on retry",
                icon: <RotateCcw className="w-5 h-5" />,
                color: "from-sky-500 to-blue-600",
                sparkData: SUCCESS_TREND,
                sparkColor: "#38bdf8"
              },
              {
                label: "Smart-Tender Saves",
                value: conversions.toLocaleString('en-IN'),
                change: "+18.1%",
                sub: "AI-optimized splits",
                icon: <Sparkles className="w-5 h-5" />,
                color: "from-violet-500 to-purple-600",
                sparkData: CONVERSION_TREND,
                sparkColor: "#a78bfa"
              }
            ].map((kpi, i) => (
              <div key={i} className="relative bg-[#0d0d14] border border-white/5 rounded-2xl p-5 overflow-hidden group hover:border-white/10 transition-all">
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity" style={{ background: `linear-gradient(to bottom right, ${kpi.sparkColor}, transparent)` }} />
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${kpi.color} shadow-lg`}>
                    {kpi.icon}
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5">
                    <ArrowUpRight className="w-3 h-3" />{kpi.change}
                  </span>
                </div>
                <div className="text-2xl font-bold text-white mb-0.5">{kpi.value}</div>
                <div className="text-xs text-white/40 mb-4">{kpi.label} · {kpi.sub}</div>
                <Sparkline data={kpi.sparkData} color={kpi.sparkColor} />
              </div>
            ))}
          </div>

          {/* ── Middle Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Recovery Origins */}
            <div className="lg:col-span-1 bg-[#0d0d14] border border-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <Brain className="w-4 h-4 text-violet-400" />
                <h2 className="text-sm font-semibold text-white/80">Recovery Origins</h2>
                <span className="ml-auto text-xs text-white/30">by AI model</span>
              </div>
              <div className="space-y-4">
                {RECOVERY_ORIGINS.map((r, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-white/60">{r.label}</span>
                      <span className="text-white/80 font-semibold">{r.pct}%</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-1.5 rounded-full bg-gradient-to-r ${r.color} transition-all duration-1000`} style={{ width: `${r.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment split donut replacement */}
              <div className="mt-5 pt-4 border-t border-white/5">
                <div className="text-xs text-white/30 mb-3">Payment rail distribution today</div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: "UPI", pct: 48, color: "bg-emerald-500" },
                    { label: "Cards", pct: 31, color: "bg-sky-500" },
                    { label: "Wallets", pct: 13, color: "bg-amber-500" },
                    { label: "EMI/BNPL", pct: 8, color: "bg-violet-500" },
                  ].map(r => (
                    <div key={r.label} className="flex items-center gap-1.5 text-xs text-white/50">
                      <span className={`w-2 h-2 rounded-full ${r.color}`} />
                      {r.label} <span className="text-white/30">{r.pct}%</span>
                    </div>
                  ))}
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden flex mt-2">
                  <div className="bg-emerald-500 h-full" style={{ width: "48%" }} />
                  <div className="bg-sky-500 h-full" style={{ width: "31%" }} />
                  <div className="bg-amber-500 h-full" style={{ width: "13%" }} />
                  <div className="bg-violet-500 h-full" style={{ width: "8%" }} />
                </div>
              </div>
            </div>

            {/* Live Transaction Feed */}
            <div className="lg:col-span-2 bg-[#0d0d14] border border-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-sm font-semibold text-white/80">Live Transaction Feed</h2>
                <span className="ml-auto text-xs text-white/30">{transactions.length} events</span>
              </div>
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {transactions.map((tx, i) => (
                  <div key={tx.id + i} className={`flex items-center gap-3 p-3 rounded-xl border bg-white/[0.02] border-white/5 hover:bg-white/[0.04] transition-all ${i === 0 ? "animate-pulse-once" : ""}`}>
                    <div className={`p-1.5 rounded-lg border text-xs ${statusStyles[tx.status]}`}>
                      {tx.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-white/40">{tx.id}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${statusStyles[tx.status]}`}>
                          {tx.status}
                        </span>
                      </div>
                      <div className="text-xs text-white/70 mt-0.5 truncate">{tx.user} · {tx.method}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-emerald-400">+₹{tx.amount.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-white/30">{tx.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── AI Model Health ── */}
          <div className="bg-[#0d0d14] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <Zap className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white/80">AI Systems Health</h2>
              <span className="ml-auto text-xs text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />All systems operational
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {AI_MODELS.map((m, i) => (
                <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-xs text-white/50 leading-snug">{m.name}</div>
                    <div className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: m.color, boxShadow: `0 0 6px ${m.color}` }} />
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{m.status}%</div>
                  <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden mb-2">
                    <div className="h-1 rounded-full transition-all duration-1000" style={{ width: `${m.status}%`, backgroundColor: m.color }} />
                  </div>
                  <div className="text-[11px] text-white/30">Avg latency: {m.latency}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Features Grid ── */}
          <div className="bg-[#0d0d14] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <Activity className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-semibold text-white/80">Implemented Features</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  title: "🤖 Autonomous Recovery Agent",
                  desc: "Intercepts payment failures and autonomously reroutes to a better rail (CC → UPI, EMI, etc.) without user intervention.",
                  badge: "AWS Bedrock · Claude 3",
                  color: "border-violet-500/30 bg-violet-500/5"
                },
                {
                  title: "📡 Live AI Network Radar",
                  desc: "Pre-payment risk scoring: scans Pine Labs routing table latency and warns user before they even click pay.",
                  badge: "Pre-Failure Prevention",
                  color: "border-sky-500/30 bg-sky-500/5"
                },
                {
                  title: "💡 Smart-Tender Optimizer",
                  desc: "AI analyzes cart size and user's loyalty points on page load and proactively suggests optimal payment split.",
                  badge: "Pre-Checkout AI",
                  color: "border-emerald-500/30 bg-emerald-500/5"
                },
                {
                  title: "🧠 Chain-of-Thought UI",
                  desc: "Every AI decision is made visible in real time. Users see the agent's actual reasoning in a terminal-style console.",
                  badge: "Transparency Layer",
                  color: "border-amber-500/30 bg-amber-500/5"
                },
                {
                  title: "💳 Real Pine Labs Gateway",
                  desc: "Real hosted checkout integration using Pine Labs UAT APIs. Orders are created server-side and user is redirected to PCI-DSS compliant Pine Labs payment page.",
                  badge: "Live API · MID: 121507",
                  color: "border-rose-500/30 bg-rose-500/5"
                },
                {
                  title: "📊 AI Command Center",
                  desc: "This real-time dashboard showing recovered revenue, live transaction feed, AI model health, and recovery origin analytics.",
                  badge: "Merchant Intelligence",
                  color: "border-purple-500/30 bg-purple-500/5"
                }
              ].map((f, i) => (
                <div key={i} className={`rounded-xl border p-4 ${f.color} hover:brightness-110 transition-all`}>
                  <div className="text-sm font-semibold text-white mb-1.5">{f.title}</div>
                  <p className="text-xs text-white/50 leading-relaxed mb-3">{f.desc}</p>
                  <span className="text-[10px] font-mono text-white/30 border border-white/10 px-2 py-0.5 rounded-full">{f.badge}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Footer CTA ── */}
          <div className="relative bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-pink-600/20 border border-violet-500/20 rounded-2xl p-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 to-transparent" />
            <div className="relative flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Try the Full AI Payment Flow</h3>
                <p className="text-sm text-white/50">Select HDFC → watch AI predict risk → pay anyway → agent autonomously recovers the transaction</p>
              </div>
              <Link href="/" className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition-colors flex-shrink-0 ml-4">
                Launch Checkout <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        @keyframes pulse-once { 0%,100% { opacity:1; } 50% { opacity:0.7; } }
        .animate-pulse-once { animation: pulse-once 0.6s ease-in-out; }
      `}</style>
    </div>
  );
}
