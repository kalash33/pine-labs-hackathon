import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * POST /api/pine-labs/bin-lookup
 *
 * Looks up the first 6 digits of a card number in the local bin-list-data.csv
 * and returns the issuing bank details along with a simulated bank health status.
 *
 * Bank health is deterministically simulated based on the bank name so the demo
 * is reproducible — certain banks are "degraded" or "down" to trigger the AI
 * recommendation flow.
 */

interface BinRecord {
  bin: string;
  brand: string;
  type: string;
  category: string;
  issuer: string;
  issuerPhone: string;
  issuerUrl: string;
  isoCode2: string;
  countryName: string;
}

type BankHealth = "online" | "degraded" | "down";

interface BinLookupResult {
  found: boolean;
  bin: string;
  brand?: string;
  type?: string;       // CREDIT / DEBIT
  category?: string;   // CLASSIC / PLATINUM / etc.
  issuer?: string;
  issuerUrl?: string;
  country?: string;
  bankHealth: BankHealth;
  bankHealthMessage: string;
  successProbability: number;
}

// Banks that are simulated as degraded/down for demo purposes
const DEGRADED_BANKS = new Set([
  "YES BANK",
  "YES BANK, LTD.",
  "PUNJAB NATIONAL BANK",
  "BANK OF BARODA",
  "UNION BANK OF INDIA",
  "CENTRAL BANK OF INDIA",
]);

const DOWN_BANKS = new Set([
  "STATE BANK OF INDIA",
  "FEDERAL BANK",
  "FEDERAL BANK, LTD.",
  "KARNATAKA BANK",
  "SOUTH INDIAN BANK",
]);

function getBankHealth(issuer: string): { health: BankHealth; message: string; successProbability: number } {
  const upper = issuer.toUpperCase();

  for (const bank of DOWN_BANKS) {
    if (upper.includes(bank)) {
      return {
        health: "down",
        message: `${issuer} is currently experiencing a network outage. Transactions will fail.`,
        successProbability: 8,
      };
    }
  }

  for (const bank of DEGRADED_BANKS) {
    if (upper.includes(bank)) {
      return {
        health: "degraded",
        message: `${issuer} is experiencing intermittent issues. High failure risk (42%).`,
        successProbability: 58,
      };
    }
  }

  // Healthy banks
  return {
    health: "online",
    message: `${issuer} network is healthy. High success probability.`,
    successProbability: 97,
  };
}

// Parse CSV once per process (cached in module scope)
let binMap: Map<string, BinRecord> | null = null;

function loadBinMap(): Map<string, BinRecord> {
  if (binMap) return binMap;

  const csvPath = path.join(process.cwd(), "bin-list-data.csv");
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n");

  binMap = new Map();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted fields (e.g. "HDFC BANK, LTD.")
    const cols: string[] = [];
    let inQuote = false;
    let current = "";
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { cols.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    cols.push(current.trim());

    if (cols.length < 5) continue;

    const bin = cols[0].padStart(6, "0");
    binMap.set(bin, {
      bin,
      brand: cols[1] || "",
      type: cols[2] || "",
      category: cols[3] || "",
      issuer: cols[4] || "",
      issuerPhone: cols[5] || "",
      issuerUrl: cols[6] || "",
      isoCode2: cols[7] || "",
      countryName: cols[9] || "",
    });
  }

  return binMap;
}

export async function POST(req: Request) {
  try {
    const { cardNumber } = await req.json();
    if (!cardNumber || typeof cardNumber !== "string") {
      return NextResponse.json({ error: "cardNumber required" }, { status: 400 });
    }

    const bin = cardNumber.replace(/\s/g, "").slice(0, 6).padStart(6, "0");

    if (bin.length < 6 || !/^\d{6}$/.test(bin)) {
      return NextResponse.json({ found: false, bin, bankHealth: "online", bankHealthMessage: "", successProbability: 95 });
    }

    const map = loadBinMap();
    const record = map.get(bin);

    if (!record) {
      // BIN not in our list — treat as unknown but healthy
      return NextResponse.json<BinLookupResult>({
        found: false,
        bin,
        bankHealth: "online",
        bankHealthMessage: "Bank network appears healthy.",
        successProbability: 92,
      });
    }

    const { health, message, successProbability } = getBankHealth(record.issuer);

    return NextResponse.json<BinLookupResult>({
      found: true,
      bin,
      brand: record.brand,
      type: record.type,
      category: record.category,
      issuer: record.issuer,
      issuerUrl: record.issuerUrl,
      country: record.countryName,
      bankHealth: health,
      bankHealthMessage: message,
      successProbability,
    });
  } catch (err) {
    console.error("[BIN Lookup]", err);
    return NextResponse.json({ error: "BIN lookup failed" }, { status: 500 });
  }
}
