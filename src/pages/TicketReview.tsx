import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getShips, Ship, saveBooking, generateId, getLocalDate, getCurrentUser } from "@/lib/store";
import { ArrowLeft, Loader2, AlertTriangle, QrCode, CircleUserRound, Home, Ship as ShipIcon, Calendar, User, ArrowRight, Route, Clock, Armchair, Tag } from "lucide-react";

const TicketReview = () => {
  const { shipId, seatId } = useParams<{ shipId: string; seatId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    name = "Juan Dela Cruz", 
    phone, 
    passengerType = "regular", 
    price = 0, 
    accommodationType = "seat",
    boardStop,
    alightStop,
    legPrice,
    tripDate,
    bookingType = "book",
    idVerified = false,
    verifiedScore = 0,
    deduction = 0,
    basePrice = 0,
    email,
    seatLabel,
    shipName,
    idImageUrl,
    idVerificationStatus,
    bookingId,
    isGroup = false,
    passengers = []
  } = (location.state || {}) as {
    bookingId?: string;
    name: string; 
    phone: string; 
    passengerType: string; 
    price: number; 
    accommodationType: "seat" | "bunk";
    boardStop?: string;
    alightStop?: string;
    legPrice?: number;
    tripDate?: string;
    bookingType?: "book" | "reserve";
    idVerified?: boolean;
    verifiedScore?: number;
    deduction?: number;
    basePrice?: number;
    email?: string;
    seatLabel?: string;
    shipName?: string;
    idImageUrl?: string;
    idVerificationStatus?: string;
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

  const [ship, setShip] = useState<Ship | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    getShips().then((ships) => {
      setShip(ships.find((s) => s.id === shipId) ?? null);
      setLoading(false);
    });
  }, [shipId]);

  if (loading) return <div className="min-h-screen bg-[#0A1118] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#E3000F]" /></div>;
  if (!ship || !name) return <div className="min-h-screen bg-[#0A1118] p-8 text-center text-white">Invalid booking data</div>;

  // Use the passed bookingId or a mock for display if missing
  const displayBookingId = bookingId || `SP-${Math.random().toString().slice(2, 7)}-X`;

  const cleanStr = (s: string) => {
    if (!s) return "";
    const words = s.split(" ");
    return words.filter((w, i) => w !== words[i - 1]).join(" ");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-body pb-24">
      {/* ── Top Header ── */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-xs">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-[#E3000F] hover:text-[#FF3B47] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-display text-lg font-bold tracking-tight text-slate-800">Review Booking</span>
        </div>
        <div className="flex gap-4">
          <button className="text-slate-500 hover:text-slate-700"><QrCode className="w-5 h-5" /></button>
          <button className="text-slate-500 hover:text-slate-700"><CircleUserRound className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 pt-8 pb-12 flex flex-col gap-8">
        
        {/* Title Area */}
        <div className="text-center sm:text-left">
          <p className="text-[#E3000F] text-[10px] font-bold tracking-[0.2em] uppercase mb-2">Step 3 of 4</p>
          <h1 className="font-display text-3xl font-extrabold text-slate-900 mb-1">Final Confirmation</h1>
        </div>

        {/* Trip Details Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
          {/* Subtle gradient glow in the card */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="flex justify-between items-start mb-8 border-b border-slate-100 pb-6 relative z-10">
            <div>
              <p className="text-slate-500 text-[10px] font-bold tracking-[0.1em] uppercase mb-2">Trip Details</p>
              <h2 className="text-slate-950 font-extrabold text-2xl tracking-tight">{ship?.name || shipName || "Starhorse Vessel"}</h2>
            </div>
            <span className="px-4 py-1.5 rounded-full border border-slate-200 text-slate-600 text-[11px] font-bold bg-slate-50 shrink-0 self-center">
              {ship.type === 'pumpboat' ? 'Fast Ferry' : 'Premium Ferry'}
            </span>
          </div>

          {isGroup ? (
            <div className="space-y-6 mb-8 border-b border-slate-100 pb-8 relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-slate-500 text-[10px] font-medium mb-2 flex items-center gap-2">
                   <Route className="w-3.5 h-3.5 text-[#E3000F]"/> Route
                  </p>
                  <p className="text-slate-800 font-bold text-sm">
                    {boardStop && alightStop ? `${cleanStr(boardStop)} → ${cleanStr(alightStop)}` : (ship.route || "").replace("→", " \u2192 ")}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-[10px] font-medium mb-2 flex items-center gap-2">
                   <Clock className="w-3.5 h-3.5 text-[#E3000F]"/> Departure
                  </p>
                  <p className="text-slate-800 font-bold text-sm">
                    {tripDate ? new Date(tripDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "Oct 24, 2026"} | {ship.departure}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase">Group Members</p>
                {passengers.map((p, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 border border-slate-100">
                    <div className="space-y-1">
                      <p className="text-slate-800 font-bold text-sm">{p.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                        {p.type === "pwd" ? "PWD" : p.type === "senior" ? "Senior Citizen" : p.type === "student" ? "Student" : "Adult"} · Seat {p.seatLabel}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-[#E3000F] font-bold">₱{p.price.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-10 gap-x-12 mb-8 border-b border-slate-100 pb-8 relative z-10">
              <div>
                <p className="text-slate-500 text-[10px] font-medium mb-2 flex items-center gap-2">
                 <Route className="w-3.5 h-3.5 text-[#E3000F]"/> Route
                </p>
                <p className="text-slate-800 font-bold text-sm">
                  {boardStop && alightStop ? `${cleanStr(boardStop)} → ${cleanStr(alightStop)}` : (ship.route || "").replace("→", " \u2192 ")}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] font-medium mb-2 flex items-center gap-2">
                 <Clock className="w-3.5 h-3.5 text-[#E3000F]"/> Departure
                </p>
                <p className="text-slate-800 font-bold text-sm">
                  {tripDate ? new Date(tripDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "Oct 24, 2026"} | {ship.departure}
                </p>
              </div>

              <div>
                <p className="text-slate-500 text-[10px] font-medium mb-2 flex items-center gap-2">
                 <User className="w-3.5 h-3.5 text-[#E3000F]"/> Passenger name
                </p>
                <p className="text-slate-800 font-bold text-sm">{name}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] font-medium mb-2 flex items-center gap-2">
                 <Armchair className="w-3.5 h-3.5 text-[#E3000F]"/> Seat number
                </p>
                <p className="text-slate-800 font-bold text-sm">{seatLabel || (seatId?.split("-")?.pop()?.toUpperCase())}</p>
              </div>

              <div>
                <p className="text-slate-500 text-[10px] font-medium mb-2 flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-[#E3000F]"/> Type
                </p>
                <p className="text-slate-800 font-bold text-sm capitalize">{passengerType} Single</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] font-medium mb-2 flex items-center gap-2">
                  <ShipIcon className="w-3.5 h-3.5 text-[#E3000F]"/> Accommodation type
                </p>
                <p className="text-slate-800 font-bold text-sm capitalize">{accommodationType === "bunk" ? "Bunk Bed Access" : "Premium Lounge Access"}</p>
              </div>
            </div>
          )}

          <div className="flex justify-between items-end relative z-10">
            <div>
              <p className="text-slate-500 text-[10px] font-bold tracking-[0.1em] uppercase mb-1">Total Amount</p>
              <p className="text-[40px] leading-none font-extrabold text-slate-900 tracking-tight">
                ₱{isGroup 
                  ? passengers.reduce((sum, p) => sum + p.price, 0).toFixed(2) 
                  : price.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-[9px] font-bold tracking-[0.2em] uppercase mb-0.5">Booking ID</p>
              <p className="text-[#E3000F] text-xs font-bold tracking-widest">
                {isGroup ? passengers[0].bookingId + ` (+${passengers.length - 1} others)` : displayBookingId}
              </p>
            </div>
          </div>
        </div>

        {/* Warning Notice */}
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0 border border-red-200">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-red-950 font-display font-bold text-[17px] mb-1 tracking-wide">Important Notice</h3>
              <p className="text-red-800 text-[13px] leading-relaxed">
                This specific voyage operates under a priority schedule. Once issued, electronic tickets are non-transferable and strictly non-refundable due to limited vessel capacity.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group mt-2" onClick={(e) => { e.preventDefault(); setAgreed(!agreed); }}>
            <div className={`w-[18px] h-[18px] rounded border flex items-center justify-center transition-colors ${agreed ? "bg-[#E3000F] border-[#E3000F]" : "border-slate-300 group-hover:border-slate-400 bg-white"}`}>
              <svg className={`w-3 h-3 text-white pointer-events-none transition-opacity ${agreed ? "opacity-100" : "opacity-0"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-[13px] text-red-900 select-none font-medium">I understand this ticket is non-refundable</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-6 mt-4">
          <button
            onClick={() => {
              if (!agreed) return;
              if (isGroup) {
                const hasUnverifiedDiscount = passengers.some(p => p.type !== "regular" && p.idVerificationStatus !== "verified");
                if (hasUnverifiedDiscount) {
                  sessionStorage.setItem("show_id_pending_modal", "true");
                  navigate("/booking");
                  return;
                }
              } else {
                if (passengerType !== "regular" && idVerificationStatus !== "verified") {
                  sessionStorage.setItem("show_id_pending_modal", "true");
                  navigate("/booking");
                  return;
                }
              }

              const targetSeatId = isGroup ? passengers[0].seatId : seatId;
              // Both 'reserve' and 'book' now go to the payment choice screen
              navigate(`/payment/${shipId}/${targetSeatId}`, {
                state: { 
                  ...location.state,
                  price: isGroup ? passengers.reduce((sum, p) => sum + p.price, 0) : price
                },
              });
            }}
            disabled={!agreed}
            className="w-full bg-[#E3000F] hover:bg-[#FF3B47] text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_30px_rgba(227, 0, 15,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base cursor-pointer"
          >
            Continue to Payment Selection
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
          
          <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-700 text-[13px] font-medium transition-colors cursor-pointer">
            Modify Trip Details
          </button>
        </div>

      </main>

      {/* ── Fixed Bottom App Bar ── */}
      <div className="fixed bottom-0 left-0 w-full z-50 sm:hidden pb-safe px-3">
        <div className="max-w-md mx-auto bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[0_-4px_24px_rgba(15,23,42,0.10),0_8px_32px_rgba(15,23,42,0.06)] rounded-[26px] px-2 py-2">
          <div className="flex items-center justify-between gap-1">
          
          <button onClick={() => navigate("/booking")} className="flex-1 flex flex-col items-center justify-center gap-1 min-h-12 group cursor-pointer">
            <Home className="w-[22px] h-[22px] text-slate-600 group-hover:text-[#E3000F] transition-colors" strokeWidth={2} />
            <span className="text-[10px] font-bold tracking-[0.06em] uppercase text-slate-600">Home</span>
          </button>
          
          <button className="flex-1 flex flex-col items-center justify-center gap-1 bg-[#E3000F] text-white rounded-2xl min-h-12 shadow-[0_8px_20px_rgba(227,0,15,0.35)]">
            <ShipIcon className="w-6 h-6" fill="currentColor" strokeWidth={1.6} />
            <span className="text-[10px] font-bold tracking-[0.06em] uppercase">Bookings</span>
          </button>
          
          <button onClick={() => navigate("/schedules")} className="flex-1 flex flex-col items-center justify-center gap-1 min-h-12 group cursor-pointer">
            <Calendar className="w-[22px] h-[22px] text-slate-600 group-hover:text-[#E3000F] transition-colors" strokeWidth={2} />
            <span className="text-[10px] font-bold tracking-[0.06em] uppercase text-slate-600">Schedule</span>
          </button>
 
          <button onClick={() => navigate("/contact")} className="flex-1 flex flex-col items-center justify-center gap-1 min-h-12 group cursor-pointer">
            <User className="w-[22px] h-[22px] text-slate-600 group-hover:text-[#E3000F] transition-colors" strokeWidth={2} />
            <span className="text-[10px] font-bold tracking-[0.06em] uppercase text-slate-600">Contact</span>
          </button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketReview;