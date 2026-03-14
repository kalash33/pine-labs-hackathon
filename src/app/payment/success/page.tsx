"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const orderId = searchParams.get('order_id');
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Brief animation delay for a polished feel
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-6">
      <div
        className={`max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center transition-all duration-700 ${
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h1>
        <p className="text-slate-500 mb-6">Your transaction has been completed via Pine Labs.</p>

        {/* Transaction Details */}
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 text-left space-y-3 mb-8">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Status</span>
            <span className="text-emerald-600 font-semibold">SUCCESS</span>
          </div>
          {ref && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Order Reference</span>
              <span className="font-mono text-xs text-slate-700 font-medium">{ref}</span>
            </div>
          )}
          {orderId && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Pine Labs Order ID</span>
              <span className="font-mono text-xs text-slate-700 font-medium">{orderId}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Powered By</span>
            <span className="font-medium text-slate-800">Pine Labs Online</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-6">
          <ShieldCheck className="w-3.5 h-3.5" />
          Secured by Pine Labs Payment Gateway
        </div>

        <Link href="/">
          <button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium h-12 rounded-xl flex items-center justify-center gap-2 transition-colors group">
            Return to Store
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </Link>
      </div>
    </div>
  );
}
