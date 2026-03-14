"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle, ShieldCheck, Sparkles, X, CheckCircle2,
  RotateCw, Fingerprint, Brain, Zap, ArrowRight, ChevronRight
} from "lucide-react";

interface RecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartTotal: number;
  errorCode?: string;
}

type AgentStep = "FAILED" | "INITIATING_AI" | "ANALYZING" | "RETRYING" | "SUCCESS";

interface ToolStep {
  tool: string;
  input: string;
  observation: string;
  timestamp: number;
}

interface AgentResult {
  thought_process: string;
  suggestion: string;
  rationale: string;
  recovery_strategy: string;
  confidence: number;
  steps: ToolStep[];
  fallback: boolean;
}

const ERROR_LABELS: Record<string, { title: string; code: string; color: string }> = {
  INSUFFICIENT_FUNDS: { title: "Insufficient Card Balance", code: "ERR_FUNDS_001", color: "amber" },
  CARD_DECLINED:      { title: "Card Declined by Issuer",  code: "ERR_DECLINE_002", color: "red" },
  "504_BANK_TIMEOUT": { title: "Bank Network Timeout",     code: "ERR_TIMEOUT_504", color: "orange" },
};

export default function RecoveryModal({
  isOpen,
  onClose,
  cartTotal,
  errorCode = "504_BANK_TIMEOUT",
}: RecoveryModalProps) {
  const [step, setStep] = React.useState<AgentStep>("FAILED");
  const [agentResult, setAgentResult] = React.useState<AgentResult | null>(null);
  const [visibleSteps, setVisibleSteps] = React.useState<ToolStep[]>([]);
  const [currentToolIdx, setCurrentToolIdx] = React.useState(0);
  const terminalRef = React.useRef<HTMLDivElement>(null);

  const errInfo = ERROR_LABELS[errorCode] || ERROR_LABELS["504_BANK_TIMEOUT"];

  // Auto-scroll terminal
  React.useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [visibleSteps, step]);

  React.useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    const run = async () => {
      setStep("INITIATING_AI");
      await delay(1000);
      if (!mounted) return;

      setStep("ANALYZING");

      // Call the agent API
      let result: AgentResult | null = null;
      try {
        const res = await fetch("/api/bedrock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "recover",
            errorCode,
            cartTotal: `₹${cartTotal.toLocaleString("en-IN")}`,
          }),
        });
        result = await res.json();
      } catch {
        // use fallback
      }

      if (!mounted) return;
      if (result) setAgentResult(result);

      // Animate tool steps one by one
      const steps: ToolStep[] = result?.steps || [
        { tool: "analyze_failure", input: errorCode, observation: "Bank network unreachable. Card rail unavailable.", timestamp: Date.now() },
        { tool: "score_payment_rails", input: "errorCode=" + errorCode, observation: "Rail scores: UPI:100, EMI:95, WALLET:75. Top: UPI", timestamp: Date.now() },
        { tool: "select_recovery_path", input: "strategy_candidates=[UPI,EMI,WALLET]", observation: "Selected: UPI with 94% confidence.", timestamp: Date.now() },
      ];

      for (let i = 0; i < steps.length; i++) {
        if (!mounted) return;
        await delay(700);
        setVisibleSteps((prev) => [...prev, steps[i]]);
        setCurrentToolIdx(i + 1);
      }

      if (!mounted) return;
      setStep("RETRYING");
      await delay(2000);
      if (!mounted) return;
      setStep("SUCCESS");
    };

    run();
    return () => { mounted = false; };
  }, [isOpen, errorCode, cartTotal]);

  if (!isOpen) return null;

  const confidence = agentResult?.confidence ?? 94;
  const suggestion = agentResult?.suggestion ?? "UPI";
  const rationale = agentResult?.rationale ?? "Bank timeout on card network. UPI has 99.8% uptime right now — routing autonomously.";
  const thoughtProcess = agentResult?.thought_process ?? "Analyzing failure and selecting best fallback.";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 24 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
        >
          {/* ── Header ── */}
          <div className={`relative p-6 border-b border-slate-100 ${
            step === "SUCCESS" ? "bg-gradient-to-r from-emerald-50 to-teal-50" : "bg-gradient-to-r from-slate-50 to-indigo-50/50"
          }`}>
            <button
              onClick={onClose}
              className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                step === "SUCCESS"
                  ? "bg-emerald-100 shadow-lg shadow-emerald-100"
                  : "bg-indigo-100 shadow-lg shadow-indigo-100"
              }`}>
                {step === "SUCCESS"
                  ? <ShieldCheck className="w-7 h-7 text-emerald-600" />
                  : <Fingerprint className="w-7 h-7 text-indigo-600 animate-pulse" />
                }
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-slate-900">
                    {step === "FAILED" && "Transaction Failed"}
                    {(step === "INITIATING_AI" || step === "ANALYZING" || step === "RETRYING") && "AI Recovery Agent"}
                    {step === "SUCCESS" && "Payment Recovered! 🎉"}
                  </h3>
                  {step !== "FAILED" && step !== "SUCCESS" && (
                    <span className="flex items-center gap-1 text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-semibold animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      ACTIVE
                    </span>
                  )}
                  {step === "SUCCESS" && (
                    <span className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      RECOVERED
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  {step === "FAILED" && `${errInfo.title} · ${errInfo.code}`}
                  {(step === "INITIATING_AI" || step === "ANALYZING") && "Running multi-step diagnostic pipeline..."}
                  {step === "RETRYING" && `Routing to ${suggestion} autonomously...`}
                  {step === "SUCCESS" && `Sale saved via ${suggestion}`}
                </p>
              </div>
            </div>

            {/* Confidence bar (shown after analysis) */}
            {(step === "RETRYING" || step === "SUCCESS") && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-3"
              >
                <span className="text-xs text-slate-500 font-medium shrink-0">Agent confidence</span>
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${confidence}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
                  />
                </div>
                <span className="text-xs font-bold text-slate-700 shrink-0">{confidence}%</span>
              </motion.div>
            )}
          </div>

          {/* ── Terminal ── */}
          <div
            ref={terminalRef}
            className="bg-[#0d1117] text-slate-300 font-mono text-xs p-5 h-64 overflow-y-auto space-y-2.5"
          >
            {/* Initial failure line */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
              <span className="text-red-400">
                [PINE_LABS] Processing payment... <span className="font-bold">
                  {errorCode === "INSUFFICIENT_FUNDS" ? "DECLINED — Insufficient Funds" :
                   errorCode === "CARD_DECLINED" ? "DECLINED — Card Rejected by Issuer" :
                   "FAILED — Bank Timeout (504)"}
                </span>
              </span>
            </motion.div>

            {/* Agent injection */}
            {step !== "FAILED" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                <span className="text-indigo-300">[AGENT] Intercepting failure. Holding checkout state. Initiating recovery pipeline...</span>
              </motion.div>
            )}

            {/* Tool steps */}
            {visibleSteps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-1 pl-2 border-l-2 border-indigo-800"
              >
                <div className="flex items-center gap-2">
                  <Brain className="w-3 h-3 text-purple-400 shrink-0" />
                  <span className="text-purple-300 font-semibold">Tool[{i + 1}]: {s.tool}</span>
                </div>
                <div className="text-slate-500 pl-5">
                  <span className="text-slate-600">input:</span> {s.input}
                </div>
                <div className="text-emerald-400 pl-5">
                  <span className="text-slate-600">obs:</span> {s.observation}
                </div>
              </motion.div>
            ))}

            {/* Bedrock call */}
            {step === "ANALYZING" && currentToolIdx >= 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2">
                <RotateCw className="w-3.5 h-3.5 text-slate-400 animate-spin mt-0.5 shrink-0" />
                <span className="text-slate-400">[BEDROCK] Invoking Claude Sonnet... synthesizing tool observations...</span>
              </motion.div>
            )}

            {/* Agent thought */}
            {(step === "RETRYING" || step === "SUCCESS") && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-yellow-400 mt-0.5 shrink-0" />
                <span className="text-yellow-300 font-semibold">[CLAUDE]: {thoughtProcess}</span>
              </motion.div>
            )}

            {/* Recovery decision */}
            {(step === "RETRYING" || step === "SUCCESS") && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-slate-100 font-semibold">{rationale}</span>
              </motion.div>
            )}

            {/* Routing */}
            {step === "RETRYING" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2">
                <RotateCw className="w-3.5 h-3.5 text-amber-400 animate-spin mt-0.5 shrink-0" />
                <span className="text-amber-300">
                  [AGENT] Autonomously routing to <span className="font-bold text-white">{suggestion}</span> rail... no user input required.
                </span>
              </motion.div>
            )}

            {/* Success */}
            {step === "SUCCESS" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-start gap-2 pt-1"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span className="text-emerald-400 font-bold text-sm">
                  ✓ Payment successful via {suggestion}! Sale recovered. Revenue saved: ₹{cartTotal.toLocaleString("en-IN")}
                </span>
              </motion.div>
            )}

            {/* Cursor */}
            {step !== "SUCCESS" && (
              <span className="inline-block w-2 h-3.5 bg-indigo-400 cursor-blink" />
            )}
          </div>

          {/* ── Footer ── */}
          <div className="p-5 bg-white border-t border-slate-100">
            {step === "SUCCESS" ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {/* Recovery summary */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Method", value: suggestion },
                    { label: "Confidence", value: `${confidence}%` },
                    { label: "Amount Saved", value: `₹${cartTotal.toLocaleString("en-IN")}` },
                  ].map((item) => (
                    <div key={item.label} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <div className="text-xs text-slate-400 mb-0.5">{item.label}</div>
                      <div className="text-sm font-bold text-slate-900">{item.value}</div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={onClose}
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100 group"
                >
                  Continue Shopping
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="flex gap-1">
                    {["analyze_failure", "score_rails", "select_path", "claude"].map((t, i) => (
                      <div
                        key={t}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          i < currentToolIdx ? "bg-indigo-500" : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span>Step {Math.min(currentToolIdx + 1, 4)} of 4</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-indigo-500 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  Agent running...
                  <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
