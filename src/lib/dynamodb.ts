/**
 * DynamoDB integration for Pine Labs Hackathon
 * Table: pine-labs-orders
 * Region: us-east-1
 * Profile: pine-labs-hackathon (AWS Workshop)
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

// ─── Client ───────────────────────────────────────────────────────────────────
// On Amplify: use BEDROCK_ACCESS_KEY / BEDROCK_SECRET_KEY (AWS_ prefix is blocked by Amplify)
// Locally: use AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN
const accessKey = process.env.BEDROCK_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;
const secretKey = process.env.BEDROCK_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const sessionToken = process.env.BEDROCK_SESSION_TOKEN || process.env.AWS_SESSION_TOKEN;
const region = process.env.BEDROCK_REGION || process.env.AWS_REGION || "us-east-1";

const clientConfig: ConstructorParameters<typeof DynamoDBClient>[0] = { region };

if (accessKey && secretKey) {
  clientConfig.credentials = {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
    ...(sessionToken ? { sessionToken } : {}),
  };
}

const client = new DynamoDBClient(clientConfig);

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const TABLE = "pine-labs-orders";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface OrderRecord {
  orderId: string;           // PK
  createdAt: string;         // SK (ISO timestamp)
  merchantOrderRef: string;
  amount: number;            // in paise
  currency: string;
  status: "CREATED" | "PENDING" | "PROCESSED" | "FAILED" | "CANCELLED" | "RECOVERED";
  paymentMethod?: string;
  customerName?: string;
  customerEmail?: string;
  errorCode?: string;
  recoveryStrategy?: string;
  agentConfidence?: number;
  challengeUrl?: string;
  updatedAt?: string;
  pluralOrderId?: string;
}

// ─── Save a new order ─────────────────────────────────────────────────────────
export async function saveOrder(order: OrderRecord): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: order,
    })
  );
}

// ─── Update order status (e.g. after callback) ────────────────────────────────
export async function updateOrderStatus(
  orderId: string,
  createdAt: string,
  status: OrderRecord["status"],
  extra?: Partial<OrderRecord>
): Promise<void> {
  const updates: string[] = ["#st = :status", "#ua = :updatedAt"];
  const names: Record<string, string> = { "#st": "status", "#ua": "updatedAt" };
  const values: Record<string, unknown> = {
    ":status": status,
    ":updatedAt": new Date().toISOString(),
  };

  if (extra?.errorCode) { updates.push("#ec = :ec"); names["#ec"] = "errorCode"; values[":ec"] = extra.errorCode; }
  if (extra?.recoveryStrategy) { updates.push("#rs = :rs"); names["#rs"] = "recoveryStrategy"; values[":rs"] = extra.recoveryStrategy; }
  if (extra?.agentConfidence) { updates.push("#ac = :ac"); names["#ac"] = "agentConfidence"; values[":ac"] = extra.agentConfidence; }
  if (extra?.pluralOrderId) { updates.push("#po = :po"); names["#po"] = "pluralOrderId"; values[":po"] = extra.pluralOrderId; }

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { orderId, createdAt },
      UpdateExpression: `SET ${updates.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );
}

// ─── Get recent orders (scan, last 50) ───────────────────────────────────────
export async function getRecentOrders(limit = 50): Promise<OrderRecord[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE,
      Limit: limit,
    })
  );
  const items = (result.Items || []) as OrderRecord[];
  // Sort by createdAt descending
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ─── Get orders by status ─────────────────────────────────────────────────────
export async function getOrdersByStatus(status: string): Promise<OrderRecord[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE,
      FilterExpression: "#st = :status",
      ExpressionAttributeNames: { "#st": "status" },
      ExpressionAttributeValues: { ":status": status },
    })
  );
  return (result.Items || []) as OrderRecord[];
}

// ─── Get a single order by orderId ───────────────────────────────────────────
export async function getOrderById(orderId: string): Promise<OrderRecord | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "orderId = :id",
      ExpressionAttributeValues: { ":id": orderId },
      Limit: 1,
    })
  );
  return (result.Items?.[0] as OrderRecord) || null;
}

// ─── Stats helper ─────────────────────────────────────────────────────────────
export async function getOrderStats(): Promise<{
  total: number;
  processed: number;
  failed: number;
  recovered: number;
  totalRevenue: number;
  recoveredRevenue: number;
}> {
  const orders = await getRecentOrders(200);
  const processed = orders.filter(o => o.status === "PROCESSED");
  const failed = orders.filter(o => o.status === "FAILED");
  const recovered = orders.filter(o => o.status === "RECOVERED");
  return {
    total: orders.length,
    processed: processed.length,
    failed: failed.length,
    recovered: recovered.length,
    totalRevenue: processed.reduce((s, o) => s + o.amount, 0),
    recoveredRevenue: recovered.reduce((s, o) => s + o.amount, 0),
  };
}
