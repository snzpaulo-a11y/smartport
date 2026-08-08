import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const PAYMONGO_SECRET_KEY = Deno.env.get("PAYMONGO_SECRET_KEY") ?? "";
const PAYMONGO_BASE = "https://api.paymongo.com/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { amount, description, bookingId } = await req.json();

    // 1. Validation
    if (!PAYMONGO_SECRET_KEY) {
      throw new Error("Missing PAYMONGO_SECRET_KEY in environment variables.");
    }

    // 2. Format Authorization Header
    const authHeader = `Basic ${btoa(PAYMONGO_SECRET_KEY + ":")}`;

    // 3. Create Checkout Session instead of Source
    // This supports Cards immediately and GCash (once your account is ready)
    const res = await fetch(`${PAYMONGO_BASE}/checkout_sessions`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            description: description,
            line_items: [
              {
                amount: amount, // Assuming frontend already sends centavos (e.g., 10000 for P100)
                currency: "PHP",
                description: description,
                name: "SmartPort Booking",
                quantity: 1,
              },
            ],
            payment_method_types: ["card"], // 👈 ONLY 'card' for now to bypass GCash block
            success_url: `${req.headers.get("origin")}/payment-result?bookingId=${bookingId}&status=success`,
            cancel_url: `${req.headers.get("origin")}/payment-result?bookingId=${bookingId}&status=failed`,
          },
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("PayMongo API Error:", data);
      return new Response(
        JSON.stringify({ error: data?.errors?.[0]?.detail ?? "PayMongo error" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return the session data (frontend needs the checkout_url from this)
    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});