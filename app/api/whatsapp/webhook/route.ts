import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import twilio from "twilio";

function getClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}

interface FarmerRecord {
  id: string;
  full_name: string;
  preferred_language: string;
}

type Session = {
  state: string;
  data: Record<string, unknown>;
};

// Bi-lingual strings
const T = {
  welcome_en: (name: string) => `👋 Welcome to EdosHatch, ${name}!\n\nReply:\n1. Order chicks\n2. Check order status\n3. Egg collection report\n4. Register\n0. Help`,
  welcome_sw: (name: string) => `👋 Karibu EdosHatch, ${name}!\n\nJibu:\n1. Agiza vifaranga\n2. Angalia hali ya agizo\n3. Ripoti mayai\n4. Jisajili\n0. Msaada`,
  not_registered: `You're not registered with EdosHatch yet.\n\nReply *REGISTER* to get started, or visit your nearest depot.\n\nHujasajiliwa bado. Jibu *REGISTER* kuanza.`,
  order_count_en: `How many chicks would you like? (e.g. 50)\nMinimum: 25 chicks`,
  order_count_sw: `Unataka vifaranga wangapi? (mfano: 50)\nKiwango cha chini: vifaranga 25`,
  order_type_en: `What type of chicks?\n1. Broiler (meat)\n2. Layer (eggs)\n3. Kienyeji (indigenous)`,
  order_type_sw: `Unataka aina gani ya vifaranga?\n1. Broiler (nyama)\n2. Layer (mayai)\n3. Kienyeji`,
  confirm_en: (count: number, type: string, amount: number) =>
    `📋 Order Summary:\n• ${count} ${type} chicks\n• Total: KES ${amount.toLocaleString()}\n\nReply *YES* to confirm or *NO* to cancel`,
  confirm_sw: (count: number, type: string, amount: number) =>
    `📋 Muhtasari wa Agizo:\n• Vifaranga ${count} (${type})\n• Jumla: KES ${amount.toLocaleString()}\n\nJibu *NDIO* kuthibitisha au *HAPANA* kufuta`,
  success_en: (orderNum: string) => `✅ Order ${orderNum} confirmed!\nWe'll dispatch to you within 3-5 days.\nFor support: 0800 123 456`,
  success_sw: (orderNum: string) => `✅ Agizo ${orderNum} limethibitishwa!\nTutapeleka ndani ya siku 3-5.\nUhitaji msaada: 0800 123 456`,
  help: `EdosHatch Support:\n📞 0800 123 456 (free)\n📧 support@edoshatch.co.ke\nHours: Mon-Sat 7am-6pm\n\nUSSD: *384*57463#`,
};

const PRICES = { broiler: 80, layer: 90, kienyeji: 120 };
const CHICK_TYPES = { "1": "broiler", "2": "layer", "3": "kienyeji" } as Record<string, keyof typeof PRICES>;

async function sendWhatsApp(to: string, body: string) {
  await getClient().messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER!,
    to,
    body,
  });
}

function isSwahili(lang: string) { return lang === "sw" || lang === "rw" || lang === "lg"; }

async function handleMessage(supabase: ReturnType<typeof createServiceClient>, from: string, body: string) {
  const phone = from.replace("whatsapp:", "").replace("+", "");
  const msg = body.trim().toLowerCase();

  // Look up farmer by phone
  const { data: farmer } = await supabase
    .from("farmers")
    .select("id, full_name, preferred_language")
    .eq("phone_number", phone)
    .single() as { data: FarmerRecord | null };

  const lang = farmer?.preferred_language ?? "sw";
  const sw = isSwahili(lang);

  // Get or create session
  const { data: session } = await supabase
    .from("whatsapp_sessions")
    .select("session_data, state")
    .eq("phone_number", phone)
    .single();

  const state: Session = session ? { state: session.state, data: session.session_data as Record<string, unknown> ?? {} } : { state: "idle", data: {} };

  async function updateSession(newState: string, data: Record<string, unknown> = {}) {
    await supabase.from("whatsapp_sessions").upsert({
      phone_number: phone,
      state: newState,
      session_data: data,
      updated_at: new Date().toISOString(),
    }, { onConflict: "phone_number" });
  }

  // --- State machine ---

  // Help
  if (msg === "0" || msg === "help" || msg === "msaada") {
    await updateSession("idle");
    return T.help;
  }

  // Not registered → prompt register
  if (!farmer && state.state === "idle") {
    if (msg === "register") {
      return `To register, please visit your nearest depot or call 0800 123 456.\nKujiandikisha, tafadhali tembelea duka lako karibu au piga simu 0800 123 456.`;
    }
    return T.not_registered;
  }

  // Welcome / main menu
  if (!farmer) return T.not_registered;

  if (state.state === "idle") {
    if (msg === "1") {
      await updateSession("order_count");
      return sw ? T.order_count_sw : T.order_count_en;
    }
    if (msg === "2") {
      const { data: orders } = await supabase
        .from("sales_orders")
        .select("order_number, status, total_amount")
        .eq("farmer_id", farmer.id)
        .order("created_at", { ascending: false })
        .limit(3);
      if (!orders?.length) return sw ? "Huna maagizo bado." : "You have no orders yet.";
      return orders.map(o => `#${o.order_number}: ${o.status} — KES ${o.total_amount?.toLocaleString()}`).join("\n");
    }
    if (msg === "3") {
      await updateSession("egg_report_count");
      return sw ? "Ingiza idadi ya mayai ya leo:" : "Enter today's egg count:";
    }
    return sw ? T.welcome_sw(farmer.full_name) : T.welcome_en(farmer.full_name);
  }

  if (state.state === "order_count") {
    const count = parseInt(msg, 10);
    if (isNaN(count) || count < 25) {
      return sw ? "Tafadhali ingiza nambari sahihi (kiwango cha chini 25)." : "Please enter a valid number (minimum 25).";
    }
    await updateSession("order_type", { count });
    return sw ? T.order_type_sw : T.order_type_en;
  }

  if (state.state === "order_type") {
    const type = CHICK_TYPES[msg];
    if (!type) return sw ? "Chagua 1, 2, au 3." : "Please choose 1, 2, or 3.";
    const count = state.data.count as number;
    const amount = count * PRICES[type];
    await updateSession("order_confirm", { count, type, amount });
    return sw ? T.confirm_sw(count, type, amount) : T.confirm_en(count, type, amount);
  }

  if (state.state === "order_confirm") {
    if (msg === "yes" || msg === "ndio" || msg === "y") {
      const { count, type, amount } = state.data as { count: number; type: string; amount: number };
      const orderNumber = `WA-${Date.now().toString().slice(-8)}`;
      await supabase.from("sales_orders").insert({
        organization_id: "00000000-0000-0000-0000-000000000001",
        farmer_id: farmer.id,
        order_number: orderNumber,
        order_type: "chick",
        status: "pending",
        total_amount: amount,
        notes: `WhatsApp order: ${count} ${type} chicks`,
      });
      await updateSession("idle");
      return sw ? T.success_sw(orderNumber) : T.success_en(orderNumber);
    }
    if (msg === "no" || msg === "hapana" || msg === "n") {
      await updateSession("idle");
      return sw ? "Agizo limefutwa. Chagua chaguo kingine:" : "Order cancelled. Reply 1-4 for options.";
    }
    return sw ? "Jibu NDIO au HAPANA." : "Reply YES or NO.";
  }

  if (state.state === "egg_report_count") {
    const count = parseInt(msg, 10);
    if (isNaN(count)) return sw ? "Tafadhali ingiza nambari." : "Please enter a number.";
    // Simple acknowledgement — full recording requires flock selection
    await updateSession("idle");
    return sw
      ? `✅ Ripoti ya mayai ${count.toLocaleString()} imebakiwa. Kwa maelezo zaidi, tembelea dashboard.`
      : `✅ Egg report of ${count.toLocaleString()} recorded. For details, visit the dashboard.`;
  }

  // Default: show main menu
  await updateSession("idle");
  return sw ? T.welcome_sw(farmer.full_name) : T.welcome_en(farmer.full_name);
}

// Twilio sends POST with form-encoded body
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const from = formData.get("From") as string;
  const body = formData.get("Body") as string;

  if (!from || !body) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const supabase = createServiceClient();
  const reply = await handleMessage(supabase, from, body);

  // Log
  await supabase.from("sms_log").insert({
    channel: "whatsapp",
    direction: "inbound",
    phone_number: from.replace("whatsapp:", "").replace("+", ""),
    message_body: body,
  });

  // Send reply via Twilio
  await sendWhatsApp(from, reply);

  // Return empty TwiML (we already sent the message above)
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}
