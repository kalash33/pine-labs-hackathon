"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ArrowRight, ShieldCheck, Zap, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const orderId = searchParams.get("order_id");
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-teal-200/20 rounded-full blur-3xl" />
      </div>

      <div className={`relative max-w-md w-full transition-all duration-700 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-emerald-100 border border-emerald-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-2 right-4 text-6xl">✓</div>
              <div className="absolute bottom-2 left-4 text-4xl">✓</div>
            </div>
            <div className="relative">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">Payment Successful!</h1>
              <p className="text-emerald-100 text-sm">Your transaction has been completed</p>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Status</span>
                <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  SUCCESS
                </span>
              </div>
              {ref && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Order Reference</span>
                  <span className="font-mono text-xs text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded">{ref}</span>
                </div>
              )}
              {orderId && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Pine Labs Order ID</span>
                  <span className="font-mono text-xs text-slate-700 font-semibold">{orderId}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Gateway</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded bg-indigo-600 flex items-center justify-center">
                    <Zap className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="font-medium text-slate-800">Pine Labs Online</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Secured by Pine Labs · PCI-DSS Level 1
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link href="/merchant">
                <button className="w-full h-11 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl flex items-center justify-center gap-2 transition-all text-sm group">
                  <BarChart3 className="w-4 h-4" />
                  Dashboard
                </button>
              </Link>
              <Link href="/">
                <button className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all text-sm shadow-lg shadow-emerald-100 group">
                  Shop Again
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* AI Recovery note */}
        <div className="mt-4 text-center text-xs text-slate-400">
          Powered by Pine Labs AI · Autonomous Payment Recovery Agent
        </div>
      </div>
    </div>
  );
}
