import axios from "axios";
import { createServiceClient } from "@/lib/supabase/server";

const BASE_URL =
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  const res = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  return res.data.access_token;
}

function getTimestamp() {
  return new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);
}

function getPassword(timestamp: string) {
  const raw = `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`;
  return Buffer.from(raw).toString("base64");
}

export interface STKPushParams {
  phoneNumber: string;
  amount: number;
  orderId: string;
  organizationId: string;
  description?: string;
}

export async function initiateStkPush(params: STKPushParams) {
  const token = await getAccessToken();
  const timestamp = getTimestamp();
  const password = getPassword(timestamp);

  const phone = params.phoneNumber.replace(/^\+/, "").replace(/^0/, "254");

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.ceil(params.amount),
    PartyA: phone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: `EDOS-${params.orderId.slice(0, 12).toUpperCase()}`,
    TransactionDesc: params.description ?? "EdosHatch Payment",
  };

  const res = await axios.post(
    `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // Persist pending payment record
  const supabase = createServiceClient();
  await supabase.from("order_payments").insert({
    organization_id: params.organizationId,
    order_id: params.orderId,
    payment_method: "mpesa_stk",
    mpesa_checkout_request_id: res.data.CheckoutRequestID,
    mpesa_merchant_request_id: res.data.MerchantRequestID,
    mpesa_phone_number: phone,
    amount: params.amount,
    status: "processing",
  });

  return res.data;
}

export async function processCallback(body: Record<string, unknown>) {
  const { stkCallback } = (body as { Body: { stkCallback: Record<string, unknown> } }).Body;
  const checkoutRequestId = stkCallback.CheckoutRequestID as string;
  const resultCode = stkCallback.ResultCode as number;

  const supabase = createServiceClient();

  if (resultCode === 0) {
    const items = (stkCallback.CallbackMetadata as { Item: { Name: string; Value: unknown }[] }).Item;
    const getValue = (name: string) => items.find(i => i.Name === name)?.Value;

    const mpesaTransactionId = getValue("MpesaReceiptNumber") as string;
    const amount = getValue("Amount") as number;

    const { data: payment } = await supabase
      .from("order_payments")
      .update({
        status: "completed",
        mpesa_transaction_id: mpesaTransactionId,
        amount,
        paid_at: new Date().toISOString(),
      })
      .eq("mpesa_checkout_request_id", checkoutRequestId)
      .select("order_id")
      .single();

    if (payment) {
      await supabase
        .from("sales_orders")
        .update({ status: "confirmed", amount_paid: amount })
        .eq("id", payment.order_id);
    }
  } else {
    await supabase
      .from("order_payments")
      .update({
        status: "failed",
        failure_reason: stkCallback.ResultDesc as string,
      })
      .eq("mpesa_checkout_request_id", checkoutRequestId);
  }
}
