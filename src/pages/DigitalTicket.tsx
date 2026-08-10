import { useRef, useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { getBookingById, getShipById, Booking, Ship, submitReview, hasReviewForBooking, supabase, dbToBooking, getCounterDeadline } from "@/lib/store";
import FeedbackModal from "@/components/FeedbackModal";
import {
  ArrowLeft, Download, Ship as ShipIcon, Calendar, Clock,
  MapPin, Armchair, User, Loader2, CheckCircle, QrCode, AlertTriangle, ShieldAlert, Wallet
} from "lucide-react";

// Load html-to-image from CDN once
function loadHtmlToImage(): Promise<any> {
  return new Promise((resolve) => {
    if ((window as any).htmlToImage) return resolve((window as any).htmlToImage);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js";
    script.onload = () => resolve((window as any).htmlToImage);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

import { QRCodeSVG } from "qrcode.react";

const QRImage = ({ value, size = 160 }: { value: string; size?: number }) => {
  return (
    <QRCodeSVG
      value={value}
      size={size}
      level={"H"}
      includeMargin={false}
      className="rounded-lg"
    />
  );
};

const STATUS_COLOR: Record<string, string> = {
  paid: "bg-primary/20 text-primary",
  boarded: "bg-secondary/20 text-secondary",
  pending: "bg-muted/50 text-muted-foreground",
  counter: "bg-[#B45309]/20 text-[#F59E0B]",
  cancelled: "bg-red-500/20 text-red-500",
  expired: "bg-zinc-500/20 text-zinc-400",
};

const TYPE_COLOR: Record<string, string> = {
  regular: "bg-primary/20 text-primary",
  student: "bg-secondary/20 text-secondary",
  senior: "bg-amber-500/20 text-amber-500",
  pwd: "bg-violet-500/20 text-violet-500",
};

const DigitalTicket = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const ticketRef = useRef<HTMLDivElement>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [ship, setShip] = useState<Ship | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Group tickets state
  const [groupBookings, setGroupBookings] = useState<Booking[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (!bookingId) return;
    getBookingById(bookingId).then(async (b) => {
      if (b) { 
        setBooking(b); 
        const s = await getShipById(b.shipId); 
        setShip(s); 

        // Query sister bookings saved at the same moment in time
        const { data: siblingsData } = await supabase
          .from("bookings")
          .select("*")
          .eq("ship_id", b.shipId)
          .eq("trip_date", b.tripDate)
          .eq("created_at", b.createdAt);

        if (siblingsData && siblingsData.length > 1) {
          const siblings = siblingsData.map(row => dbToBooking(row));
          const sorted = siblings.sort((x, y) => x.seatLabel.localeCompare(y.seatLabel));
          setGroupBookings(sorted);
          const currentIdx = sorted.findIndex(x => x.id === bookingId);
          if (currentIdx !== -1) setActiveIdx(currentIdx);
        } else {
          setGroupBookings([b]);
          setActiveIdx(0);
        }
        
        // Trigger feedback modal after 2 seconds if not already reviewed
        const alreadyReviewed = await hasReviewForBooking(bookingId);
        if (!alreadyReviewed) {
          setTimeout(() => setShowFeedback(true), 2000);
        }
      }
      setLoading(false);
    });
  }, [bookingId]);

  const activeBooking = groupBookings[activeIdx] || booking;

  const handleFeedbackSubmit = async (rating: number, surveyData: any, comment: string) => {
    try {
      await submitReview({
        bookingId: activeBooking?.id || bookingId!,
        rating,
        surveyData,
        comment,
        passengerName: activeBooking?.passengerName || "Passenger"
      });
    } catch (e) {
      console.error("Feedback submission failed:", e);
    } finally {
      setShowFeedback(false);
    }
  };

  const handleDownload = useCallback(async () => {
    if (!ticketRef.current || !activeBooking) return;
    setDownloading(true);
    try {
      // Wait for QR image to load
      await new Promise(r => setTimeout(r, 300));

      const lib = await loadHtmlToImage();
      if (!lib) throw new Error("Library failed to load");

      const dataUrl = await lib.toPng(ticketRef.current, {
        backgroundColor: "#0f172a",
        pixelRatio: 3,
        cacheBust: true,
        // Fix cross-origin QR image
        fetchRequestInit: { mode: "cors" },
      });

      const link = document.createElement("a");
      link.download = `SmartPort-Ticket-${activeBooking.passengerName}-${activeBooking.seatLabel || activeBooking.qrCode}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Download failed:", e);
      alert("Download failed. Try taking a screenshot instead.");
    } finally {
      setDownloading(false);
    }
  }, [activeBooking]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen gap-3 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading ticket...
    </div>
  );

  if (!booking) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-8 text-center">
      <QrCode className="w-16 h-16 text-muted-foreground/30" />
      <p className="font-display font-bold text-foreground text-xl">Ticket Not Found</p>
      <p className="text-muted-foreground text-sm">This ticket may have been removed or the link is invalid.</p>
      <button onClick={() => navigate("/my-tickets")} className="px-6 py-3 btn-ocean rounded-xl font-display font-bold">
        My Tickets
      </button>
    </div>
  );

  const routeDisplay = activeBooking.boardStop && activeBooking.alightStop
    ? `${activeBooking.boardStop} → ${activeBooking.alightStop}`
    : ship?.route ?? "—";

  const dateDisplay = activeBooking.tripDate
    ? new Date(activeBooking.tripDate + "T00:00:00").toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : ship?.date ?? "—";

  return (
    <div className="min-h-screen px-4 py-6 max-w-md mx-auto">
      {/* Top nav */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 glass-card rounded-xl hover:bg-muted/50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-display text-xl font-bold text-foreground">Your Ticket</h1>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-bold capitalize ${STATUS_COLOR[activeBooking.status] ?? "bg-muted text-muted-foreground"}`}>
          {activeBooking.status}
        </span>
      </div>

      {/* Group Navigation Slider */}
      {groupBookings.length > 1 && (
        <div className="flex items-center justify-between bg-white/5 rounded-2xl p-3 mb-4 border border-white/5">
          <button
            disabled={activeIdx === 0}
            onClick={() => setActiveIdx(activeIdx - 1)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 rounded-xl font-bold text-xs transition-all text-[#E3000F] cursor-pointer"
          >
            ← Prev Ticket
          </button>
          <span className="text-xs font-bold text-[#8895A7]">
            Ticket {activeIdx + 1} of {groupBookings.length}
          </span>
          <button
            disabled={activeIdx === groupBookings.length - 1}
            onClick={() => setActiveIdx(activeIdx + 1)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 rounded-xl font-bold text-xs transition-all text-[#E3000F] cursor-pointer"
          >
            Next Ticket →
          </button>
        </div>
      )}

      {/* Ticket card — this is what gets saved as image */}
      <motion.div
        ref={ticketRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl overflow-hidden"
        style={{ background: "#0f172a" }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/20 to-secondary/10 p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <ShipIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-display font-bold text-foreground">{ship?.name || "SmartPort Vessel"}</p>
                <p className="text-xs text-muted-foreground">Ferry Ticket</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${TYPE_COLOR[activeBooking.passengerType] ?? TYPE_COLOR.regular}`}>
                {activeBooking.passengerType}
              </span>
              {activeBooking.idVerificationStatus === "verified" && (
                <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle className="w-2 h-2" /> Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2.5">
              <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Passenger</p>
                <p className="text-foreground font-medium text-sm">{activeBooking.passengerName}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Armchair className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Seat</p>
                <p className="text-primary font-bold text-lg leading-none mt-0.5">{activeBooking.seatLabel}</p>
                {activeBooking.accommodationType && (
                  <p className="text-xs text-muted-foreground capitalize">{activeBooking.accommodationType}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Route</p>
              <p className="text-foreground font-medium text-sm">{routeDisplay}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-foreground font-medium text-sm">{dateDisplay}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Departure</p>
                <p className="text-foreground font-medium text-sm">{ship?.departure ?? "—"}</p>
              </div>
            </div>
          </div>

          {activeBooking.legPrice && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount Paid</span>
              <span className="font-display font-bold text-primary text-xl">₱{activeBooking.legPrice.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Dashed divider */}
        <div className="px-5 relative">
          <div className="border-t-2 border-dashed border-border" />
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-border" />
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-border" />
        </div>

        {/* QR Code or Cancelled Status */}
        <div className="p-5 flex flex-col items-center gap-3 relative">
          {activeBooking.status === "expired" ? (
            <div className="bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 p-6 rounded-2xl w-full text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-80" />
              <p className="font-display font-bold text-xl uppercase tracking-widest mb-1">Booking Expired</p>
              <p className="text-xs text-zinc-400 mb-5">Payment was not completed within the 3-hour window, so your seat was released.</p>
              <button onClick={() => navigate("/booking")}
                className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/90 transition-all cursor-pointer">
                Book Again
              </button>
            </div>
          ) : activeBooking.status === "cancelled" ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl w-full text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-80" />
              <p className="font-display font-bold text-xl uppercase tracking-widest mb-1">Trip Cancelled</p>
              <p className="text-xs text-red-400">Please contact Port Support to arrange a re-booking or request a refund.</p>
            </div>
          ) : activeBooking.status === "pending" ? (
            <div className="bg-amber-500/10 border border-amber-500/20 p-8 rounded-3xl w-full text-center relative overflow-hidden">
               {/* Background Blur Effect */}
               <div className="absolute inset-0 bg-white/5 backdrop-blur-sm pointer-events-none" />
               
               <div className="relative z-10 flex flex-col items-center">
                 <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 mb-6 border border-amber-500/30">
                    <ShieldAlert className="w-8 h-8 animate-pulse" />
                 </div>
                 <h3 className="font-display font-black text-xl text-white uppercase tracking-widest mb-2">Payment Verification Required</h3>
                 <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px] mx-auto mb-8 font-medium">
                   Your QR code will be generated once your ID is verified and payment is successfully processed.
                 </p>
                 
                 {activeBooking.idVerificationStatus === 'verified' || activeBooking.passengerType?.toLowerCase() === 'regular' ? (
                   <button 
                    onClick={() => navigate(`/payment/${activeBooking.shipId}/${activeBooking.seatId}`, {
                      state: { 
                        bookingId: activeBooking.id,
                        name: activeBooking.passengerName,
                        phone: activeBooking.phone,
                        passengerType: activeBooking.passengerType,
                        price: activeBooking.legPrice,
                        seatLabel: activeBooking.seatLabel,
                        idVerificationStatus: activeBooking.idVerificationStatus
                      }
                    })}
                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 transform hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                   >
                     Continue to Payment
                   </button>
                 ) : (
                   <button 
                    onClick={() => navigate("/my-tickets")}
                    className="w-full py-4 bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest border border-white/10 cursor-pointer"
                   >
                     Check Status
                   </button>
                 )}
               </div>
            </div>
          ) : activeBooking.status === "counter" ? (
            <div className="bg-[#B45309]/10 border border-[#B45309]/20 p-5 rounded-3xl w-full text-center relative overflow-hidden">
               <div className="absolute inset-0 bg-white/5 backdrop-blur-sm pointer-events-none" />

               <div className="relative z-10 flex flex-col items-center">
                 <div className="flex items-center gap-1.5 text-[#F59E0B] text-[10px] font-black uppercase tracking-widest mb-4">
                    <Wallet className="w-3.5 h-3.5" /> Reserved — not yet activated
                 </div>
                 <div className="bg-white p-3 rounded-2xl shadow-inner relative">
                    <QRImage value={activeBooking.qrCode} size={180} />
                    <div className="absolute inset-0 bg-[#B45309]/10 backdrop-blur-[2px] rounded-2xl flex items-center justify-center pointer-events-none">
                      <span className="px-3 py-1 bg-[#B45309] text-white text-[10px] font-black uppercase tracking-widest rounded-full -rotate-6 border border-[#F59E0B]/50 shadow-lg">
                        Not Active
                      </span>
                    </div>
                 </div>
                 <p className="font-mono text-sm text-[#F59E0B] font-bold tracking-widest mt-3">{activeBooking.qrCode}</p>
                 <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-[270px]">
                    Show this code at the terminal counter. Staff will scan it, take your payment, and activate the boarding QR.
                 </p>
                 <p className="text-[#F59E0B] text-xs font-bold mt-4 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Pay by {getCounterDeadline(activeBooking).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
                 </p>
               </div>
            </div>
          ) : (
            <>
              <div className="bg-white p-3 rounded-2xl shadow-inner">
                <QRImage value={activeBooking.qrCode} size={180} />
              </div>
              <div className="text-center">
                <p className="font-mono text-sm text-foreground font-bold tracking-widest">{activeBooking.qrCode}</p>
                <p className="text-xs text-muted-foreground mt-1">Show this code at boarding</p>
              </div>
            </>
          )}
          {activeBooking.status === "boarded" && (
            <div className="flex items-center gap-1.5 text-secondary text-sm font-medium">
              <CheckCircle className="w-4 h-4" /> Already Boarded
            </div>
          )}
        </div>
      </motion.div>

      {/* Actions */}
      <div className="mt-4 space-y-3">
        <motion.button
          whileHover={{ scale: (downloading || activeBooking.status !== "paid") ? 1 : 1.02 }}
          whileTap={{ scale: (downloading || activeBooking.status !== "paid") ? 1 : 0.98 }}
          onClick={handleDownload}
          disabled={downloading || activeBooking.status !== "paid"}
          className={`w-full py-4 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeBooking.status === "paid" ? "btn-ocean" : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          {downloading
            ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving image...</>
            : <><Download className="w-5 h-5" /> Download as Image</>
          }
        </motion.button>
        <button
          onClick={() => navigate("/my-tickets")}
          className="w-full py-3 rounded-2xl glass-card border border-border text-foreground font-display font-semibold"
        >
          All My Tickets
        </button>
        <button
          onClick={() => navigate("/booking")}
          className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Booking
        </button>
      </div>

      <FeedbackModal 
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        onSubmit={handleFeedbackSubmit}
        passengerName={booking?.passengerName || "Passenger"}
      />
    </div>
  );
};

export default DigitalTicket;