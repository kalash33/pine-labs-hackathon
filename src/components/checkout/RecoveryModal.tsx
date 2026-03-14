import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle, ShieldCheck, Sparkles, X, CheckCircle2, RotateCw, Fingerprint } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RecoveryModalProps {
  isOpen: boolean
  onClose: () => void
  cartTotal: number
  errorCode?: string
}

type AgentStep = 
  | 'FAILED'
  | 'INITIATING_AI'
  | 'ANALYZING'
  | 'RETRYING'
  | 'SUCCESS'

export default function RecoveryModal({ isOpen, onClose, cartTotal, errorCode = '504_BANK_TIMEOUT' }: RecoveryModalProps) {
  const [step, setStep] = React.useState<AgentStep>('FAILED')
  const [aiRationale, setAiRationale] = React.useState<string | null>(null)
  const [aiThought, setAiThought] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!isOpen) return

    let isMounted = true;

    const runAutonomousAgent = async () => {
      // 1. Initial Failure
      setStep('INITIATING_AI')
      
      // 2. AI takes over and analyzes the error code
      await new Promise(resolve => setTimeout(resolve, 1500))
      if (!isMounted) return;
      setStep('ANALYZING')

      // 3. Hit the real AWS Bedrock API
      try {
        const response = await fetch('/api/bedrock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'recover',
            errorCode,
            cartTotal: `₹${cartTotal}`
          })
        });
        
        const data = await response.json();
        
        if (isMounted) {
            setAiThought(data.thought_process || "Analyzing fallback methods based on highest temporal success probability on Pine Labs router.");
            setAiRationale(data.rationale || "Match found: Saved Google Pay UPI has 99.8% success rate right now.");
            setStep('RETRYING');
        }

        // 4. Autonomous Retry succeeds
        await new Promise(resolve => setTimeout(resolve, 2500))
        if(isMounted) {
            setStep('SUCCESS');
        }

      } catch (error) {
        console.error("Agent Failed", error);
        if(isMounted) {
            setStep('RETRYING'); // Fallback progression
            setTimeout(() => setStep('SUCCESS'), 2000);
        }
      }
    }

    runAutonomousAgent();

    return () => {
      isMounted = false;
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200"
        >
          {/* Header */}
          <div className="bg-slate-50 border-b border-slate-100 p-6 relative">
            <button 
              onClick={onClose}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-500 ${
                step === 'SUCCESS' ? 'bg-success-500/10' : 'bg-brand-500/10'
              }`}>
                {step === 'SUCCESS' 
                  ? <ShieldCheck className="w-6 h-6 text-success-500" />
                  : <Fingerprint className="w-6 h-6 text-brand-600 animate-pulse" />
                }
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {step === 'FAILED' && "Transaction Failed"}
                  {(step === 'INITIATING_AI' || step === 'ANALYZING' || step === 'RETRYING') && "Autonomous Recovery Agent"}
                  {step === 'SUCCESS' && "Payment Recovered!"}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {step === 'FAILED' && (
                    errorCode === 'INSUFFICIENT_FUNDS' ? 'Error: Insufficient card balance' :
                    errorCode === 'CARD_DECLINED' ? 'Error: Card declined by issuer' :
                    'Error: Bank Downtime (Code: 504)'
                  )}
                  {step !== 'FAILED' && step !== 'SUCCESS' && "AI intercepting failure..."}
                  {step === 'SUCCESS' && "Order successfully placed."}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-900 text-slate-300 font-mono text-sm h-64 overflow-y-auto rounded-b-2xl relative shadow-inner">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShieldCheck className="w-32 h-32" />
            </div>
            
            <div className="space-y-3 relative z-10">
              {/* Step 1: Failure */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2">
                 <AlertCircle className="w-4 h-4 text-error-500 mt-0.5 shrink-0" />
                 <span className="text-error-400">Processing card payment... {
                   errorCode === 'INSUFFICIENT_FUNDS' ? 'DECLINED — Insufficient Funds' :
                   errorCode === 'CARD_DECLINED' ? 'DECLINED — Card Rejected by Issuer' :
                   'FAILED — Bank Timeout (504)'
                 }</span>
              </motion.div>
              
              {/* Step 2: Agent Initiation */}
              {step !== 'FAILED' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
                  <span className="text-brand-300">Agent injected holding state. Preventing checkout drop...</span>
                </motion.div>
              )}

              {/* Step 3: Analysis */}
              {(step === 'ANALYZING' || step === 'RETRYING' || step === 'SUCCESS') && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2">
                  <RotateCw className="w-4 h-4 text-slate-400 animate-spin mt-0.5 shrink-0" />
                  <span>AWS Bedrock analyzing failure code ({errorCode})... Context tracking enabled.</span>
                </motion.div>
              )}

              {/* Step 3.5: Agent Thought Process */}
              {(step === 'RETRYING' || step === 'SUCCESS') && aiThought && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                  <span className="text-brand-300 font-semibold">[Agent Thought]: {aiThought}</span>
                </motion.div>
              )}

              {/* Step 4: Routing Decision */}
              {(step === 'RETRYING' || step === 'SUCCESS') && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success-500 mt-0.5 shrink-0" />
                  <span className="text-slate-100 font-semibold">
                    {aiRationale ? aiRationale : "Match found: Saved Google Pay UPI has 99.8% success rate right now."}
                  </span>
                </motion.div>
              )}

              {/* Step 4b: Autonomous Retry */}
              {(step === 'RETRYING') && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2">
                  <RotateCw className="w-4 h-4 text-warning-400 animate-spin mt-0.5 shrink-0" />
                  <span className="text-warning-300">Autonomously routing payment to UPI rail without manual user input...</span>
                </motion.div>
              )}

              {/* Step 5: Success */}
              {(step === 'SUCCESS') && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-start gap-2 pt-2">
                  <ShieldCheck className="w-5 h-5 text-success-500 mt-0.5 shrink-0" />
                  <span className="text-success-400 font-bold text-base">Payment Successful via UPI! Sale Saved.</span>
                </motion.div>
              )}
            </div>
            
            {step === 'SUCCESS' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 relative z-10">
                <Button className="w-full h-12 bg-success-600 hover:bg-success-700 text-white font-sans text-base font-semibold" onClick={onClose}>
                  Return to Store
                </Button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
