import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { saveBooking, generateId, getLocalDate, getCurrentUser, supabase, getShipById, updateBookingToRegular, markBookingsCounter, computeCounterDeadline } from "@/lib/store";
import { ArrowLeft, Loader2, AlertCircle, Shield } from "lucide-react";
import { useEffect } from "react";

// Payment sessions are created by the server-side Edge Function
// (supabase/functions/create-paymongo-source) so the PayMongo secret key never
// ships in the browser bundle.
async function createPayMongoCheckout(
  amountCentavos: number,
  bookingId: string,
  passengerName: string
) {
  const res = await supabase.functions.invoke("create-paymongo-source", {
    body: {
      amount: amountCentavos,
      description: `SmartPort Booking ${bookingId} — ${passengerName}`,
      bookingId,
    },
  });

  if (res.error) {
    const detail = (res.error as any)?.message || "Failed to create payment session.";
    throw new Error(detail);
  }
  const session = res.data?.data;
  if (!session?.attributes?.checkout_url) {
    throw new Error("Payment session could not be created. Please try the counter option.");
  }
  return session;
}

const PaymentPage = () => {
  const { shipId, seatId } = useParams<{ shipId: string; seatId: string }>();
  const navigate  = useNavigate();
  const location  = useLocation();

  const { name, phone, email, passengerType, price, accommodationType,
    boardStop,
    alightStop,
    legPrice,
    tripDate,
    seatLabel: stateSeatLabel,
    idVerified,
    verifiedScore,
    idImageUrl,
    idVerificationStatus,
    basePrice: stateBasePrice,
    deduction: stateDeduction,
    isGroup = false,
    passengers = []
  } = (location.state || {}) as {
    name: string;
    phone: string;
    email?: string;
    passengerType: string;
    price: number;
    accommodationType: "seat" | "bunk";
    boardStop?: string;
    alightStop?: string;
    legPrice?: number;
    tripDate?: string;
    seatLabel: string;
    idVerified: boolean;
    verifiedScore: number;
    idImageUrl?: string;
    idVerificationStatus?: string;
    bookingId: string;
    basePrice?: number;
    deduction?: number;
    isGroup?: boolean;
    passengers?: Array<{
      name: string;
      phone: string;
      email: string;
      type: string;
      price: number;
      basePrice: number;
      deduction: number;
      idImageUrl: string | null;
      idVerificationStatus: string;
      bookingId: string;
      seatId: string;
      seatLabel: string;
    }>;
  };

  const bookingId = (location.state as any)?.bookingId || "";
  const basePrice = stateBasePrice || price;
  const deduction = stateDeduction || 0;

  const shipName  = (location.state as any)?.shipName || shipId || "";
  const seatLabel = stateSeatLabel || seatId?.split("-").pop()?.toUpperCase() || "";

  // Helper to remove duplicate adjacent words (e.g. "Romblon Romblon" -> "Romblon")
  const cleanStr = (s: string) => {
    if (!s) return "";
    const words = s.split(" ");
    return words.filter((w, i) => w !== words[i - 1]).join(" ");
  };

  const boardDisplay = cleanStr(boardStop || "");
  const alightDisplay = cleanStr(alightStop || "");

  const [ship, setShip]       = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [currentStatus, setCurrentStatus] = useState<string>(idVerificationStatus || "none");
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);

  // Dynamic price calculation with fallback logic
  const getDeduction = () => {
    if (stateDeduction && stateDeduction > 0) return stateDeduction;
    if (!passengerType) return 0;
    // Fallback calculation if state is missing
    const discounts: Record<string, number> = { student: 0.20, senior: 0.20, pwd: 0.20 };
    const rate = discounts[passengerType.toLowerCase()] || 0;
    return Math.round(basePrice * rate);
  };

  const deductionToApply = getDeduction();
  const finalPrice = isGroup
    ? passengers.reduce((sum, p) => sum + p.price, 0)
    : (currentStatus === "verified" ? (basePrice - deductionToApply) : basePrice);

  // Group discount breakdown
  const groupBaseTotal = isGroup ? passengers.reduce((sum, p) => sum + (p.basePrice || p.price), 0) : 0;
  const hasGroupDiscount = isGroup && groupBaseTotal > finalPrice;

  useEffect(() => {
    if (shipId) {
      getShipById(shipId).then(setShip);
    }
  }, [shipId]);

  useEffect(() => {
    if (!bookingId) return;
    supabase.from("bookings").select("status").eq("id", bookingId).single()
      .then(({ data }) => setBookingStatus(data?.status || null));
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return;

    // Real-time subscription for status changes
    const channel = supabase
      .channel('booking-updates')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'bookings',
        filter: `id=eq.${bookingId}`
      }, (payload) => {
        console.log("Booking update received:", payload);
        setCurrentStatus(payload.new.id_verification_status);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bookingId]);

  if (!shipId || (!isGroup && !name)) return <div className="p-8 text-center text-foreground">Invalid booking data.</div>;

  const isExpired = bookingStatus === "expired";
  const isLocked = !isGroup && (currentStatus === "pending" || currentStatus === "rejected" || isExpired);

  // A group with discount members whose ID hasn't been verified yet must wait.
  const hasUnverifiedDiscount = isGroup
    ? passengers.some(p => p.type?.toLowerCase() !== "regular" && p.idVerificationStatus !== "verified")
    : false;

  const handlePay = async (method: "gcash" | "paymaya") => {
    if (hasUnverifiedDiscount) {
      setError("Please wait for ID verification before paying.");
      return;
    }
    if (isLocked) {
      if (isExpired) setError("This booking has expired. Please book a new trip.");
      return; // Safety check
    }
    setError("");
    setLoading(true);
    try {
      if (isGroup) {
        // PERSIST ALL FINAL PRICES before paying
        const updatePromises = passengers.map(p => 
          supabase.from("bookings").update({ leg_price: p.price }).eq("id", p.bookingId)
        );
        await Promise.all(updatePromises);

        const amountCentavos = Math.round(finalPrice * 100);
        // Create a PayMongo checkout session via the server-side Edge Function.
        const firstP = passengers[0];
        const session = await createPayMongoCheckout(
          amountCentavos, firstP.bookingId, firstP.name
        );

        sessionStorage.setItem("pending_booking_id", firstP.bookingId);
        sessionStorage.setItem("pending_qr_code", `SPT-${firstP.bookingId}`);
        sessionStorage.setItem("pending_source_id", "");
        sessionStorage.setItem("pending_amount", amountCentavos.toString());
        sessionStorage.setItem("pending_is_group", "true");
        sessionStorage.setItem("pending_booking_ids", passengers.map(p => p.bookingId).join(","));

        window.location.href = session.attributes.checkout_url;

      } else {
        // PERSIST THE FINAL PRICE (Discounted or Regular) before paying
        await supabase.from("bookings").update({ leg_price: finalPrice }).eq("id", bookingId);

        const amountCentavos = Math.round(finalPrice * 100);
        const session = await createPayMongoCheckout(
          amountCentavos, bookingId, name
        );

        sessionStorage.setItem("pending_booking_id", bookingId);
        sessionStorage.setItem("pending_qr_code", `SPT-${bookingId}`);
        sessionStorage.setItem("pending_source_id", "");
        sessionStorage.setItem("pending_amount", amountCentavos.toString());
        sessionStorage.setItem("pending_is_group", "false");

        window.location.href = session.attributes.checkout_url;
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handlePayCounter = async () => {
    if (hasUnverifiedDiscount) {
      setError("Please wait for ID verification before paying.");
      return;
    }
    if (isExpired) {
      setError("This booking has expired. Please book a new trip.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const ids = isGroup ? passengers.map(p => p.bookingId) : [bookingId];

      // PERSIST FINAL PRICES (same as the online flow) before reserving
      if (isGroup) {
        await Promise.all(passengers.map(p =>
          supabase.from("bookings").update({ leg_price: p.price }).eq("id", p.bookingId)
        ));
      } else {
        await supabase.from("bookings").update({ leg_price: finalPrice }).eq("id", bookingId);
      }

      const deadline = computeCounterDeadline(ship?.departure || "", tripDate || getLocalDate());
      await markBookingsCounter(ids, deadline);

      const refs = ids.map(id => `SPT-${id}`);
      sessionStorage.setItem("pending_counter_booking_ids", ids.join(","));
      sessionStorage.setItem("pending_counter_deadline", deadline.toISOString());

      navigate("/counter-confirmation", {
        state: { bookingIds: ids, refs, deadline: deadline.toISOString() },
      });
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToRegular = async () => {
    try {
      setLoading(true);
      const shipData = ship || await getShipById(shipId!);
      const fullPrice = shipData.price; // Get regular price
      await updateBookingToRegular(bookingId, fullPrice);
      // Update local state to unlock
      setCurrentStatus("none");
      window.location.reload();
    } catch (err: any) {
      setError("Failed to switch: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 glass-card rounded-xl hover:bg-muted/50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-display text-xl font-bold text-foreground">Payment</h1>
        </div>
        <button onClick={() => navigate("/booking")} className="p-2 text-muted-foreground hover:text-white transition-colors">
          <span className="text-[10px] font-black uppercase tracking-widest">Home</span>
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6 mb-4">

        <h2 className="font-display font-bold text-foreground mb-4">Order Summary</h2>
        <div className="space-y-2 text-sm mb-6">
          <div className="flex justify-between text-muted-foreground">
            <span>Vessel</span><span className="text-foreground">{ship?.name || shipName || "SmartPort Vessel"}</span>
          </div>
          {isGroup ? (
            <>
              <div className="flex justify-between text-muted-foreground">
                <span>Seats</span><span className="text-foreground">{passengers.map(p => p.seatLabel).join(", ")}</span>
              </div>
              {boardDisplay && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Route</span><span className="text-foreground">{boardDisplay} → {alightDisplay}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground border-t border-white/5 pt-2">
                <span className="font-bold">Passengers:</span>
              </div>
              {passengers.map((p, idx) => (
                <div key={idx} className="flex justify-between text-xs text-muted-foreground pl-2">
                  <span>{p.name} ({p.type})</span>
                  <span className="text-foreground">₱{p.price.toLocaleString()}</span>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="flex justify-between text-muted-foreground">
                <span>Seat</span><span className="text-foreground">{seatLabel}</span>
              </div>
              {boardDisplay && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Route</span><span className="text-foreground">{boardDisplay} → {alightDisplay}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Passenger</span><span className="text-foreground">{name}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Type</span><span className="text-foreground capitalize">{passengerType}</span>
              </div>
            </>
          )}
          <div className="border-t border-border pt-2 flex justify-between font-display font-bold text-foreground text-base">
            <span>Total</span>
            <div className="flex flex-col items-end">
              {hasGroupDiscount && (
                <>
                  <span className="text-[10px] text-muted-foreground line-through opacity-70 leading-none mb-0.5">₱{groupBaseTotal.toLocaleString()}</span>
                  <span className="text-[10px] text-emerald-500 leading-none mb-1">-{passengers.filter((p: any) => p.type !== "regular").length > 0 ? `₱${(groupBaseTotal - finalPrice).toLocaleString()} discount` : ""}</span>
                </>
              )}
              {!isGroup && currentStatus === "verified" && deductionToApply > 0 && (
                <span className="text-[10px] text-emerald-500 line-through opacity-70 leading-none mb-1">₱{basePrice}</span>
              )}
              <span className="text-primary leading-none">₱{finalPrice.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          {currentStatus === "pending" && (
            <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col items-center text-center">
               <div className="relative mb-3">
                 <div className="w-12 h-12 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                 <Shield className="w-5 h-5 text-primary absolute inset-0 m-auto" />
               </div>
               <h3 className="font-display font-bold text-white text-base mb-1">Verification in Progress</h3>
               <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black opacity-70">
                 The Captain is reviewing your identity
               </p>
            </div>
          )}

          {currentStatus === "verified" && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 mb-2">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-emerald-500">Identity Verified</h3>
              <p className="text-[10px] text-muted-foreground">You can now proceed to payment with your discount.</p>
            </div>
          )}

          {currentStatus === "rejected" && (
            <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-center">
               <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto mb-3">
                  <AlertCircle className="w-6 h-6" />
               </div>
               <h3 className="font-bold text-white mb-1">ID Verification Rejected</h3>
               <p className="text-[10px] text-muted-foreground mb-4">Your discount ID was rejected. You can proceed at regular price or try a different ID.</p>
               <div className="flex flex-col gap-2">
                 <button 
                  onClick={handleSwitchToRegular}
                  className="w-full py-2 bg-white text-black rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-white/90 transition-all"
                 >
                   Switch to Regular & Pay Now
                 </button>
                 <button 
                  onClick={() => navigate(-1)}
                  className="text-[10px] text-muted-foreground hover:text-white uppercase tracking-widest"
                 >
                   Try Different ID
                 </button>
               </div>
            </div>
          )}

          {isExpired && (
            <div className="p-5 rounded-2xl bg-zinc-500/5 border border-zinc-500/20 text-center">
              <div className="w-10 h-10 rounded-full bg-zinc-500/10 flex items-center justify-center text-zinc-400 mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white mb-1">Booking Expired</h3>
              <p className="text-[10px] text-muted-foreground mb-4">Payment was not completed within the 3-hour window, so your seat was released.</p>
              <button
                onClick={() => navigate("/booking")}
                className="w-full py-2 bg-white text-black rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-white/90 transition-all"
              >
                Book a New Trip
              </button>
            </div>
          )}

          {(currentStatus === "none" || !currentStatus) && (
            <p className="text-xs text-muted-foreground text-center">
              Choose your preferred payment method below.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <motion.button
            disabled
            onClick={() => handlePay("gcash")}
            className="w-full py-4 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-3 bg-muted text-muted-foreground/50 border border-border/50 cursor-not-allowed"
          >
            <span className="text-2xl opacity-40">💙</span>
            GCash — Coming Soon
          </motion.button>

          <motion.button
            disabled
            onClick={() => handlePay("paymaya")}
            className="w-full py-4 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-3 bg-muted text-muted-foreground/50 border border-border/50 cursor-not-allowed"
          >
            <span className="text-2xl opacity-40">💚</span>
            Maya — Coming Soon
          </motion.button>

          <motion.button 
            whileHover={!loading && !isExpired ? { scale: 1.02 } : {}} 
            whileTap={!loading && !isExpired ? { scale: 0.98 } : {}}
            disabled={loading || isExpired} 
            onClick={handlePayCounter}
            className={`w-full py-4 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-3 bg-[#B45309] hover:bg-[#B45309]/90 text-white transition-all ${(loading || isExpired) ? "opacity-40 cursor-not-allowed grayscale" : ""}`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="text-2xl">🧾</span>}
            Pay at the Counter
          </motion.button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-3 uppercase tracking-tighter font-bold">
          Pay at the Counter — reserve your seat now, pay cash at the terminal counter.
        </p>

        <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[10px] text-amber-500/90 text-center">
          Online payment (GCash / Maya) is coming soon. For now, reservations are paid at the terminal counter.
        </div>

        {currentStatus === "pending" && (
          <div className="mt-6 pt-6 border-t border-white/5">
            <button 
              onClick={() => navigate("/my-tickets")}
              className="w-full py-5 bg-primary text-[#0A1118] rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-[0_10px_30px_rgba(227, 0, 15,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Go to My Tickets
            </button>
            <p className="text-[10px] text-muted-foreground text-center mt-3 uppercase tracking-tighter opacity-50 font-bold">
              Check status in My Tickets anytime
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-4">
          🛡️ Online payments coming soon — reserve now, pay at the terminal counter.
        </p>
      </motion.div>
    </div>
  );
};

export default PaymentPage;