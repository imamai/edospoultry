import { NextRequest, NextResponse } from "next/server";
import { processCallback } from "@/lib/mpesa/daraja";

// This endpoint must be publicly accessible — Safaricom posts here
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await processCallback(body);
    // Safaricom requires exactly this response on success
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Callback processing error";
    console.error("[M-Pesa Callback Error]", msg);
    return NextResponse.json({ ResultCode: 1, ResultDesc: msg });
  }
}
