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
  const [activeMethod, setActiveMethod] = useState<PaymentMethod | null>(null);
  const [networkHealth, setNetworkHealth] = useState<NetworkHealth>({ status: 'scanning', message: 'Agent analyzing routing tables...' });

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [showTestCards, setShowTestCards] = useState(false);
  const [upiId, setUpiId] = useState('');

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

      if (!activeMethod) {
        setNetworkHealth({ status: 'scanning', message: 'Agent awaiting method selection...' });
      } else if (activeMethod === 'card' && isFailCard) {
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
    }

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
          activeMethod: activeMethod,
          upiId: activeMethod === 'upi' ? upiId : undefined,
          cardDetails: activeMethod === 'card' ? {
            name: cardName,
            cardNumber: cardNumber.replace(/\s/g, ''),
            cvv: cardCvv,
            expiryMonth: cardExpiry.split('/')[0],
            expiryYear: '20' + cardExpiry.split('/')[1]
          } : undefined
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.challenge_url) {
        throw new Error(data.details || data.error || 'Failed to create payment challenge');
      }

      // Banks block OTP pages from being rendered in iframes due to security (X-Frame-Options).
      // We must redirect the top-level window.
      window.location.href = data.challenge_url;

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

  const isCardFormValid = activeMethod === 'card' 
    ? cardNumber.length > 14 && cardExpiry.length === 5 && cardCvv.length >= 3 && cardName.length > 2
    : activeMethod === 'upi'
      ? upiId.trim().length > 3 && upiId.includes('@')
      : true; // Wallet returns universally true for mockup

  const isFailureCard = (() => {
    const raw = cardNumber.replace(/\s/g, '');
    return FAIL_CARD_PREFIXES.some(p => raw.startsWith(p.slice(0, 8)));
  })();

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden text-slate-200">
      {/* Decorative gradient blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] opacity-20 bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-brand-600 via-blue-900 to-transparent blur-3xl rounded-full pointer-events-none" />
      
      {/* Main Checkout Area */}
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Secure Checkout</h1>
            <p className="text-slate-400 mt-2 font-medium">Powered by Pine Labs Online</p>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-2xl shadow-sm border border-slate-700/50 backdrop-blur-md">
            <ShieldCheck className="w-8 h-8 text-brand-400" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Checkout Col */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-0 shadow-2xl shadow-black/50 bg-slate-900/60 backdrop-blur-xl rounded-2xl overflow-hidden ring-1 ring-white/10">
              <CardHeader className="pb-4 bg-slate-900/40 border-b border-white/5">
                <CardTitle className="text-xl text-white">Payment Method</CardTitle>
                <CardDescription className="text-slate-400">Select your preferred way to pay</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">

                  <>
                    <div className="flex gap-2 p-1.5 bg-slate-950/80 rounded-xl mb-6 shadow-inner ring-1 ring-white/5">
                      {([
                        { id: 'card', label: 'Card', icon: <CreditCard className="w-4 h-4" /> },
                        { id: 'upi', label: 'UPI', icon: <SmartphoneNfc className="w-4 h-4" /> },
                        { id: 'wallet', label: 'Wallet', icon: <Wallet className="w-4 h-4" /> },
                      ] as const).map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveMethod(tab.id)}
                          disabled={paymentLoading}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                            activeMethod === tab.id
                              ? 'bg-slate-800 text-brand-400 shadow-sm ring-1 ring-white/10 translate-y-0 scale-100'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 scale-95'
                          } disabled:opacity-50`}
                        >
                          {tab.icon} {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Loading State Spinner */}
                    {paymentLoading && (
                      <div className="py-12 flex flex-col items-center justify-center space-y-3">
                        <div className="w-8 h-8 border-4 border-slate-800 border-t-brand-500 rounded-full animate-spin"></div>
                        <p className="text-sm text-slate-400 animate-pulse">Initializing secure Pine Labs checkout...</p>
                      </div>
                    )}

                    {!activeMethod && !paymentLoading && (
                      <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                        <ShieldCheck className="w-12 h-12 text-slate-700 mb-3" />
                        <h3 className="text-slate-300 font-medium">Select a Payment Method</h3>
                        <p className="text-slate-500 text-sm mt-1">Choose an option above to securely enter your payment details.</p>
                      </div>
                    )}

                    {!paymentLoading && activeMethod === 'card' && (
                      <div className="space-y-4">
                        {/* Test card quick-fill */}
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-400">Enter card details below</p>
                          <button
                            onClick={() => setShowTestCards(!showTestCards)}
                            className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-medium bg-brand-500/10 px-2 py-1 rounded-md"
                          >
                            <Zap className="w-3 h-3" />
                            UAT Test Cards
                          </button>
                        </div>

                        {showTestCards && (
                          <div className="border border-brand-500/20 rounded-xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 shadow-sm mb-4">
                            <div className="px-4 py-3 border-b border-white/5 text-xs font-bold text-brand-400 flex items-center gap-1.5 uppercase tracking-wider">
                              <Zap className="w-3.5 h-3.5 text-brand-500" /> Quick Fill — UAT Test Cards
                            </div>
                            {TEST_CARDS.map((card, i) => (
                              <button
                                key={i}
                                onClick={() => fillTestCard(card)}
                                className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-bold text-slate-200 group-hover:text-brand-300 transition-colors">{card.label}</span>
                                  <span className="text-xs font-mono font-medium text-slate-400 bg-slate-950 px-2 py-1 rounded shadow-inner ring-1 ring-white/10">
                                    {card.number.slice(0,4)} •••• •••• {card.number.slice(-4)}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1.5">{card.hint}</p>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Card Number */}
                        <div className="relative group">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="1234 5678 9012 3456"
                            value={cardNumber}
                            onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                            className="w-full bg-slate-950/50 border-2 border-slate-700 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all text-white placeholder-slate-600 pr-20"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                            {cardNetwork && <span className="text-xs font-bold text-brand-300 bg-brand-500/10 px-2.5 py-1 rounded-md ring-1 ring-brand-500/30">{cardNetwork}</span>}
                          </div>
                        </div>

                        {/* Name */}
                        <input
                          type="text"
                          placeholder="Name on card"
                          value={cardName}
                          onChange={e => setCardName(e.target.value)}
                          className="w-full bg-slate-950/50 border-2 border-slate-700 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all text-white placeholder-slate-600"
                        />

                        {/* Expiry + CVV */}
                        <div className="grid grid-cols-2 gap-4">
                          <input
                            type="text"
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                            className="w-full bg-slate-950/50 border-2 border-slate-700 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all text-white placeholder-slate-600"
                          />
                          <div className="relative">
                            <input
                              type="password"
                              placeholder="CVV"
                              value={cardCvv}
                              onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                              className="w-full bg-slate-950/50 border-2 border-slate-700 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all pl-11 text-white placeholder-slate-600"
                            />
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          </div>
                        </div>

                        {isFailureCard && (
                          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>This UAT test card will simulate a payment failure and trigger the AI Recovery Agent.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {!paymentLoading && activeMethod === 'upi' && (
                      <div className="space-y-4">
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="Enter UPI ID (e.g. name@upi)"
                          className="w-full bg-slate-950/50 border-2 border-slate-700 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all text-white placeholder-slate-600"
                        />
                        <p className="text-xs text-slate-400 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Supports all UPI apps — GPay, PhonePe, Paytm, BHIM</p>
                      </div>
                    )}

                    {!paymentLoading && activeMethod === 'wallet' && (
                      <div className="grid grid-cols-2 gap-3">
                        {['Amazon Pay', 'Paytm', 'PhonePe', 'MobiKwik'].map(w => (
                          <div key={w} className="flex items-center gap-3 p-3.5 border-2 border-slate-800 rounded-xl hover:border-brand-500/50 bg-slate-900/50 cursor-pointer transition-all">
                            <Wallet className="w-5 h-5 text-brand-400" />
                            <span className="text-sm font-medium text-slate-200">{w}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
              </CardContent>

              <CardFooter className="bg-slate-900/80 border-t border-white/5 rounded-b-2xl flex flex-col items-start p-5">
                <div className="flex items-center gap-2 mb-3 w-full">
                  <Activity className="w-4 h-4 text-brand-400" />
                  <h4 className="font-bold text-sm tracking-tight text-white">Live AI Network Radar</h4>
                  {networkHealth.status === 'scanning' && <span className="ml-auto text-xs font-bold text-brand-400 animate-pulse font-mono bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">SCANNING...</span>}
                </div>
                <div className={`w-full p-3.5 rounded-xl border text-sm font-semibold transition-all duration-500 shadow-inner flex items-start gap-3 ${
                  networkHealth.status === 'scanning' ? 'bg-slate-800/50 border-slate-700 text-slate-300' :
                  networkHealth.status === 'risk' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                  networkHealth.status === 'optimal' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  'bg-brand-500/10 border-brand-500/20 text-brand-400'
                }`}>
                  {networkHealth.status === 'risk' && <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />}
                  {(networkHealth.status === 'optimal' || networkHealth.status === 'good') && <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />}
                  <span className="leading-relaxed">{networkHealth.message}</span>
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Sidebar / Cart Summary */}
          <div className="md:col-span-1">
            <Card className="border-0 shadow-2xl shadow-black/50 bg-slate-900/60 backdrop-blur-xl rounded-2xl overflow-hidden ring-1 ring-white/10 sticky top-8">
              <CardHeader className="bg-slate-900/40 pb-4 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-white">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="font-medium text-white">₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-3 border-t border-white/5">
                  <span className="text-white">Total</span>
                  <span className="text-white">₹{cartTotal.toLocaleString('en-IN')}</span>
                </div>

                {/* Smart Tender AI Widget */}
                {smartTender ? (
                  <div className="mt-4 p-4 bg-brand-500/10 border border-brand-500/20 rounded-xl space-y-2 relative overflow-hidden backdrop-blur-sm">
                    <div className="absolute top-0 right-0 p-2 opacity-20">
                      <Sparkles className="w-16 h-16 text-brand-400" />
                    </div>
                    <div className="flex items-center gap-2 text-brand-300 font-bold text-sm tracking-wide">
                      <Sparkles className="w-4 h-4" />
                      AI Smart Tender Route
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mb-2 bg-black/40 p-1.5 rounded border border-white/5">[Agent]: {smartTender.thought_process}</p>
                    <div className="bg-slate-900/60 p-3.5 rounded-lg border border-brand-500/30 shadow-inner relative z-10">
                      <div className="text-sm font-bold text-white mb-1 leading-snug">{smartTender.top_suggestion}</div>
                      <div className="text-[11px] text-slate-300 leading-relaxed font-medium">{smartTender.rationale}</div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-4 border border-slate-800 bg-slate-800/30 rounded-xl flex items-center gap-2 text-slate-400 text-sm font-medium">
                    <Sparkles className="w-4 h-4 animate-pulse text-brand-500" />
                    Agent analyzing optimal routing...
                  </div>
                )}

                {paymentError && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 flex items-start gap-2 backdrop-blur-sm">
                    <span className="font-bold">⚠️ Error:</span> {paymentError}
                  </div>
                )}

                {!activeMethod && (
                  <Button
                    className="w-full mt-6 h-14 text-lg font-bold bg-slate-800 text-slate-500 cursor-not-allowed border-0"
                    disabled
                  >
                    Select a Method to Pay ₹{cartTotal.toLocaleString('en-IN')}
                  </Button>
                )}
                
                {activeMethod && (
                  <Button
                    className={`w-full mt-6 h-14 text-lg font-bold group transition-all duration-300 shadow-xl ${
                      isFailureCard && activeMethod === 'card'
                        ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white shadow-red-900/50 border-0 ring-2 ring-red-500/20'
                        : 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white shadow-brand-900/50 border-0 ring-2 ring-brand-500/20'
                    }`}
                    onClick={handlePayment}
                    disabled={isProcessing || paymentLoading || networkHealth.status === 'scanning' || !isCardFormValid}
                  >
                    {isProcessing ? 'Simulating Failure...' :
                     paymentLoading ? 'Connecting Security...' :
                     isFailureCard && activeMethod === 'card' ? 'Pay Anyway (High Risk)' :
                     `Pay ₹${cartTotal.toLocaleString('en-IN')} Securely`}
                    {!isProcessing && !paymentLoading && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 duration-300 transition-transform" />}
                  </Button>
                )}
                <p className="text-[11px] font-medium tracking-wide text-center text-slate-400 mt-4 uppercase">🔒 Secured by Pine Labs Seamless API</p>
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
