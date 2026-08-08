import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2, Lock } from "lucide-react";

const PAYMONGO_PUBLIC = import.meta.env.VITE_PAYMONGO_PUBLIC_KEY || "pk_test_m4VogJKxjMuUbyp9gxDkvgjZ";
const SECRET_KEY = import.meta.env.VITE_PAYMONGO_SECRET_KEY || "";

const CardPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { intentId, clientKey, bookingId, amount, shipName } = (location.state || {}) as any;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const elementRef = useRef<any>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    // Load PayMongo JS SDK
    const script = document.createElement("script");
    script.src = "https://js.paymongo.com/v1/paymongo.js";
    script.onload = () => initCard();
    document.head.appendChild(script);
  }, []);

  const initCard = () => {
    try {
      const paymongo = (window as any).PayMongo;
      if (!paymongo) { setError("PayMongo SDK failed to load."); setLoading(false); return; }

      const elements = paymongo.elements({ publicKey: PAYMONGO_PUBLIC });
      const card = elements.create("card", {
        style: {
          base: {
            color: "#ffffff",
            fontFamily: "'Inter', sans-serif",
            fontSize: "16px",
            "::placeholder": { color: "#888" },
          },
          invalid: { color: "#ff5555" },
        },
      });
      card.mount("#card-element");
      elementRef.current = { elements, card };
      setLoading(false);
    } catch (e) {
      setError("Failed to initialize card payment.");
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!elementRef.current) return;
    setPaying(true); setError("");
    try {
      const paymongo = (window as any).PayMongo;
      const { paymentMethod, error: pmErr } = await paymongo.createPaymentMethod({
        type: "card",
        card: elementRef.current.card,
        billing: { name: "Passenger" },
      });
      if (pmErr) throw new Error(pmErr.message);

      // Attach payment method to intent
      const res = await fetch(`https://api.paymongo.com/v1/payment_intents/${intentId}/attach`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(SECRET_KEY + ":")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            attributes: {
              payment_method: paymentMethod.id,
              client_key: clientKey,
              return_url: `${window.location.origin}/payment-result?bookingId=${bookingId}&status=success`,
            },
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.errors?.[0]?.detail || "Card payment failed");

      const intent = data.data;
      const status = intent.attributes.status;

      if (status === "succeeded") {
        navigate(`/payment-result?bookingId=${bookingId}&status=success`);
      } else if (status === "awaiting_next_action") {
        // 3D Secure redirect
        const redirectUrl = intent.attributes.next_action?.redirect?.url;
        if (redirectUrl) window.location.href = redirectUrl;
        else throw new Error("3D Secure redirect URL not found");
      } else {
        throw new Error("Unexpected payment status: " + status);
      }
    } catch (e: any) {
      setError(e.message || "Card payment failed.");
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 glass-card rounded-xl hover:bg-muted/50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Card Payment</h1>
          <p className="text-xs text-muted-foreground">{shipName}</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-foreground">Card Details</h2>
          <Lock className="w-4 h-4 text-secondary" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading card form...
          </div>
        ) : (
          <div id="card-element" className="px-4 py-4 bg-muted/30 rounded-xl border border-border min-h-[50px]" />
        )}
      </div>

      <div className="glass-card rounded-2xl p-4 mb-5 text-center">
        <p className="text-xs text-muted-foreground">Amount to pay</p>
        <p className="font-display font-bold text-primary text-3xl">₱{amount?.toLocaleString()}</p>
      </div>

      {error && (
        <div className="text-destructive text-sm text-center p-3 bg-destructive/10 rounded-xl mb-4">{error}</div>
      )}

      <motion.button whileHover={{ scale: paying ? 1 : 1.02 }} whileTap={{ scale: paying ? 1 : 0.98 }}
        onClick={handlePay} disabled={loading || paying}
        className="w-full py-4 rounded-2xl btn-ocean font-display font-bold text-lg flex items-center justify-center gap-2">
        {paying ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : <><Lock className="w-5 h-5" /> Pay ₱{amount?.toLocaleString()}</>}
      </motion.button>

      <p className="text-xs text-muted-foreground text-center mt-3">
        🔒 Your card details are encrypted and never stored on our servers.
      </p>
    </div>
  );
};

export default CardPayment;