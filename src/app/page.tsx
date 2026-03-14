"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowRight, ShieldCheck, Lock, Sparkles, Activity, AlertTriangle, CheckCircle2, Wallet, SmartphoneNfc } from 'lucide-react';
import { useState, useEffect } from 'react';
import RecoveryModal from '@/components/checkout/RecoveryModal';

type PaymentMethod = 'hdfc' | 'gpay' | 'amazon_pay';

interface NetworkHealth {
  status: 'scanning' | 'optimal' | 'good' | 'risk';
  message: string;
}

export default function CheckoutPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [smartTender, setSmartTender] = useState<{thought_process: string, top_suggestion: string, rationale: string} | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // New Agentic Feature: Live Network Scanner
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>('hdfc');
  const [networkHealth, setNetworkHealth] = useState<NetworkHealth>({ status: 'scanning', message: 'Agent analyzing routing tables...' });

  const cartTotal = 4500;

  useEffect(() => {
    fetch('/api/bedrock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'smart_tender', cartTotal: '₹4,500' })
    })
    .then(res => res.json())
    .then(data => {
      setTimeout(() => setSmartTender(data), 800)
    })
    .catch(console.error);
  }, []);

  // Network Scanner Logic
  useEffect(() => {
    setNetworkHealth({ status: 'scanning', message: 'Agent analyzing routing tables...' });
    
    const scanTimer = setTimeout(() => {
      if (activeMethod === 'hdfc') {
        setNetworkHealth({ status: 'risk', message: '⚠️ 45% Failure Risk: Bank timeout detected on routing table. Agent recommends switching.' });
      } else if (activeMethod === 'gpay') {
        setNetworkHealth({ status: 'optimal', message: '✅ 99.8% Success Probability: Optimal Network Health detected.' });
      } else {
        setNetworkHealth({ status: 'good', message: '✅ 98% Success Probability: Standard Routing.' });
      }
    }, 1200);

    return () => clearTimeout(scanTimer);
  }, [activeMethod]);
  
  const handlePayment = async () => {
    setPaymentError(null);

    // HDFC card: triggers the AI Recovery Agent demo (simulates a failure)
    if (activeMethod === 'hdfc') {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setShowRecovery(true);
      }, 2000);
      return;
    }

    // For Google Pay / Amazon Pay — call the real Pine Labs Hosted Checkout API
    setPaymentLoading(true);
    try {
      const res = await fetch('/api/pine-labs/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: cartTotal,
          customerName: 'Hackathon Tester',
          customerEmail: 'test@pinelabs.demo',
          customerPhone: '9999999999',
          description: 'AI Checkout Optimizer — Pine Labs Hackathon',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.redirect_url) {
        throw new Error(data.details || data.error || 'Failed to create order');
      }

      // Redirect to Pine Labs Hosted Checkout page
      window.location.href = data.redirect_url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment initiation failed.';
      setPaymentError(msg);
      setPaymentLoading(false);
    }
  };

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
                  {/* HDFC Credit Card Option */}
                  <div 
                    onClick={() => setActiveMethod('hdfc')}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        activeMethod === 'hdfc' ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        <CreditCard className={`w-5 h-5 ${activeMethod === 'hdfc' ? 'text-brand-600' : 'text-slate-400'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-slate-900">HDFC Bank Credit Card</h4>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">**** **** **** 4921</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${activeMethod === 'hdfc' ? 'border-brand-600' : 'border-slate-300'}`}>
                          {activeMethod === 'hdfc' && <div className="w-2.5 h-2.5 rounded-full bg-brand-600" />}
                      </div>
                    </div>
                  </div>

                  {/* Google Pay Option */}
                  <div 
                    onClick={() => setActiveMethod('gpay')}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        activeMethod === 'gpay' ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        <SmartphoneNfc className={`w-5 h-5 ${activeMethod === 'gpay' ? 'text-brand-600' : 'text-slate-400'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-slate-900">Google Pay (UPI)</h4>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">user@okicici</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${activeMethod === 'gpay' ? 'border-brand-600' : 'border-slate-300'}`}>
                          {activeMethod === 'gpay' && <div className="w-2.5 h-2.5 rounded-full bg-brand-600" />}
                      </div>
                    </div>
                  </div>

                  {/* Amazon Pay Option */}
                  <div 
                    onClick={() => setActiveMethod('amazon_pay')}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        activeMethod === 'amazon_pay' ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        <Wallet className={`w-5 h-5 ${activeMethod === 'amazon_pay' ? 'text-brand-600' : 'text-slate-400'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-slate-900">Amazon Pay Wallet</h4>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">Balance: ₹8,200</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${activeMethod === 'amazon_pay' ? 'border-brand-600' : 'border-slate-300'}`}>
                          {activeMethod === 'amazon_pay' && <div className="w-2.5 h-2.5 rounded-full bg-brand-600" />}
                      </div>
                    </div>
                  </div>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t rounded-b-xl flex flex-col items-start p-4">
                  <div className="flex items-center gap-2 mb-2 w-full">
                     <Activity className="w-4 h-4 text-brand-500" />
                     <h4 className="font-semibold text-sm text-slate-900">Live AI Network Radar</h4>
                     {networkHealth.status === 'scanning' && <span className="ml-auto text-xs text-brand-600 animate-pulse font-mono">SCANNING...</span>}
                  </div>
                  
                  <div className={`w-full p-3 rounded-lg border text-sm font-medium transition-colors duration-300 flex items-start gap-2 ${
                      networkHealth.status === 'scanning' ? 'bg-slate-100 border-slate-200 text-slate-500' :
                      networkHealth.status === 'risk' ? 'bg-error-50 border-error-200 text-error-700' :
                      networkHealth.status === 'optimal' ? 'bg-success-50 border-success-200 text-success-700' :
                      'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}>
                      {networkHealth.status === 'risk' && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                      {networkHealth.status === 'optimal' && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                      {networkHealth.status === 'good' && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                      
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
                  <span className="font-medium">₹{cartTotal}</span>
                </div>
                
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>₹{cartTotal}</span>
                </div>

                {smartTender ? (
                  <div className="mt-4 p-4 bg-brand-50 border border-brand-100 rounded-xl space-y-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                      <Sparkles className="w-16 h-16 text-brand-600" />
                    </div>
                    <div className="flex items-center gap-2 text-brand-700 font-semibold text-sm">
                      <Sparkles className="w-4 h-4" />
                      AI Smart Tender Route
                    </div>
                    <p className="text-xs text-slate-600 font-mono mb-2">
                       [Agent]: {smartTender.thought_process}
                    </p>
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
                      activeMethod === 'hdfc' 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                  onClick={handlePayment}
                  disabled={isProcessing || paymentLoading || networkHealth.status === 'scanning'}
                >
                  {isProcessing ? 'Simulating failure...' : 
                   paymentLoading ? 'Creating Pine Labs Order...' : (
                      activeMethod === 'hdfc' ? 'Pay Anyway (High Risk)' : 'Pay ₹4,500 via Pine Labs'
                  )}
                  {!isProcessing && !paymentLoading && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
                </Button>
                <p className="text-xs text-center text-slate-500 mt-2">
                  🔒 Secured by Pine Labs Online
                </p>
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
        />
      )}
    </div>
  );
}
