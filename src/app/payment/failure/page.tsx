"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { XCircle, ArrowLeft, RefreshCcw, Brain } from "lucide-react";
import Link from "next/link";

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
      </div>
    }>
      <PaymentFailureContent />
    </Suspense>
  );
}

function PaymentFailureContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-orange-200/20 rounded-full blur-3xl" />
      </div>

      <div className={`relative max-w-md w-full transition-all duration-700 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-red-100 border border-red-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-red-500 to-rose-600 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-2 right-4 text-6xl">✕</div>
              <div className="absolute bottom-2 left-4 text-4xl">✕</div>
            </div>
            <div className="relative">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <XCircle className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">Payment Failed</h1>
              <p className="text-red-100 text-sm">Your Pine Labs transaction could not be completed</p>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Status</span>
                <span className="flex items-center gap-1.5 text-red-500 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  FAILED
                </span>
              </div>
              {ref && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Order Reference</span>
                  <span className="font-mono text-xs text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded">{ref}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Next Step</span>
                <span className="text-slate-700 font-medium">Try alternate method</span>
              </div>
            </div>

            {/* AI Recovery CTA */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <Brain className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-slate-800">AI Recovery Agent Available</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                The AI Recovery Agent can automatically analyze the failure and route your payment to a higher-success channel — UPI, EMI, or Wallet — without you having to retry manually.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Link href="/">
                <button className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-100 group text-sm">
                  <RefreshCcw className="w-4 h-4" />
                  Retry with AI Recovery Agent
                </button>
              </Link>
              <Link href="/">
                <button className="w-full h-11 border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium rounded-xl flex items-center justify-center gap-2 transition-all text-sm group">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Checkout
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-slate-400">
          Powered by Pine Labs AI · Autonomous Payment Recovery Agent
        </div>
      </div>
    </div>
  );
}
