"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CreditCard, ArrowRight, ShieldCheck, Lock, Sparkles, Activity,
  AlertTriangle, CheckCircle2, Wallet, SmartphoneNfc, Zap, ExternalLink,
  Brain, ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import RecoveryModal from '@/components/checkout/RecoveryModal';
import PineLabsIframe from '@/components/checkout/PineLabsIframe';
import Link from 'next/link';

type PaymentMethod = 'card' | 'upi' | 'wallet';

interface NetworkHealth {
  status: 'scanning' | 'optimal' | 'good' | 'risk';
  message: string;
}

const TEST_CARDS = [
  // ── Standard UAT cards ──────────────────────────────────────────────────────
  { label: '✅ Success (HDFC)', number: '4012001037141112', expiry: '12/26', cvv: '123', hint: 'HDFC Visa · Bank healthy · Simulates successful 3DS payment' },
  { label: '❌ Decline', number: '4000000000000002', expiry: '12/26', cvv: '123', hint: 'Card declined → triggers AI Recovery Agent' },
  { label: '❌ Insuf. Funds', number: '4000000000009995', expiry: '12/26', cvv: '123', hint: 'Insufficient funds → AI suggests EMI' },
  // ── Bank health demo cards ──────────────────────────────────────────────────
  { label: '🔴 SBI — Outage', number: '1000010000000001', expiry: '12/26', cvv: '123', hint: 'State Bank of India · Bank DOWN → AI warns to use UPI or different card' },
  { label: '🔴 Federal Bank — Outage', number: '1000030000000001', expiry: '12/26', cvv: '123', hint: 'Federal Bank · Bank DOWN → AI recommends switching payment method' },
  { label: '🟡 Yes Bank — Degraded', number: '1000300000000001', expiry: '12/26', cvv: '123', hint: 'Yes Bank · Intermittent issues (58% success) → AI warns high failure risk' },
  { label: '🟡 Punjab National — Degraded', number: '5081600000000000', expiry: '12/26', cvv: '123', hint: 'Punjab National Bank · Degraded → AI suggests UPI or HDFC/ICICI card' },
];

const FAIL_CARD_PREFIXES = ['4000000000000002', '4000000000009995'];

function formatCardNumber(val: string) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}
function detectCardNetwork(num: string): { name: string; color: string } {
  const n = num.replace(/\s/g, '');
  if (n.startsWith('4')) return { name: 'Visa', color: '#1a1f71' };
  if (/^5[1-5]/.test(n)) return { name: 'Mastercard', color: '#eb001b' };
  if (/^3[47]/.test(n)) return { name: 'Amex', color: '#007bc1' };
  if (n.startsWith('6')) return { name: 'RuPay', color: '#f97316' };
  return { name: '', color: '' };
}

export default function CheckoutPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryErrorCode, setRecoveryErrorCode] = useState<string>('504_BANK_TIMEOUT');
  const [smartTender, setSmartTender] = useState<{ thought_process: string; top_suggestion: string; rationale: string; savings?: string } | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [activeMethod, setActiveMethod] = useState<PaymentMethod | null>(null);
  const [networkHealth, setNetworkHealth] = useState<NetworkHealth>({ status: 'scanning', message: 'Agent analyzing routing tables...' });
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [showTestCards, setShowTestCards] = useState(false);
  const [upiId, setUpiId] = useState('');

  // BIN lookup + AI bank health state
  const [binInfo, setBinInfo] = useState<{
    found: boolean; issuer?: string; brand?: string; type?: string;
    bankHealth: 'online' | 'degraded' | 'down';
    bankHealthMessage: string; successProbability: number;
  } | null>(null);
  const [bankWarning, setBankWarning] = useState<{
    recommendation: string; alternatives: string[]; rationale: string;
    risk_level: string;
  } | null>(null);
  const [binLoading, setBinLoading] = useState(false);

  // Pine Labs iframe state (used for wallet)
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [iframeMethodLabel, setIframeMethodLabel] = useState('');

  const cartTotal = 4500;
  const cardNet = detectCardNetwork(cardNumber);

  useEffect(() => {
    fetch('/api/bedrock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'smart_tender', cartTotal: '₹4,500' }),
    })
      .then(r => r.json())
      .then(d => setTimeout(() => setSmartTender(d), 600))
      .catch(console.error);
  }, []);

  // BIN lookup — fires when card number reaches 6+ digits
  useEffect(() => {
    const raw = cardNumber.replace(/\s/g, '');
    if (activeMethod !== 'card' || raw.length < 6) {
      setBinInfo(null);
      setBankWarning(null);
      return;
    }
    const bin = raw.slice(0, 6);
    let cancelled = false;
    const timer = setTimeout(async () => {
      setBinLoading(true);
      try {
        const res = await fetch('/api/pine-labs/bin-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardNumber: bin }),
        });
        const data = await res.json();
        if (cancelled) return;
        setBinInfo(data);
        // Only call AI if bank is degraded or down
        if (data.bankHealth !== 'online' && data.issuer) {
          const aiRes = await fetch('/api/bedrock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'bank_health_check',
              issuer: data.issuer,
              bankHealth: data.bankHealth,
              successProbability: data.successProbability,
              cartTotal: `₹${cartTotal.toLocaleString('en-IN')}`,
              bin,
            }),
          });
          const aiData = await aiRes.json();
          if (!cancelled) setBankWarning(aiData);
        } else {
          setBankWarning(null);
        }
      } catch { /* silent */ } finally {
        if (!cancelled) setBinLoading(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [cardNumber, activeMethod, cartTotal]);

  useEffect(() => {
    setNetworkHealth({ status: 'scanning', message: 'Agent analyzing routing tables...' });
    const t = setTimeout(() => {
      const raw = cardNumber.replace(/\s/g, '');
      const isFailCard = activeMethod === 'card' && FAIL_CARD_PREFIXES.some(p => raw.startsWith(p.slice(0, 8)));
      if (!activeMethod) {
        setNetworkHealth({ status: 'scanning', message: 'Select a payment method to activate AI radar...' });
      } else if (isFailCard) {
        setNetworkHealth({ status: 'risk', message: '⚠️ 47% Failure Risk: High decline rate detected for this card BIN. Agent recommends switching payment method.' });
      } else if (activeMethod === 'card') {
        setNetworkHealth({ status: 'optimal', message: '✅ 98.2% Success Probability: Card network healthy, routing optimal.' });
      } else if (activeMethod === 'upi') {
        setNetworkHealth({ status: 'optimal', message: '✅ 99.8% Success Probability: UPI rails live. Optimal health detected.' });
      } else {
        setNetworkHealth({ status: 'good', message: '✅ 98% Success Probability: Wallet balance verified. Standard routing.' });
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [activeMethod, cardNumber]);

  const handlePayment = async () => {
    setPaymentError(null);

    // ── Failure simulation for card / UPI ────────────────────────────────────
    if (activeMethod === 'card') {
      const raw = cardNumber.replace(/\s/g, '');
      const isInsuf = raw.startsWith('40000000000099');
      const isDeclined = raw.startsWith('40000000000000');
      if (isDeclined || isInsuf) {
        setIsProcessing(true);
        setRecoveryErrorCode(isInsuf ? 'INSUFFICIENT_FUNDS' : 'CARD_DECLINED');
        setTimeout(() => { setIsProcessing(false); setShowRecovery(true); }, 2000);
        return;
      }
    } else if (activeMethod === 'upi') {
      if (upiId === 'fail@upi') {
        setIsProcessing(true);
        setRecoveryErrorCode('UPI_TIMEOUT');
        setTimeout(() => { setIsProcessing(false); setShowRecovery(true); }, 2000);
        return;
      }
    }

    // ── Wallet → Pine Labs IFRAME ─────────────────────────────────────────────
    if (activeMethod === 'wallet') {
      setPaymentLoading(true);
      try {
        const res = await fetch('/api/pine-labs/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: cartTotal,
            customerName: 'Demo Customer',
            customerEmail: 'test@pinelabs.demo',
            customerPhone: '9999999999',
            description: 'AI Checkout Optimizer — Pine Labs Hackathon',
            activeMethod,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.details || data.error || 'Failed to create order');

        // Pine Labs returns redirect_url for IFRAME mode
        const url = data.redirect_url;
        if (!url) throw new Error('Pine Labs did not return a redirect_url for iframe');

        const label = activeMethod === 'wallet' ? 'Wallet' : 'Net Banking';
        setIframeMethodLabel(label);
        setIframeUrl(url);
      } catch (err) {
        setPaymentError(err instanceof Error ? err.message : 'Failed to open payment page.');
      } finally {
        setPaymentLoading(false);
      }
      return;
    }

    // ── Card & UPI → Pine Labs Seamless API ───────────────────────────────────
    setPaymentLoading(true);
    try {
      const res = await fetch('/api/pine-labs/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: cartTotal,
          customerName: cardName || 'Demo Customer',
          customerEmail: 'test@pinelabs.demo',
          customerPhone: '9999999999',
          description: 'AI Checkout Optimizer — Pine Labs Hackathon',
          activeMethod,
          upiId: activeMethod === 'upi' ? upiId : undefined,
          cardDetails: activeMethod === 'card' ? {
            name: cardName,
            cardNumber: cardNumber.replace(/\s/g, ''),
            cvv: cardCvv,
            expiryMonth: cardExpiry.split('/')[0],
            expiryYear: '20' + cardExpiry.split('/')[1],
          } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.challenge_url) throw new Error(data.details || data.error || 'Failed to create payment');
      window.location.href = data.challenge_url;
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Payment initiation failed.');
      setPaymentLoading(false);
    }
  };

  const fillTestCard = (card: typeof TEST_CARDS[0]) => {
    setCardNumber(formatCardNumber(card.number));
    setCardExpiry(card.expiry);
    setCardCvv(card.cvv);
    setCardName('Test User');
    setShowTestCards(false);
  };

  const isCardFormValid = activeMethod === 'card'
    ? cardNumber.length > 14 && cardExpiry.length === 5 && cardCvv.length >= 3 && cardName.length > 2
    : activeMethod === 'upi'
      ? upiId.trim().length > 3 && upiId.includes('@')
      : activeMethod === 'wallet'
        ? true  // Pine Labs iframe handles selection — no pre-selection needed
        : false;

  const isFailureCard = FAIL_CARD_PREFIXES.some(p => cardNumber.replace(/\s/g, '').startsWith(p.slice(0, 8)));

  return (
    <div className="min-h-screen bg-[#080810] text-slate-200 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] opacity-10 bg-[radial-gradient(circle,_#6366f1,_transparent_60%)] blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[300px] opacity-5 bg-[radial-gradient(circle,_#8b5cf6,_transparent_60%)] blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="border-b border-white/5 bg-[#0c0c18]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-white">AI Checkout</span>
              <span className="text-[10px] text-white/30 ml-2 font-mono">Pine Labs UAT</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/merchant" className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
              <Brain className="w-3.5 h-3.5" /> Merchant Dashboard
            </Link>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Secured by Pine Labs
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10 relative z-10">
        {/* Page Title */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Secure Checkout</h1>
          <p className="text-slate-400 text-sm">AI-powered payment routing · Pine Labs Seamless API</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Left: Payment Form ── */}
          <div className="lg:col-span-3 space-y-4">

            {/* Method Selector */}
            <Card className="border-0 bg-[#0c0c18] ring-1 ring-white/8 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
              <CardHeader className="pb-3 border-b border-white/5 bg-[#0c0c18]">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-5">
                {/* Tabs */}
                <div className="flex gap-1.5 p-1.5 bg-black/40 rounded-xl ring-1 ring-white/5">
                  {([
                    { id: 'card', label: 'Card', icon: <CreditCard className="w-3.5 h-3.5" /> },
                    { id: 'upi', label: 'UPI', icon: <SmartphoneNfc className="w-3.5 h-3.5" /> },
                    { id: 'wallet', label: 'Wallet', icon: <Wallet className="w-3.5 h-3.5" /> },
                  ] as const).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveMethod(tab.id)}
                      disabled={paymentLoading}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        activeMethod === tab.id
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      } disabled:opacity-50`}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                {/* Loading */}
                {paymentLoading && (
                  <div className="py-10 flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    <p className="text-sm text-slate-400 animate-pulse">Connecting to Pine Labs...</p>
                  </div>
                )}

                {/* No method selected */}
                {!activeMethod && !paymentLoading && (
                  <div className="py-10 flex flex-col items-center text-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-1">
                      <ShieldCheck className="w-6 h-6 text-slate-600" />
                    </div>
                    <p className="text-slate-300 font-medium text-sm">Select a payment method above</p>
                    <p className="text-slate-500 text-xs">Your payment is secured by Pine Labs PCI-DSS infrastructure</p>
                  </div>
                )}

                {/* Card Form */}
                {!paymentLoading && activeMethod === 'card' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">Enter card details</p>
                      <button
                        onClick={() => setShowTestCards(!showTestCards)}
                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 transition-colors"
                      >
                        <Zap className="w-3 h-3" /> UAT Test Cards
                      </button>
                    </div>

                    {showTestCards && (
                      <div className="rounded-xl overflow-hidden border border-white/8 bg-[#0a0a14]">
                        <div className="px-3 py-2 border-b border-white/5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Zap className="w-3 h-3" /> Quick Fill — UAT Test Cards
                        </div>
                        {TEST_CARDS.map((card, i) => (
                          <button key={i} onClick={() => fillTestCard(card)}
                            className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">{card.label}</span>
                              <span className="text-[10px] font-mono text-slate-500 bg-black/40 px-2 py-0.5 rounded border border-white/5">
                                {card.number.slice(0, 4)} •••• {card.number.slice(-4)}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1">{card.hint}</p>
                          </button>
                        ))}
                          </div>
                        )}

                    {/* Card Number */}
                    <div className="relative">
                      <input
                        type="text" inputMode="numeric" placeholder="1234 5678 9012 3456"
                        value={cardNumber} onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-white placeholder-slate-600 pr-24"
                      />
                      {cardNet.name && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {cardNet.name}
                        </span>
                      )}
                    </div>

                    <input type="text" placeholder="Name on card" value={cardName} onChange={e => setCardName(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-white placeholder-slate-600" />

                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="MM/YY" value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-white placeholder-slate-600" />
                      <div className="relative">
                        <input type="password" placeholder="CVV" value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-white placeholder-slate-600" />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      </div>
                    </div>

                    {isFailureCard && (
                      <div className="flex items-start gap-2 p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl text-xs text-amber-400">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>This UAT test card will simulate a payment failure and trigger the AI Recovery Agent.</span>
                      </div>
                    )}

                    {/* BIN lookup result */}
                    {binLoading && cardNumber.replace(/\s/g, '').length >= 6 && (
                      <div className="flex items-center gap-2 p-3 bg-white/[0.02] border border-white/8 rounded-xl text-xs text-slate-400">
                        <div className="w-3.5 h-3.5 border border-indigo-500/40 border-t-indigo-400 rounded-full animate-spin shrink-0" />
                        <span>AI scanning bank health for BIN {cardNumber.replace(/\s/g, '').slice(0, 6)}...</span>
                      </div>
                    )}

                    {/* Bank identified — healthy */}
                    {!binLoading && binInfo?.found && binInfo.bankHealth === 'online' && (
                      <div className="flex items-center gap-2 p-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl text-xs text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>
                          <span className="font-semibold">{binInfo.issuer}</span>
                          {binInfo.type && <span className="text-emerald-500/70"> · {binInfo.type}</span>}
                          {' '}— Network healthy · {binInfo.successProbability}% success rate
                        </span>
                      </div>
                    )}

                    {/* AI Bank Health Warning */}
                    {!binLoading && bankWarning && binInfo && binInfo.bankHealth !== 'online' && (
                      <div className={`p-3.5 rounded-xl border space-y-2 ${
                        binInfo.bankHealth === 'down'
                          ? 'bg-red-500/8 border-red-500/25'
                          : 'bg-amber-500/8 border-amber-500/25'
                      }`}>
                        <div className="flex items-start gap-2">
                          <Brain className={`w-4 h-4 shrink-0 mt-0.5 ${binInfo.bankHealth === 'down' ? 'text-red-400' : 'text-amber-400'}`} />
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-bold mb-0.5 ${binInfo.bankHealth === 'down' ? 'text-red-300' : 'text-amber-300'}`}>
                              AI Bank Health Alert · {binInfo.issuer}
                              <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-semibold border ${
                                binInfo.bankHealth === 'down'
                                  ? 'bg-red-500/15 border-red-500/30 text-red-400'
                                  : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                              }`}>
                                {binInfo.bankHealth === 'down' ? 'OUTAGE' : 'DEGRADED'} · {binInfo.successProbability}%
                              </span>
                            </div>
                            <p className={`text-[11px] leading-relaxed ${binInfo.bankHealth === 'down' ? 'text-red-400/80' : 'text-amber-400/80'}`}>
                              {bankWarning.rationale}
                            </p>
                          </div>
                        </div>
                        {bankWarning.alternatives.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="text-[10px] text-slate-500 self-center">Try instead:</span>
                            {bankWarning.alternatives.map((alt, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 font-medium">
                                {alt}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* UPI Form */}
                {!paymentLoading && activeMethod === 'upi' && (
                  <div className="space-y-3">
                    <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi"
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-white placeholder-slate-600" />
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Supports GPay, PhonePe, Paytm, BHIM and all UPI apps
                    </p>
                  </div>
                )}

                {/* Wallet — Pine Labs hosted iframe */}
                {!paymentLoading && activeMethod === 'wallet' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-4 bg-indigo-500/8 border border-indigo-500/20 rounded-xl">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                        <Wallet className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Pine Labs Hosted Wallet Checkout</p>
                        <p className="text-xs text-slate-400 mt-0.5">Click Pay to open the secure Pine Labs checkout. Select your wallet (Amazon Pay, Paytm, PhonePe &amp; more) inside.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      Wallet credentials are entered directly on Pine Labs — we never see them.
                    </div>
                  </div>
                )}

              </CardContent>

              {/* AI Network Radar */}
              <CardFooter className="bg-black/20 border-t border-white/5 p-4 flex flex-col items-start">
                <div className="flex items-center gap-2 mb-2 w-full">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-bold text-white/70">Live AI Network Radar</span>
                  {networkHealth.status === 'scanning' && (
                    <span className="ml-auto text-[10px] font-bold text-indigo-400 animate-pulse font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">SCANNING</span>
                  )}
                </div>
                <div className={`w-full p-3 rounded-xl border text-xs font-medium transition-all duration-500 flex items-start gap-2 ${
                  networkHealth.status === 'scanning' ? 'bg-white/[0.02] border-white/8 text-slate-400' :
                  networkHealth.status === 'risk' ? 'bg-red-500/8 border-red-500/20 text-red-400' :
                  'bg-emerald-500/8 border-emerald-500/20 text-emerald-400'
                }`}>
                  {networkHealth.status === 'risk' && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                  {(networkHealth.status === 'optimal' || networkHealth.status === 'good') && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span className="leading-relaxed">{networkHealth.message}</span>
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="lg:col-span-2">
            <Card className="border-0 bg-[#0c0c18] ring-1 ring-white/8 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 sticky top-20">
              <CardHeader className="pb-3 border-b border-white/5 bg-[#0c0c18]">
                <CardTitle className="text-base text-white">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                {/* Cart Item */}
                <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-lg">
                    🛍️
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">Pine Labs Demo Product</p>
                    <p className="text-xs text-slate-500">Qty: 1</p>
                  </div>
                  <span className="text-sm font-bold text-white">₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="text-white font-medium">₹{cartTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Taxes</span>
                    <span className="text-emerald-400 font-medium">Included</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-white/5">
                    <span className="text-white">Total</span>
                    <span className="text-white">₹{cartTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Smart Tender AI Widget */}
                {smartTender ? (
                  <div className="p-3.5 bg-indigo-500/8 border border-indigo-500/20 rounded-xl space-y-2 relative overflow-hidden">
                    <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Smart Tender
                      {(smartTender as { fallback?: boolean }).fallback === false && (
                        <span className="ml-auto text-[10px] text-emerald-400 font-mono">Real Bedrock ✓</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono bg-black/30 p-1.5 rounded border border-white/5 leading-relaxed">
                      [Agent]: {smartTender.thought_process}
                    </p>
                    <div className="bg-black/30 p-3 rounded-lg border border-indigo-500/20">
                      <div className="text-sm font-bold text-white mb-0.5">{smartTender.top_suggestion}</div>
                      <div className="text-[11px] text-slate-400 leading-relaxed">{smartTender.rationale}</div>
                      {smartTender.savings && (
                        <div className="mt-1.5 text-[11px] font-bold text-emerald-400">Save {smartTender.savings}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 border border-white/8 bg-white/[0.02] rounded-xl flex items-center gap-2 text-slate-500 text-xs">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-500" />
                    AI analyzing optimal payment route...
                  </div>
                )}

                {paymentError && (
                  <div className="p-3 bg-red-500/8 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{paymentError}</span>
                  </div>
                )}

                {/* Pay Button */}
                {!activeMethod ? (
                  <Button className="w-full h-12 text-sm font-bold bg-white/5 text-slate-500 cursor-not-allowed border-0 rounded-xl" disabled>
                    Select a method to pay
                  </Button>
                ) : (
                  <Button
                    className={`w-full h-12 text-sm font-bold group transition-all duration-200 rounded-xl border-0 shadow-lg ${
                      (isFailureCard && activeMethod === 'card') || (activeMethod === 'upi' && upiId === 'fail@upi')
                        ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-red-900/40'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-900/40'
                    }`}
                    onClick={handlePayment}
                    disabled={isProcessing || paymentLoading || networkHealth.status === 'scanning' || !isCardFormValid}
                  >
                    {isProcessing ? 'Simulating failure...' :
                     paymentLoading ? 'Connecting...' :
                     isFailureCard && activeMethod === 'card' ? 'Pay Anyway (High Risk)' :
                     `Pay ₹${cartTotal.toLocaleString('en-IN')} Securely`}
                    {!isProcessing && !paymentLoading && (
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                    )}
                  </Button>
                )}

                <p className="text-[10px] text-center text-slate-600 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" />
                  PCI-DSS secured · Pine Labs Seamless API
                </p>

                {/* Link to merchant dashboard */}
                <Link href="/merchant" className="flex items-center justify-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-400 transition-colors pt-1">
                  <ExternalLink className="w-3 h-3" />
                  View AI Command Center
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {showRecovery && (
        <RecoveryModal
          isOpen={showRecovery}
          onClose={() => setShowRecovery(false)}
          cartTotal={cartTotal}
          errorCode={recoveryErrorCode}
        />
      )}

      {/* Pine Labs hosted iframe — shown for Wallet & Net Banking */}
      {iframeUrl && (
        <PineLabsIframe
          iframeUrl={iframeUrl}
          methodLabel={iframeMethodLabel}
          onClose={() => setIframeUrl(null)}
        />
      )}
    </div>
  );
}
