"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowRight, ShieldCheck, Lock, Sparkles, Activity, AlertTriangle, CheckCircle2, Wallet, SmartphoneNfc, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import RecoveryModal from '@/components/checkout/RecoveryModal';

type PaymentMethod = 'card' | 'upi' | 'wallet';

interface NetworkHealth {
  status: 'scanning' | 'optimal' | 'good' | 'risk';
  message: string;
}

// UAT test card definitions
const TEST_CARDS = [
  { label: '✅ Success', number: '4012001037141112', expiry: '12/26', cvv: '123', hint: 'Simulates a successful payment' },
  { label: '❌ Decline', number: '4000000000000002', expiry: '12/26', cvv: '123', hint: 'Card declined → triggers AI Recovery Agent' },
  { label: '❌ Insuf. Funds', number: '4000000000009995', expiry: '12/26', cvv: '123', hint: 'Insufficient funds → AI suggests EMI' },
];

// Cards that should trigger failure simulation
const FAIL_CARD_PREFIXES = ['4000000000000002', '4000000000009995'];

function formatCardNumber(val: string) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(val: string) {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

function detectCardNetwork(num: string): string {
  const n = num.replace(/\s/g, '');
  if (n.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (n.startsWith('6')) return 'RuPay';
  return '';
}

export default function CheckoutPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryErrorCode, setRecoveryErrorCode] = useState<string>('504_BANK_TIMEOUT');
  const [smartTender, setSmartTender] = useState<{thought_process: string, top_suggestion: string, rationale: string} | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Payment method selection
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>('card');
  const [networkHealth, setNetworkHealth] = useState<NetworkHealth>({ status: 'scanning', message: 'Agent analyzing routing tables...' });

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [showTestCards, setShowTestCards] = useState(false);

  const cartTotal = 4500;
  const cardNetwork = detectCardNetwork(cardNumber);

  // Smart Tender AI on load
  useEffect(() => {
    fetch('/api/bedrock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'smart_tender', cartTotal: '₹4,500' })
    })
    .then(res => res.json())
    .then(data => setTimeout(() => setSmartTender(data), 800))
    .catch(console.error);
  }, []);

  // Live AI Network Radar — scans when method changes
  useEffect(() => {
    setNetworkHealth({ status: 'scanning', message: 'Agent analyzing routing tables...' });
    const scanTimer = setTimeout(() => {
      // For card method, also check if the entered card is a failure test card
      const rawCard = cardNumber.replace(/\s/g, '');
      const isFailCard = activeMethod === 'card' && FAIL_CARD_PREFIXES.some(p => rawCard.startsWith(p.slice(0, 8)));

      if (activeMethod === 'card' && isFailCard) {
        setNetworkHealth({ status: 'risk', message: '⚠️ 47% Failure Risk: High decline rate detected for this card BIN. Agent recommends switching payment method.' });
      } else if (activeMethod === 'card') {
        setNetworkHealth({ status: 'optimal', message: '✅ 98.2% Success Probability: Card network is healthy, routing optimal.' });
      } else if (activeMethod === 'upi') {
        setNetworkHealth({ status: 'optimal', message: '✅ 99.8% Success Probability: UPI rails are live. Optimal health detected.' });
      } else {
        setNetworkHealth({ status: 'good', message: '✅ 98% Success Probability: Wallet balance verified. Standard routing.' });
      }
    }, 1200);
    return () => clearTimeout(scanTimer);
  }, [activeMethod, cardNumber]);

  const handlePayment = async () => {
    setPaymentError(null);

    // If card method — check whether the card number is a failure test card
    if (activeMethod === 'card') {
      const rawCard = cardNumber.replace(/\s/g, '');
      const isInsufficientFunds = rawCard.startsWith('40000000000099');
      const isDeclined = rawCard.startsWith('40000000000000');

      if (isDeclined || isInsufficientFunds) {
        // Trigger AI Recovery Agent simulation
        setIsProcessing(true);
        setRecoveryErrorCode(isInsufficientFunds ? 'INSUFFICIENT_FUNDS' : 'CARD_DECLINED');
        setTimeout(() => {
          setIsProcessing(false);
          setShowRecovery(true);
        }, 2000);
        return;
      }

      // Success card → go to Pine Labs hosted checkout
    }

    // For all non-failure card / UPI / wallet → call real Pine Labs API
    setPaymentLoading(true);
    try {
      const res = await fetch('/api/pine-labs/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: cartTotal,
          customerName: cardName || 'Demo Customer',
          customerEmail: 'test@pinelabs.demo',
          customerPhone: '9999999999',
          description: 'AI Checkout Optimizer — Pine Labs Hackathon',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.redirect_url) {
        throw new Error(data.details || data.error || 'Failed to create order');
      }

      window.location.href = data.redirect_url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment initiation failed.';
      setPaymentError(msg);
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

  const isCardFormValid = activeMethod !== 'card' || (
    cardNumber.replace(/\s/g, '').length === 16 &&
    cardExpiry.length === 5 &&
    cardCvv.length >= 3 &&
    cardName.trim().length > 0
  );

  const isFailureCard = (() => {
    const raw = cardNumber.replace(/\s/g, '');
    return FAIL_CARD_PREFIXES.some(p => raw.startsWith(p.slice(0, 8)));
  })();

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Checkout</h1>
            <p className="text-slate-500 mt-2">Pine Labs Secure Payment Gateway</p>
          </div>
          <ShieldCheck className="w-8 h-8 text-brand-600" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Checkout Col */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Payment Method</CardTitle>
                <CardDescription>Select your preferred way to pay</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* ── Method Tabs ── */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                  {([
                    { id: 'card', label: 'Card', icon: <CreditCard className="w-4 h-4" /> },
                    { id: 'upi', label: 'UPI', icon: <SmartphoneNfc className="w-4 h-4" /> },
                    { id: 'wallet', label: 'Wallet', icon: <Wallet className="w-4 h-4" /> },
                  ] as const).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveMethod(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        activeMethod === tab.id
                          ? 'bg-white text-brand-700 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                {/* ── Card Form ── */}
                {activeMethod === 'card' && (
                  <div className="space-y-3">
                    {/* Test card quick-fill */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">Enter card details below</p>
                      <button
                        onClick={() => setShowTestCards(!showTestCards)}
                        className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium"
                      >
                        <Zap className="w-3 h-3" />
                        UAT Test Cards
                      </button>
                    </div>

                    {showTestCards && (
                      <div className="border border-brand-100 rounded-xl overflow-hidden bg-brand-50">
                        <div className="px-3 py-2 border-b border-brand-100 text-xs font-semibold text-brand-700 flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Quick Fill — UAT Test Cards
                        </div>
                        {TEST_CARDS.map((card, i) => (
                          <button
                            key={i}
                            onClick={() => fillTestCard(card)}
                            className="w-full text-left px-3 py-2.5 hover:bg-brand-100 transition-colors border-b border-brand-100 last:border-0"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-800">{card.label}</span>
                              <span className="text-xs font-mono text-slate-500">{card.number.slice(0,4)} **** **** {card.number.slice(-4)}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">{card.hint}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Card Number */}
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                        className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 pr-20"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        {cardNetwork && <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{cardNetwork}</span>}
                      </div>
                    </div>

                    {/* Name */}
                    <input
                      type="text"
                      placeholder="Name on card"
                      value={cardName}
                      onChange={e => setCardName(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />

                    {/* Expiry + CVV */}
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                        className="border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <div className="relative">
                        <input
                          type="password"
                          placeholder="CVV"
                          value={cardCvv}
                          onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                      </div>
                    </div>

                    {isFailureCard && (
                      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>This UAT test card will simulate a payment failure and trigger the AI Recovery Agent.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ── UPI Form ── */}
                {activeMethod === 'upi' && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Enter UPI ID (e.g. name@upi)"
                      className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <p className="text-xs text-slate-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> Supports all UPI apps — GPay, PhonePe, Paytm, BHIM</p>
                  </div>
                )}

                {/* ── Wallet Form ── */}
                {activeMethod === 'wallet' && (
                  <div className="grid grid-cols-2 gap-3">
                    {['Amazon Pay', 'Paytm', 'PhonePe', 'MobiKwik'].map(w => (
                      <div key={w} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:border-brand-400 cursor-pointer transition-colors">
                        <Wallet className="w-5 h-5 text-brand-500" />
                        <span className="text-sm font-medium text-slate-800">{w}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>

              <CardFooter className="bg-slate-50 border-t rounded-b-xl flex flex-col items-start p-4">
                <div className="flex items-center gap-2 mb-2 w-full">
                  <Activity className="w-4 h-4 text-brand-500" />
                  <h4 className="font-semibold text-sm text-slate-900">Live AI Network Radar</h4>
                  {networkHealth.status === 'scanning' && <span className="ml-auto text-xs text-brand-600 animate-pulse font-mono">SCANNING...</span>}
                </div>
                <div className={`w-full p-3 rounded-lg border text-sm font-medium transition-colors duration-300 flex items-start gap-2 ${
                  networkHealth.status === 'scanning' ? 'bg-slate-100 border-slate-200 text-slate-500' :
                  networkHealth.status === 'risk' ? 'bg-red-50 border-red-200 text-red-700' :
                  networkHealth.status === 'optimal' ? 'bg-success-50 border-success-200 text-success-700' :
                  'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  {networkHealth.status === 'risk' && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                  {(networkHealth.status === 'optimal' || networkHealth.status === 'good') && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span>{networkHealth.message}</span>
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Sidebar / Cart Summary */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium">₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>

                {/* Smart Tender AI Widget */}
                {smartTender ? (
                  <div className="mt-4 p-4 bg-brand-50 border border-brand-100 rounded-xl space-y-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                      <Sparkles className="w-16 h-16 text-brand-600" />
                    </div>
                    <div className="flex items-center gap-2 text-brand-700 font-semibold text-sm">
                      <Sparkles className="w-4 h-4" />
                      AI Smart Tender Route
                    </div>
                    <p className="text-xs text-slate-600 font-mono mb-2">[Agent]: {smartTender.thought_process}</p>
                    <div className="bg-white p-3 rounded-lg border border-brand-100 shadow-sm relative z-10">
                      <div className="text-sm font-bold text-slate-900">{smartTender.top_suggestion}</div>
                      <div className="text-xs text-slate-500 mt-1">{smartTender.rationale}</div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-4 border border-slate-100 rounded-xl flex items-center gap-2 text-slate-400 text-sm">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    Agent analyzing optimal routing...
                  </div>
                )}

                {paymentError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 flex items-start gap-2">
                    <span className="font-semibold">⚠️ Error:</span> {paymentError}
                  </div>
                )}

                <Button
                  className={`w-full mt-4 h-12 text-lg group transition-colors duration-300 ${
                    isFailureCard && activeMethod === 'card'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                  onClick={handlePayment}
                  disabled={isProcessing || paymentLoading || networkHealth.status === 'scanning' || !isCardFormValid}
                >
                  {isProcessing ? 'Simulating failure...' :
                   paymentLoading ? 'Creating Pine Labs Order...' :
                   isFailureCard && activeMethod === 'card' ? 'Pay Anyway (High Risk)' :
                   `Pay ₹${cartTotal.toLocaleString('en-IN')} via Pine Labs`}
                  {!isProcessing && !paymentLoading && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
                </Button>
                <p className="text-xs text-center text-slate-500 mt-2">🔒 Secured by Pine Labs Online</p>
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
    </div>
  );
}
