import { NextResponse } from "next/server";
import { generateToken } from "@/lib/pinelabs";

/**
 * POST /api/pine-labs/card-details
 *
 * Fetches card/BIN details from Pine Labs API.
 * Reference: https://developer.pinelabsonline.com/reference/get-card-details
 *
 * Used by the AI agent to:
 *  - Identify card network (Visa/MC/RuPay/Amex)
 *  - Check if card is debit/credit/prepaid
 *  - Determine issuing bank
 *  - Assess EMI eligibility
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cardNumber } = body;

    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 6) {
      return NextResponse.json(
        { error: "Card number must be at least 6 digits" },
        { status: 400 }
      );
    }

    const bin = cardNumber.replace(/\s/g, "").slice(0, 6);

    // Try real Pine Labs Card Details API
    try {
      const tokenData = await generateToken();
      const BASE_URL =
        process.env.PINELABS_BASE_URL || "https://pluraluat.v2.pinepg.in/api";

      const response = await fetch(
        `${BASE_URL}/checkout/v1/card/details?card_number=${bin}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          source: "pine_labs_api",
          bin,
          ...data,
        });
      }

      // If API returns non-200, fall through to BIN lookup
      console.warn(
        `[CardDetails] Pine Labs API returned ${response.status}, using BIN lookup`
      );
    } catch (apiErr) {
      console.warn("[CardDetails] Pine Labs API unavailable:", apiErr);
    }

    // ── Fallback: deterministic BIN lookup ──────────────────────────────────
    const cardInfo = getBinInfo(bin);
    return NextResponse.json({ source: "bin_lookup", bin, ...cardInfo });
  } catch (error) {
    console.error("[CardDetails] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch card details" },
      { status: 500 }
    );
  }
}

// ─── BIN Lookup Table (fallback) ─────────────────────────────────────────────

interface BinInfo {
  network: string;
  type: "credit" | "debit" | "prepaid";
  issuer: string;
  emi_eligible: boolean;
  international: boolean;
  success_rate: number;
  risk_score: "low" | "medium" | "high";
  color: string;
}

function getBinInfo(bin: string): BinInfo {
  // UAT test cards
  const knownBins: Record<string, BinInfo> = {
    "401200": {
      network: "Visa",
      type: "credit",
      issuer: "HDFC Bank",
      emi_eligible: true,
      international: false,
      success_rate: 98.2,
      risk_score: "low",
      color: "#1a1f71",
    },
    "400000": {
      network: "Visa",
      type: "credit",
      issuer: "Test Bank",
      emi_eligible: false,
      international: false,
      success_rate: 12.0,
      risk_score: "high",
      color: "#ef4444",
    },
  };

  if (knownBins[bin]) return knownBins[bin];

  // Generic BIN detection
  const first = bin[0];
  const firstTwo = bin.slice(0, 2);

  let network = "Unknown";
  let color = "#64748b";

  if (first === "4") {
    network = "Visa";
    color = "#1a1f71";
  } else if (["51", "52", "53", "54", "55"].includes(firstTwo)) {
    network = "Mastercard";
    color = "#eb001b";
  } else if (["34", "37"].includes(firstTwo)) {
    network = "Amex";
    color = "#007bc1";
  } else if (first === "6") {
    network = "RuPay";
    color = "#f97316";
  }

  return {
    network,
    type: "credit",
    issuer: "Unknown Bank",
    emi_eligible: network !== "Amex",
    international: false,
    success_rate: 85.0,
    risk_score: "medium",
    color,
  };
}
