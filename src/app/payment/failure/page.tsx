"use client";

import { useEffect } from "react";
import { XCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PaymentFailurePage() {
  // If this rendered inside the Pine Labs iframe, break out and redirect the top window
  useEffect(() => {
    if (window.top !== window.self) {
      window.top!.location.href = window.location.href;
    }
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-red-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative gradient blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-20 bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-red-600 via-rose-900 to-transparent blur-3xl rounded-full pointer-events-none" />

      <div className="w-full max-w-md animate-in slide-in-from-bottom-8 duration-700 fade-in relative z-10">
        <Card className="border-0 shadow-2xl shadow-red-900/20 bg-slate-900/80 backdrop-blur-xl rounded-3xl overflow-hidden ring-1 ring-white/10">
          <div className="bg-gradient-to-r from-red-500 to-red-600 h-2 w-full" />
          <CardContent className="pt-12 pb-10 px-8 text-center space-y-8">
            
            <div className="flex justify-center animate-in zoom-in-50 duration-700 delay-150">
              <div className="w-24 h-24 bg-gradient-to-br from-red-900/20 to-slate-900 rounded-2xl shadow-inner border border-red-500/30 flex items-center justify-center relative -rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="absolute inset-0 bg-red-500 rounded-2xl animate-ping opacity-20" />
                <XCircle className="w-12 h-12 text-red-500" />
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-400">Payment Failed</h1>
              <p className="text-slate-400 text-[15px] leading-relaxed font-medium">
                Your transaction could not be processed completely.
              </p>
            </div>

            <div className="p-5 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/5 shadow-inner flex flex-col gap-2 relative overflow-hidden text-left mb-8 group">
               <AlertTriangle className="absolute -right-4 -bottom-4 w-28 h-28 text-white/5 opacity-50 group-hover:scale-110 transition-transform duration-700" />
               <div className="relative z-10 font-mono space-y-1.5">
                 <div className="text-[11px] text-slate-500 uppercase font-bold tracking-widest">Transaction Status</div>
                 <div className="text-lg flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/> <span className="text-red-500 font-bold tracking-tight">FAILED / TIMEOUT</span></div>
               </div>
            </div>

            <Button 
               onClick={() => window.location.href = "/"}
               className="w-full text-lg font-bold h-14 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 shadow-xl shadow-black/50 text-white group rounded-xl border-0 ring-1 ring-white/10"
            >
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
              Retry Payment
            </Button>
            
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
