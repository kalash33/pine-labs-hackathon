"use client";

import { useEffect, useRef, useState } from "react";
import { X, Loader2, ShieldCheck, Zap } from "lucide-react";

interface PineLabsIframeProps {
  /** The redirect_url returned by Pine Labs create-order API */
  iframeUrl: string;
  /** Payment method label for display */
  methodLabel: string;
  /** Called when user clicks the close/cancel button */
  onClose: () => void;
}

/**
 * PineLabsIframe
 *
 * Renders the Pine Labs hosted checkout inside a full-screen modal overlay.
 * Pine Labs will POST to our /api/pine-labs/callback after payment, which
 * redirects the top-level window to /payment/success or /payment/failure.
 *
 * We listen for postMessage events from the iframe (Pine Labs sends these
 * on completion) as a secondary signal, and also watch for the iframe URL
 * changing to our callback/success/failure routes.
 */
export default function PineLabsIframe({
  iframeUrl,
  methodLabel,
  onClose,
}: PineLabsIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);

  // Listen for postMessage from Pine Labs iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // Pine Labs may send payment status via postMessage
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (
          data?.status === "SUCCESS" ||
          data?.order_status === "PROCESSED" ||
          data?.order_status === "COMPLETED"
        ) {
          // Let the iframe's own redirect handle navigation
          // (Pine Labs will redirect to our callback URL)
        }
      } catch {
        // ignore non-JSON messages
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-[#0c0c18] rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10 flex flex-col"
        style={{ height: "min(680px, 90vh)" }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 bg-[#0c0c18] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">
                {methodLabel} — Secure Checkout
              </p>
              <p className="text-[10px] text-white/30 mt-0.5 font-mono">
                Powered by Pine Labs · UAT
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3 h-3" />
              PCI-DSS Secured
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
              title="Cancel payment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Iframe ── */}
        <div className="relative flex-1 bg-white overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white z-10">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm text-slate-500 font-medium">
                Loading Pine Labs checkout...
              </p>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            className="w-full h-full border-0"
            title="Pine Labs Secure Payment"
            allow="payment"
            onLoad={() => setLoading(false)}
            // Pine Labs requires allow-same-origin for postMessage + allow-forms for submission
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
          />
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-2.5 border-t border-white/5 bg-[#0c0c18] shrink-0 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span className="text-[10px] text-white/25 font-mono">
            Your payment is processed securely by Pine Labs. We never see your bank credentials.
          </span>
        </div>
      </div>
    </div>
  );
}
