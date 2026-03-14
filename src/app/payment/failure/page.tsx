"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { XCircle, ArrowLeft, RefreshCcw } from 'lucide-react';
import Link from 'next/link';

export default function PaymentFailurePage() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-6">
      <div
        className={`max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center transition-all duration-700 ${
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Failure Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Failed</h1>
        <p className="text-slate-500 mb-6">Your Pine Labs transaction could not be completed.</p>

        {/* Transaction Details */}
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 text-left space-y-3 mb-8">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Status</span>
            <span className="text-red-500 font-semibold">FAILED</span>
          </div>
          {ref && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Order Reference</span>
              <span className="font-mono text-xs text-slate-700 font-medium">{ref}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Next Step</span>
            <span className="text-slate-700 font-medium">Try alternate method</span>
          </div>
        </div>

        <p className="text-sm text-slate-500 mb-6">
          💡 The AI Recovery Agent can automatically route your payment to a higher-success channel.
        </p>

        <div className="flex flex-col gap-3">
          <Link href="/">
            <button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium h-12 rounded-xl flex items-center justify-center gap-2 transition-colors group">
              <RefreshCcw className="w-4 h-4" />
              Retry with AI Recovery Agent
            </button>
          </Link>
          <Link href="/">
            <button className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium h-12 rounded-xl flex items-center justify-center gap-2 transition-colors group">
              <ArrowLeft className="w-4 h-4" />
              Go Back to Store
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
