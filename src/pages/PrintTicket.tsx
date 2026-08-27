import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getBookingById, getShipById, Booking, Ship } from "@/lib/store";
import { Printer, X, User, Armchair, MapPin, Calendar, Clock, CheckCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

const PrintTicket = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [ship, setShip] = useState<Ship | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;
    getBookingById(bookingId).then(async (b) => {
      if (b) {
        setBooking(b);
        const s = await getShipById(b.shipId);
        setShip(s);
        // Auto-open the print dialog once the ticket has rendered
        setTimeout(() => window.print(), 400);
      }
      setLoading(false);
    });
  }, [bookingId]);

  const routeDisplay = booking?.boardStop && booking?.alightStop
    ? `${booking.boardStop} → ${booking.alightStop}`
    : ship?.route ?? "—";

  const dateDisplay = booking?.tripDate
    ? new Date(booking.tripDate + "T00:00:00").toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : ship?.date ?? "—";

  if (loading) return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-md mx-auto">
        <PageSkeleton variant="details" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center px-4 py-8">
      {/* On-screen toolbar (hidden when printing) */}
      <div className="print-hide w-full max-w-md flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-slate-800 text-xl">Print Paper Ticket</h1>
          <p className="text-xs text-slate-500">Give this stub to the passenger.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            onClick={() => window.close()}
            className="px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-800 transition-all"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* A5 paper ticket stub */}
      <div className="print-stub w-full max-w-md bg-white text-slate-900 rounded-2xl overflow-hidden shadow-xl">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-70 font-bold">SmartPort · Boarding Ticket</p>
              <p className="font-display font-bold text-lg leading-tight mt-0.5">{ship?.name || "SmartPort Vessel"}</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2 py-1 rounded-full bg-red-500 text-white text-[9px] font-black uppercase tracking-widest">
                {booking?.passengerType}
              </span>
              {booking?.idVerificationStatus === "verified" && (
                <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-400 uppercase tracking-widest mt-1">
                  <CheckCircle className="w-2.5 h-2.5" /> Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Passenger</p>
                <p className="font-semibold text-sm">{booking?.passengerName}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Armchair className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Seat</p>
                <p className="font-bold text-lg leading-none mt-0.5 text-red-600">{booking?.seatLabel}</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Route</p>
              <p className="font-semibold text-sm">{routeDisplay}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Date</p>
                <p className="font-semibold text-sm">{dateDisplay}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Departure</p>
                <p className="font-semibold text-sm">{ship?.departure ?? "—"}</p>
              </div>
            </div>
          </div>

          {booking?.legPrice ? (
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-slate-500 font-semibold">Amount Paid</span>
              <span className="font-display font-bold text-red-600 text-xl">₱{booking.legPrice.toLocaleString()}</span>
            </div>
          ) : null}
        </div>

        {/* Dashed divider */}
        <div className="px-5 relative">
          <div className="border-t-2 border-dashed border-slate-200" />
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-slate-200" />
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-slate-200" />
        </div>

        {/* QR + reference */}
        <div className="p-5 flex flex-col items-center gap-3">
          <div className="border border-slate-200 rounded-xl p-3">
            {booking?.qrCode && (
              <QRCodeSVG value={booking.qrCode} size={140} level="H" includeMargin={false} />
            )}
          </div>
          <div className="text-center">
            <p className="font-mono text-sm font-bold tracking-widest">{booking?.qrCode}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Show this stub at the gate for boarding</p>
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="border-t border-slate-100 pt-3 text-center text-[8px] uppercase tracking-widest text-slate-400 font-bold">
            Issued by SmartPort Terminal · {new Date().toLocaleString()}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A5; margin: 8mm; }
          body { background: #ffffff !important; }
          .print-hide { display: none !important; }
          .print-stub {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintTicket;
