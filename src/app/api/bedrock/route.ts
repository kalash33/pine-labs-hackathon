import { NextResponse } from "next/server";
import { runRecoveryAgent, runSmartTenderAgent, runBankHealthAgent } from "@/lib/agent";

/**
 * POST /api/bedrock
 *
 * Unified AI agent endpoint. Routes to the appropriate agent based on `action`.
 *
 * Actions:
 *   - "recover"           → Autonomous Payment Recovery Agent (ReAct pipeline)
 *   - "smart_tender"      → Smart Tender Optimizer (pre-checkout AI)
 *   - "bank_health_check" → BIN-based bank health assessment + alternative recommendations
 *
 * Both agents use AWS Bedrock (Claude) with deterministic tool fallbacks.
 * The full agent pipeline lives in src/lib/agent.ts.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, errorCode, cartTotal, userProfile, issuer, bankHealth, successProbability, bin } = body;

    if (action === "recover") {
      const result = await runRecoveryAgent({
        errorCode: errorCode || "504_BANK_TIMEOUT",
        cartTotal: cartTotal || "₹4,500",
        userProfile,
      });
      return NextResponse.json(result);
    }

    if (action === "smart_tender") {
      const result = await runSmartTenderAgent(
        cartTotal || "₹4,500",
        userProfile
      );
      return NextResponse.json(result);
    }

    if (action === "bank_health_check") {
      const result = await runBankHealthAgent({
        issuer: issuer || "Unknown Bank",
        bankHealth: bankHealth || "degraded",
        successProbability: successProbability ?? 50,
        cartTotal: cartTotal || "₹4,500",
        bin: bin || "",
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[Bedrock Route] Error:", error);
    return NextResponse.json(
      { error: "Failed to process AI request" },
      { status: 500 }
    );
  }
}
