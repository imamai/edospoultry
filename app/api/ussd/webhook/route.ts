import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Africa's Talking USSD — session-based text menus
// CON = continue session, END = close session

interface UssdSession {
  id: string;
  state: string;
  session_data: Record<string, unknown>;
}

interface FarmerRecord {
  id: string;
  full_name: string;
  preferred_language: string;
}

type SessionRecord = {
  state: string;
  session_data: Record<string, unknown>;
};

const PRICES = { broiler: 80, layer: 90, kienyeji: 120 };
type ChickType = keyof typeof PRICES;

async function getSession(supabase: ReturnType<typeof createServiceClient>, sessionId: string): Promise<SessionRecord> {
  const { data } = await supabase
    .from("ussd_sessions")
    .select("state, session_data")
    .eq("session_id", sessionId)
    .single();

  return data ? { state: data.state, session_data: (data.session_data as Record<string, unknown>) ?? {} } : { state: "main", session_data: {} };
}

async function saveSession(supabase: ReturnType<typeof createServiceClient>, sessionId: string, phone: string, state: string, data: Record<string, unknown> = {}) {
  await supabase.from("ussd_sessions").upsert({
    session_id: sessionId,
    phone_number: phone,
    state,
    session_data: data,
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  }, { onConflict: "session_id" });
}

async function endSession(supabase: ReturnType<typeof createServiceClient>, sessionId: string) {
  await supabase.from("ussd_sessions").delete().eq("session_id", sessionId);
}

function con(text: string) { return `CON ${text}`; }
function end(text: string) { return `END ${text}`; }

export async function POST(req: NextRequest) {
  // Africa's Talking sends form-encoded
  const formData = await req.formData();
  const sessionId = formData.get("sessionId") as string;
  const phoneNumber = (formData.get("phoneNumber") as string ?? "").replace("+", "");
  const text = (formData.get("text") as string ?? "").trim();

  const supabase = createServiceClient();

  // Look up farmer
  const { data: farmer } = await supabase
    .from("farmers")
    .select("id, full_name, preferred_language")
    .eq("phone_number", phoneNumber)
    .single() as { data: FarmerRecord | null };

  const sw = !farmer || farmer.preferred_language !== "en";

  // Parse navigation path from accumulated text
  // e.g. "1*50*1*YES" means selected 1, then 50, then 1, then YES
  const steps = text ? text.split("*") : [];
  const depth = steps.length;
  const last = steps[depth - 1] ?? "";

  // Restore session
  const session = await getSession(supabase, sessionId);

  // --- Main Menu ---
  if (depth === 0 || (depth === 1 && steps[0] === "")) {
    if (!farmer) {
      return new NextResponse(
        end(sw
          ? "Hujasajiliwa. Tembelea duka lako karibu au piga simu 0800 123 456."
          : "Not registered. Visit your nearest depot or call 0800 123 456."),
        { headers: { "Content-Type": "text/plain" } }
      );
    }
    await saveSession(supabase, sessionId, phoneNumber, "main");
    return new NextResponse(
      con(sw
        ? `Karibu EdosHatch\nJibu:\n1. Agiza Vifaranga\n2. Hali ya Agizo\n3. Ripoti Mayai\n4. Chanjo\n0. Ondoka`
        : `Welcome EdosHatch\nReply:\n1. Order Chicks\n2. Order Status\n3. Egg Report\n4. Vaccination\n0. Exit`),
      { headers: { "Content-Type": "text/plain" } }
    );
  }

  // Exit
  if (last === "0") {
    await endSession(supabase, sessionId);
    return new NextResponse(end(sw ? "Kwaherini! Namba yetu: 0800 123 456" : "Goodbye! Support: 0800 123 456"), { headers: { "Content-Type": "text/plain" } });
  }

  // 1 → Order Chicks
  if (steps[0] === "1") {
    if (depth === 1) {
      return new NextResponse(
        con(sw ? "Ingiza idadi ya vifaranga:\n(Kiwango cha chini: 25)" : "Enter number of chicks:\n(Minimum: 25)"),
        { headers: { "Content-Type": "text/plain" } }
      );
    }
    if (depth === 2) {
      const count = parseInt(steps[1], 10);
      if (isNaN(count) || count < 25) {
        return new NextResponse(
          con(sw ? "Nambari si sahihi. Ingiza tena (min 25):" : "Invalid. Enter again (min 25):"),
          { headers: { "Content-Type": "text/plain" } }
        );
      }
      await saveSession(supabase, sessionId, phoneNumber, "order_type", { count });
      return new NextResponse(
        con(sw
          ? "Aina ya vifaranga:\n1. Broiler (nyama)\n2. Layer (mayai)\n3. Kienyeji"
          : "Chick type:\n1. Broiler (meat)\n2. Layer (eggs)\n3. Kienyeji"),
        { headers: { "Content-Type": "text/plain" } }
      );
    }
    if (depth === 3) {
      const typeMap: Record<string, ChickType> = { "1": "broiler", "2": "layer", "3": "kienyeji" };
      const type = typeMap[steps[2]];
      if (!type) {
        return new NextResponse(con(sw ? "Chagua 1, 2, au 3:" : "Choose 1, 2, or 3:"), { headers: { "Content-Type": "text/plain" } });
      }
      const count = parseInt(steps[1], 10);
      const amount = count * PRICES[type];
      await saveSession(supabase, sessionId, phoneNumber, "order_confirm", { count, type, amount });
      return new NextResponse(
        con(sw
          ? `Muhtasari:\n${count} ${type} vifaranga\nJumla: KES ${amount.toLocaleString()}\n\n1. Thibitisha\n2. Futa`
          : `Summary:\n${count} ${type} chicks\nTotal: KES ${amount.toLocaleString()}\n\n1. Confirm\n2. Cancel`),
        { headers: { "Content-Type": "text/plain" } }
      );
    }
    if (depth === 4) {
      if (steps[3] === "1" && farmer) {
        const sd = session.session_data;
        const count = sd.count as number ?? parseInt(steps[1], 10);
        const type = (sd.type as ChickType) ?? (["broiler", "layer", "kienyeji"][parseInt(steps[2], 10) - 1] as ChickType);
        const amount = sd.amount as number ?? count * PRICES[type];
        const orderNumber = `US-${Date.now().toString().slice(-8)}`;
        await supabase.from("sales_orders").insert({
          organization_id: "00000000-0000-0000-0000-000000000001",
          farmer_id: farmer.id,
          order_number: orderNumber,
          order_type: "chick",
          status: "pending",
          total_amount: amount,
          notes: `USSD order: ${count} ${type} chicks`,
        });
        await endSession(supabase, sessionId);
        return new NextResponse(
          end(sw
            ? `Agizo ${orderNumber} limethibitishwa!\nUtalipwa ndani ya siku 3-5.\nMsaada: 0800 123 456`
            : `Order ${orderNumber} confirmed!\nDelivery in 3-5 days.\nSupport: 0800 123 456`),
          { headers: { "Content-Type": "text/plain" } }
        );
      }
      await endSession(supabase, sessionId);
      return new NextResponse(end(sw ? "Agizo limefutwa." : "Order cancelled."), { headers: { "Content-Type": "text/plain" } });
    }
  }

  // 2 → Order Status
  if (steps[0] === "2" && farmer) {
    const { data: orders } = await supabase
      .from("sales_orders")
      .select("order_number, status, total_amount")
      .eq("farmer_id", farmer.id)
      .order("created_at", { ascending: false })
      .limit(3);
    await endSession(supabase, sessionId);
    if (!orders?.length) {
      return new NextResponse(end(sw ? "Huna maagizo bado." : "No orders yet."), { headers: { "Content-Type": "text/plain" } });
    }
    const list = orders.map(o => `#${o.order_number}: ${o.status}`).join("\n");
    return new NextResponse(end(list), { headers: { "Content-Type": "text/plain" } });
  }

  // 3 → Egg Report (simple count collection)
  if (steps[0] === "3") {
    if (depth === 1) {
      return new NextResponse(con(sw ? "Ingiza idadi ya mayai ya leo:" : "Enter today's egg count:"), { headers: { "Content-Type": "text/plain" } });
    }
    if (depth === 2) {
      const count = parseInt(steps[1], 10);
      if (!isNaN(count) && farmer) {
        await supabase.from("sms_log").insert({
          channel: "ussd",
          direction: "inbound",
          phone_number: phoneNumber,
          message_body: `Egg report: ${count} eggs`,
        });
      }
      await endSession(supabase, sessionId);
      return new NextResponse(
        end(sw ? `Ripoti imebakiwa: mayai ${count?.toLocaleString() ?? 0}` : `Recorded: ${count?.toLocaleString() ?? 0} eggs`),
        { headers: { "Content-Type": "text/plain" } }
      );
    }
  }

  // 4 → Vaccination reminder
  if (steps[0] === "4" && farmer) {
    const { data: upcoming } = await supabase
      .from("vaccination_schedules")
      .select("vaccine_name, scheduled_date")
      .gte("scheduled_date", new Date().toISOString().slice(0, 10))
      .limit(3);
    await endSession(supabase, sessionId);
    if (!upcoming?.length) {
      return new NextResponse(end(sw ? "Hakuna chanjo zinazokaribia." : "No upcoming vaccinations."), { headers: { "Content-Type": "text/plain" } });
    }
    const list = upcoming.map(v => `${v.vaccine_name}: ${v.scheduled_date}`).join("\n");
    return new NextResponse(end(list), { headers: { "Content-Type": "text/plain" } });
  }

  // Fallback
  await endSession(supabase, sessionId);
  return new NextResponse(end(sw ? "Tafadhali anza upya." : "Please start again."), { headers: { "Content-Type": "text/plain" } });
}
