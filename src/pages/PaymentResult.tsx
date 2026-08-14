import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase, deleteBooking, getCurrentUser } from "@/lib/store";
import { CheckCircle, XCircle, Loader2, Ticket, Lock } from "lucide-react";

const PaymentResult = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get("bookingId");
  const status = searchParams.get("status");

  const [verifying, setVerifying] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!bookingId) { setVerifying(false); return; }

    const verify = async () => {
      // Wait briefly for PayMongo to process
      await new Promise((r) => setTimeout(r, 1500));

      const { data } = await supabase.from("bookings").select("*").eq("id", bookingId).single();

      // Only the owner of the booking may confirm or release it. Guests can
      // only act on bookings that have no owner.
      const user = await getCurrentUser();
      const currentUid = user?.id || null;
      const ownsBooking = !data || !data.user_id || !currentUid || data.user_id === currentUid;

      if (status === "success" && data) {
        if (!ownsBooking) {
          setDenied(true);
          setVerifying(false);
          return;
        }
        // Mark as paid — this is what makes the seat appear booked for this date
        if (data.status === "pending") {
          await supabase.from("bookings").update({ status: "paid" }).eq("id", bookingId);
          data.status = "paid";
        }
        setBooking(data);
      } else {
        // Payment failed/cancelled — delete the pending booking so seat is freed immediately
        if (data?.status === "pending" && ownsBooking) {
          await deleteBooking(bookingId);
        }
        setBooking(null);
      }

      setVerifying(false);
    };

    verify();
  }, [bookingId, status]);

  if (verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-display">Verifying payment...</p>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="glass-card rounded-3xl p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-12 h-12 text-destructive" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Not Authorized</h1>
          <p className="text-muted-foreground text-sm mb-6">
            This booking belongs to a different account. Log in with the account used to book the ticket.
          </p>
          <div className="space-y-3">
            <button onClick={() => navigate("/my-tickets")}
              className="w-full py-3 rounded-xl btn-ocean font-display font-bold">
              My Tickets
            </button>
            <button onClick={() => navigate("/booking")}
              className="w-full py-3 rounded-xl glass-card border border-border text-muted-foreground font-display font-medium text-sm">
              Back to Booking
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (status === "success" && booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="glass-card rounded-3xl p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-secondary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Payment Successful!</h1>
          <p className="text-muted-foreground text-sm mb-6">Your ticket is confirmed.</p>

          <div className="bg-muted/20 rounded-xl p-4 mb-5 text-sm space-y-2 text-left">
            <div className="flex justify-between"><span className="text-muted-foreground">Passenger</span><span className="text-foreground font-medium">{booking.passenger_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Seat</span><span className="text-foreground font-medium">{booking.seat_label}</span></div>
            {booking.board_stop && (
              <div className="flex justify-between"><span className="text-muted-foreground">Route</span><span className="text-foreground font-medium">{booking.board_stop} → {booking.alight_stop}</span></div>
            )}
            {booking.trip_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="text-foreground font-medium">
                  {new Date(booking.trip_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t border-border pt-2">
              <span className="text-foreground">Amount Paid</span>
              <span className="text-primary">₱{(booking.leg_price || booking.price || 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-6">
            <p className="text-xs text-muted-foreground mb-1">Booking Reference</p>
            <p className="font-display font-bold text-primary text-lg tracking-wider">{booking.qr_code}</p>
          </div>

          <div className="space-y-3">
            <button onClick={() => navigate(`/ticket/${bookingId}`)}
              className="w-full py-3 rounded-xl btn-ocean font-display font-bold flex items-center justify-center gap-2">
              <Ticket className="w-5 h-5" /> View My Ticket
            </button>
            <button onClick={() => navigate("/my-tickets")}
              className="w-full py-3 rounded-xl glass-card border border-border text-foreground font-display font-semibold">
              My Tickets
            </button>
            <button onClick={() => navigate("/booking")}
              className="w-full py-3 rounded-xl glass-card border border-border text-muted-foreground font-display font-medium text-sm">
              Back to Booking
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="glass-card rounded-3xl p-8 max-w-sm w-full text-center">
        <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-12 h-12 text-destructive" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          {status === "cancelled" ? "Payment Cancelled" : "Payment Failed"}
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          Your seat has been released and is available for others.
        </p>
        <div className="space-y-3">
          <button onClick={() => navigate(-3)}
            className="w-full py-3 rounded-xl btn-ocean font-display font-bold">
            Try Again
          </button>
          <button onClick={() => navigate("/booking")}
            className="w-full py-3 rounded-xl glass-card border border-border text-foreground font-display font-semibold">
            Back to Booking
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentResult;