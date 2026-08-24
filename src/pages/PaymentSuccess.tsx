import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase, submitReview, getBookingById } from "@/lib/store";
import { CheckCircle, Loader2, CalendarCheck, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import FeedbackModal from "@/components/FeedbackModal";

const PaymentSuccess = () => {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const location   = useLocation();
  
  // Get booking data from URL or Location State (Fallback to Session Storage)
  const bookingId = params.get("booking_id") || 
                  (location.state as { bookingId?: string } | null)?.bookingId || 
                  sessionStorage.getItem("pending_booking_id") || "";
                  
  const isReservation = (location.state as { isReservation?: boolean } | null)?.isReservation || 
                        sessionStorage.getItem("pending_is_reservation") === "true";
  
  const [status, setStatus] = useState<"verifying" | "confirmed" | "error">("verifying");
  const [showFeedback, setShowFeedback] = useState(false);
  const [passengerName, setPassengerName] = useState("");

  useEffect(() => {
    if (!bookingId) { 
      // Small timeout to wait for params/state to load on some mobile devices
      const timer = setTimeout(() => {
        const fallbackId = sessionStorage.getItem("pending_booking_id");
        if (!fallbackId) {
          console.error("No booking ID found in Success page after delay");
          setStatus("error");
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    if (isReservation) {
      // For reservations, we don't need to update Supabase status (it's already 'pending')
      setStatus("confirmed");
      sessionStorage.removeItem("pending_booking_id");
      sessionStorage.removeItem("pending_qr_code");
      sessionStorage.removeItem("pending_is_reservation");
      const nextTimer = setTimeout(() => {
         navigate(`/ticket/${bookingId}`);
      }, 1500);
      return () => clearTimeout(nextTimer);
    }

    // Confirm the booking as paid. The payment itself is verified on the
    // PayMongo side (checkout session); here we only mark the booking paid for
    // the owner. No secret key ever reaches the browser.
    const processPayment = async () => {
      try {
        const isGroup = sessionStorage.getItem("pending_is_group") === "true";
        const bookingIdsStr = sessionStorage.getItem("pending_booking_ids");

        // Only the passenger who owns the booking may mark it paid.
        const { data: user } = await supabase.auth.getUser();
        const currentUid = user?.user?.id;

        const canMarkPaid = async (id: string) => {
          const { data: b } = await supabase.from("bookings").select("user_id, status").eq("id", id).single();
          if (!b) return false;
          if (b.status === "paid" || b.status === "boarded" || b.status === "counter") return true;
          if (currentUid && b.user_id && b.user_id !== currentUid) return false;
          return true;
        };

        if (isGroup && bookingIdsStr) {
          const ids = bookingIdsStr.split(",");
          const allowed: string[] = [];
          for (const id of ids) {
            if (await canMarkPaid(id)) allowed.push(id);
          }
          if (allowed.length === 0) throw new Error("Not authorized to confirm this booking.");

          const { error } = await supabase.from("bookings").update({ status: "paid" }).in("id", allowed);
          if (error) throw error;

          const booking = await getBookingById(allowed[0]);
          if (booking) setPassengerName(booking.passengerName + " & Group");

          // Cache group bookings mapping in localStorage so it persists even on page refresh
          localStorage.setItem(`group_bookings_${allowed[0]}`, JSON.stringify(allowed));

          sessionStorage.removeItem("pending_booking_ids");
          sessionStorage.removeItem("pending_is_group");
          sessionStorage.removeItem("pending_booking_id");
          sessionStorage.removeItem("pending_qr_code");
          setStatus("confirmed");

          setTimeout(() => {
            navigate(`/ticket/${allowed[0]}`, { state: { isGroup: true, bookingIds: allowed } });
          }, 1500);
        } else {
          if (!(await canMarkPaid(bookingId))) throw new Error("Not authorized to confirm this booking.");

          // Mark online booking as paid in Supabase
          const { error } = await supabase.from("bookings").update({ status: "paid" }).eq("id", bookingId);
          if (error) throw error;

          const booking = await getBookingById(bookingId);
          if (booking) setPassengerName(booking.passengerName);

          sessionStorage.removeItem("pending_booking_id");
          sessionStorage.removeItem("pending_qr_code");
          setStatus("confirmed");

          setTimeout(() => {
            navigate(`/ticket/${bookingId}`);
          }, 1500);
        }
      } catch (err) {
        console.error("Payment confirmation failed:", err);
        setStatus("error");
      }
    };

    processPayment();
  }, [bookingId, isReservation, navigate]);


  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-2xl p-10 text-center max-w-sm w-full">
        {status === "verifying" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="font-display font-bold text-foreground text-lg">
              {isReservation ? "Processing Reservation…" : "Confirming payment…"}
            </p>
            <p className="text-muted-foreground text-sm mt-2">Please wait</p>
          </>
        )}
        {status === "confirmed" && (
          <>
            {isReservation ? (
              <CalendarCheck className="w-16 h-16 text-primary mx-auto mb-4" />
            ) : (
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            )}
            <p className={`font-display font-bold text-xl ${isReservation ? "text-primary" : "text-green-500"}`}>
              {isReservation ? "Reservation Confirmed!" : "Payment Confirmed!"}
            </p>
            <p className="text-muted-foreground text-sm mt-2">Generating your ticket…</p>
          </>
        )}
        {status === "error" && (
          <>
            <p className="font-display font-bold text-destructive text-xl mb-2">Something went wrong</p>
            <p className="text-muted-foreground text-sm mb-6">
              {isReservation 
                ? "Failed to finalize your reservation. Please try again."
                : "Your payment may have been processed. Please contact support."
              }
            </p>
            <button onClick={() => navigate("/")} className="btn-ocean px-6 py-3 rounded-xl font-bold">Go Home</button>
          </>
        )}
      </motion.div>

    </div>
  );
};

export default PaymentSuccess;