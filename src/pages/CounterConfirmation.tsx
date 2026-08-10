import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { CalendarClock, Clock, MapPin, Ticket, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";

// ─── Terminal counter details (editable per operator) ─────────────────────────
const COUNTER_NAME = "SmartPort Terminal Counter";
const COUNTER_LOCATION = "SmartPort Passenger Terminal — Ticketing & Collection Booth";
const COUNTER_HOURS = "Open daily, 4:00 AM – 10:00 PM";
const COUNTER_CUTOFF_NOTE = "Reservations are released 1 hour before departure if unpaid.";

const formatDeadline = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-PH", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
};

const CounterConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as {
    bookingIds?: string[];
    refs?: string[];
    deadline?: string;
  };

  const [refs, setRefs] = useState<string[]>([]);
  const [deadline, setDeadline] = useState<string>("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const storedIds = sessionStorage.getItem("pending_counter_booking_ids") || "";
    const storedDeadline = sessionStorage.getItem("pending_counter_deadline") || "";

    const ids = state.bookingIds || (storedIds ? storedIds.split(",") : []);
    const refsFromState = state.refs || ids.map(id => `SPT-${id}`);
    const deadlineValue = state.deadline || storedDeadline;

    setRefs(refsFromState);
    setDeadline(deadlineValue);
  }, []);

  if (refs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-2xl p-8 text-center max-w-sm w-full">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="font-display font-bold text-foreground">Loading reservation…</p>
          <button onClick={() => navigate("/my-tickets")} className="mt-6 btn-ocean px-6 py-3 rounded-xl font-bold text-sm">
            My Tickets
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 max-w-md mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl overflow-hidden mb-6">
        {/* Success header */}
        <div className="p-6 text-center bg-gradient-to-br from-[#B45309]/20 to-[#B45309]/5 border-b border-border">
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", delay: 0.15 }}
            className="w-20 h-20 rounded-full bg-[#B45309]/20 border border-[#B45309]/40 flex items-center justify-center mx-auto mb-4">
            <CalendarClock className="w-10 h-10 text-[#F59E0B]" />
          </motion.div>
          <h1 className="font-display font-bold text-2xl text-foreground mb-1">Seat Reserved!</h1>
          <p className="text-xs text-muted-foreground">Your seat is held — pay at the counter before the deadline.</p>
        </div>

        {/* Reference numbers */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {refs.length > 1 ? "Reference Numbers" : "Reference Number"}
            </p>
            {refs.map(ref => (
              <div key={ref} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-muted/40 border border-border">
                <Ticket className="w-4 h-4 text-primary" />
                <p className="font-mono font-bold text-lg text-foreground tracking-widest">{ref}</p>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground text-center">
              Show this at the counter to claim and pay for your ticket.
            </p>
          </div>

          {/* Counter info */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">{COUNTER_NAME}</p>
                <p className="text-[10px] text-muted-foreground">{COUNTER_LOCATION}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Counter Hours</p>
                <p className="text-[10px] text-muted-foreground">{COUNTER_HOURS}</p>
              </div>
            </div>
            {deadline && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#B45309]/20 flex items-center justify-center shrink-0">
                  <CalendarClock className="w-4 h-4 text-[#F59E0B]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#F59E0B]">Pay by</p>
                  <p className="text-[10px] text-muted-foreground">{formatDeadline(deadline)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-[#B45309]/10 border border-[#B45309]/20 text-center">
            <p className="text-[10px] text-[#F59E0B] font-bold">{COUNTER_CUTOFF_NOTE}</p>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={() => navigate("/my-tickets")}
          className="w-full py-4 rounded-2xl bg-[#B45309] text-white font-display font-bold shadow-xl shadow-[#B45309]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          View My Tickets
        </button>
        <button
          onClick={() => navigate("/booking")}
          className="w-full py-3 rounded-2xl glass-card border border-border text-foreground font-display font-semibold"
        >
          Book Another Trip
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

export default CounterConfirmation;
