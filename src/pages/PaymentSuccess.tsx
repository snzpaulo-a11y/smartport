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
                  (location.state as any)?.bookingId || 
                  sessionStorage.getItem("pending_booking_id") || "";
                  
  const isReservation = (location.state as any)?.isReservation || 
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

    // Process payment with PayMongo if source exists
    const processPayment = async () => {
      try {
        const sourceId = sessionStorage.getItem("pending_source_id");
        const amountStr = sessionStorage.getItem("pending_amount");
        const SECRET_KEY = import.meta.env.VITE_PAYMONGO_SECRET_KEY as string;

        if (sourceId && amountStr && SECRET_KEY) {
          const authHeader = `Basic ${btoa(SECRET_KEY + ":")}`;
          const payRes = await fetch("https://api.paymongo.com/v1/payments", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader,
            },
            body: JSON.stringify({
              data: {
                attributes: {
                  amount: parseInt(amountStr, 10),
                  currency: "PHP",
                  description: `SmartPort Booking ${bookingId}`,
                  source: {
                    id: sourceId,
                    type: "source",
                  },
                },
              },
            }),
          });

          if (!payRes.ok) {
            const payErr = await payRes.json();
            console.error("PayMongo payment creation error:", payErr);
          } else {
            console.log("PayMongo payment successfully recorded!");
          }

          sessionStorage.removeItem("pending_source_id");
          sessionStorage.removeItem("pending_amount");
        }

        const isGroup = sessionStorage.getItem("pending_is_group") === "true";
        const bookingIdsStr = sessionStorage.getItem("pending_booking_ids");

        if (isGroup && bookingIdsStr) {
          const ids = bookingIdsStr.split(",");
          const { error } = await supabase.from("bookings").update({ status: "paid" }).in("id", ids);
          if (error) throw error;

          const booking = await getBookingById(ids[0]);
          if (booking) setPassengerName(booking.passengerName + " & Group");

          // Cache group bookings mapping in localStorage so it persists even on page refresh
          localStorage.setItem(`group_bookings_${ids[0]}`, JSON.stringify(ids));

          sessionStorage.removeItem("pending_booking_ids");
          sessionStorage.removeItem("pending_is_group");
          sessionStorage.removeItem("pending_booking_id");
          sessionStorage.removeItem("pending_qr_code");
          setStatus("confirmed");

          setTimeout(() => {
            navigate(`/ticket/${ids[0]}`, { state: { isGroup: true, bookingIds: ids } });
          }, 1500);
        } else {
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