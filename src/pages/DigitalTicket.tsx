import { useRef, useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { getBookingById, getShipById, Booking, Ship, submitReview, hasReviewForBooking, supabase, dbToBooking, getCounterDeadline } from "@/lib/store";
import FeedbackModal from "@/components/FeedbackModal";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import {
  ArrowLeft, Download, Ship as ShipIcon, Calendar, Clock,
  MapPin, Armchair, User, Loader2, CheckCircle, QrCode, AlertTriangle, ShieldAlert, Wallet
} from "lucide-react";

import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";

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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawRow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  label: string,
  value: string,
  valueColor: string,
  valueSize: number,
  fontSize = 13,
  labelColor = "#94a3b8",
  valueBold = 700
) {
  ctx.fillStyle = labelColor;
  ctx.font = `700 ${fontSize}px Inter, Arial, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y);
  const labelWidth = ctx.measureText(label).width;
  ctx.fillStyle = valueColor;
  ctx.font = `${valueBold} ${valueSize}px Inter, Arial, sans-serif`;
  ctx.fillText(value, x, y + valueSize + 2, w - labelWidth);
}

const CANVAS_W = 1081;
const CANVAS_H = 1789;

// The ticket is drawn directly at the device-pixel-native export resolution
// (1081 x 1789) with NO ctx.scale(). Rendering at a fractional upscale (the old
// 618x1024 design scaled ~1.75x) softens the text and looks blurry. By authoring
// every coordinate and font size at the final pixel size, each glyph is
// rasterized once at its true resolution and stays crisp.
const W = 1081;
const H = 1789;
const X = 63;
const CX = 540;

async function drawTicketToCanvas(
  canvas: HTMLCanvasElement,
  booking: Booking,
  ship: Ship | null,
  qrDataUrl: string,
  routeDisplay: string,
  dateDisplay: string
): Promise<string> {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Make sure canvas custom fonts are loaded before first draw.
  try { await document.fonts?.ready; } catch { /* ignore */ }

  const textColor = "#0f172a";
  let y = 306;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Header band
  const grad = ctx.createLinearGradient(0, 0, W, 262);
  grad.addColorStop(0, "#fdeff0");
  grad.addColorStop(1, "#f5f6fb");
  ctx.fillStyle = grad;
  ctx.beginPath();
  roundRect(ctx, 0, 0, W, 262, 52);
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  ctx.font = "800 42px 'Plus Jakarta Sans', Inter, Arial, sans-serif";
  ctx.fillText(ship?.name || "SmartPort Vessel", X, 119);
  ctx.fillStyle = "#64748b";
  ctx.font = "600 21px Inter, Arial, sans-serif";
  ctx.fillText("Ferry Ticket", X, 164);

  // Passenger type badge
  ctx.font = "800 21px Inter, Arial, sans-serif";
  const type = (booking.passengerType || "regular").toUpperCase();
  const tw = ctx.measureText(type).width + 42;
  ctx.beginPath();
  roundRect(ctx, W - X - tw, 87, tw, 49, 25);
  ctx.fillStyle = "#e11d48";
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(type, W - X - tw / 2 - ctx.measureText(type).width / 2, 115);

  drawRow(ctx, X, y, (W - 2 * X) / 2, "PASSENGER", booking.passengerName, textColor, 25, 19);
  drawRow(ctx, CX + X / 2, y, (W - 2 * X) / 2, "SEAT", booking.seatLabel + (booking.accommodationType ? ` · ${booking.accommodationType}` : ""), "#dc2626", 28, 19);
  y += 105;

  drawRow(ctx, X, y, W - 2 * X, "ROUTE", routeDisplay, textColor, 25, 19);
  y += 105;

  drawRow(ctx, X, y, (W - 2 * X) / 2, "DATE", dateDisplay, textColor, 23, 19);
  drawRow(ctx, CX + X / 2, y, (W - 2 * X) / 2, "DEPARTURE", ship?.departure ?? "—", textColor, 23, 19);
  y += 105;

  if (booking.legPrice) {
    ctx.fillStyle = "#fef2f2";
    ctx.beginPath();
    roundRect(ctx, X, y, W - 2 * X, 105, 21);
    ctx.fill();
    ctx.strokeStyle = "#fee2e2";
    ctx.lineWidth = 2.6;
    ctx.stroke();
    drawRow(ctx, X + 31, y + 28, 420, "AMOUNT PAID", `₱${booking.legPrice.toLocaleString()}`, "#dc2626", 32, 19);
    y += 140;
  }

  // Dashed divider
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 4.4;
  ctx.setLineDash([14, 17]);
  ctx.beginPath();
  ctx.moveTo(X, y);
  ctx.lineTo(W - X, y);
  ctx.stroke();
  ctx.setLineDash([]);
  // Notch circles
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(17, y, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.arc(17, y, 38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.arc(W - 17, y, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.arc(W - 17, y, 38, 0, Math.PI * 2);
  ctx.stroke();
  y += 70;

  // QR
  const qrSize = 420;
  const qrImg = new Image();
  await new Promise<void>((resolve, reject) => {
    qrImg.onload = () => resolve();
    qrImg.onerror = () => reject(new Error("QR load failed"));
    qrImg.src = qrDataUrl;
  });
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 3.5;
  roundRect(ctx, CX - qrSize / 2 - 21, y, qrSize + 42, qrSize + 42, 25);
  ctx.fill();
  ctx.stroke();
  ctx.drawImage(qrImg, CX - qrSize / 2, y + 21, qrSize, qrSize);
  y += qrSize + 42 + 31;

  ctx.fillStyle = "#0f172a";
  ctx.font = "800 28px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(booking.qrCode, CX, y);
  ctx.textAlign = "left";
  y += 45;
  ctx.fillStyle = "#94a3b8";
  ctx.font = "700 19px Inter, Arial, sans-serif";
  ctx.fillText("Show this stub at the gate for boarding", CX - ctx.measureText("Show this stub at the gate for boarding").width / 2, y);

  return canvas.toDataURL("image/png");
}

const TYPE_COLOR: Record<string, string> = {
  regular: "bg-primary/20 text-primary",
  student: "bg-secondary/20 text-secondary",
  senior: "bg-amber-500/20 text-amber-500",
  pwd: "bg-violet-500/20 text-violet-500",
};

const DigitalTicket = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [ship, setShip] = useState<Ship | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Group tickets state
  const [groupBookings, setGroupBookings] = useState<Booking[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [justActivated, setJustActivated] = useState(false);
  const groupIdsRef = useRef<string[]>([]);
  const prevStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
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
        if (!alreadyReviewed && !cancelled) {
          setTimeout(() => setShowFeedback(true), 2000);
        }
      }
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; setShowFeedback(false); };
  }, [bookingId]);

  const activeBooking = groupBookings[activeIdx] || booking;

  // Keep the group id list in a ref so the polling effect can reuse it without
  // being torn down every time the list state changes.
  useEffect(() => {
    groupIdsRef.current = groupBookings.map(b => b.id);
  }, [groupBookings]);

  // Live status sync — while any ticket in this booking is waiting on payment
  // (pending/counter), poll Supabase every few seconds. The instant staff
  // approves at the counter (counter → paid) the QR activates itself here, no
  // navigation or refresh needed. Polling stops once nothing is pending.
  useEffect(() => {
    if (!bookingId || loading) return;
    let cancelled = false;

    const refresh = async () => {
      if (document.hidden || cancelled) return;
      try {
        const fresh = await getBookingById(bookingId);
        if (!fresh || cancelled) return;
        setBooking(prev => {
          if (!prev) return fresh;
          const changed =
            prev.status !== fresh.status ||
            prev.qrCode !== fresh.qrCode ||
            prev.legPrice !== fresh.legPrice ||
            prev.passengerType !== fresh.passengerType ||
            prev.idVerificationStatus !== fresh.idVerificationStatus ||
            prev.idRejectedReason !== fresh.idRejectedReason;
          return changed ? fresh : prev;
        });

        // Group bookings: refresh member statuses so every ticket in the slider activates too
        const ids = groupIdsRef.current;
        if (ids.length > 1) {
          const { data } = await supabase.from("bookings").select("*").in("id", ids);
          if (data && !cancelled) {
            const rows = data.map(row => dbToBooking(row)).sort((x, y) => x.seatLabel.localeCompare(y.seatLabel));
            setGroupBookings(prev =>
              prev.some(p => rows.find(r => r.id === p.id)?.status !== p.status) ? rows : prev
            );
          }
        }
      } catch { /* transient network error — retry on next tick */ }
    };

    const interval = setInterval(refresh, 4000);
    const onFocus = () => { refresh(); };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [bookingId, loading, activeBooking?.status, groupBookings.length]);

  // Celebrate the counter → paid flip when it arrives via polling
  useEffect(() => {
    const s = activeBooking?.status ?? null;
    const prev = prevStatusRef.current;
    prevStatusRef.current = s;
    if (prev && s && prev !== s && s === "paid") {
      setJustActivated(true);
      const t = setTimeout(() => setJustActivated(false), 8000);
      return () => clearTimeout(t);
    }
  }, [activeBooking?.status]);

  const handleFeedbackSubmit = async (rating: number, surveyData: Record<string, string>, comment: string) => {
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
    if (!activeBooking) return;
    setDownloading(true);

    // On mobile, popups must be opened synchronously within the user gesture,
    // otherwise iOS Safari treats it as blocked. Open it first, then fill it
    // in once the canvas is ready.
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    let previewWin: Window | null = null;
    if (isMobile) {
      previewWin = window.open("", "_blank");
      if (!previewWin) {
        setDownloading(false);
        alert("Please allow popups to download your ticket, or take a screenshot instead.");
        return;
      }
    }

    let blobUrl: string | null = null;
    try {
      // Give the hidden QRCodeCanvas time to render
      await new Promise(r => setTimeout(r, 300));

      const canvas = canvasRef.current;
      const qr = qrCanvasRef.current && qrCanvasRef.current.toDataURL
        ? qrCanvasRef.current.toDataURL("image/png")
        : null;

      if (!canvas) throw new Error("Canvas not ready");
      if (!qr) throw new Error("QR not ready");

      const route = (activeBooking.boardStop && activeBooking.alightStop)
        ? `${activeBooking.boardStop} → ${activeBooking.alightStop}`
        : ship?.route ?? "—";

      const date = activeBooking.tripDate
        ? new Date(activeBooking.tripDate + "T00:00:00").toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
        : ship?.date ?? "—";

      const qrDataUrl = await drawTicketToCanvas(canvas, activeBooking, ship, qr, route, date);

      const filename = `SmartPort-Ticket-${activeBooking.passengerName}-${activeBooking.seatLabel || activeBooking.qrCode}.png`;

      // Convert the (large) data URL into a Blob URL. Blob URLs are far more
      // reliable than data URLs when opened / downloaded from mobile browsers.
      const blob = await (await fetch(qrDataUrl)).blob();
      blobUrl = URL.createObjectURL(blob);

      if (isMobile) {
        // Try a native download first — modern mobile browsers (incl. iOS 13+
        // and Android Chrome) support programmatic downloads from blob URLs.
        let downloaded = false;
        try {
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = filename;
          link.rel = "noopener";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          downloaded = true;
        } catch (e) {
          console.error("Native download failed on mobile:", e);
        }

        // Only fall back to opening the preview tab if an explicit user-facing
        // popup was actually opened earlier. Safari blocks programmatic
        // downloads, so for it we always guide the user to save via long-press.
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (!downloaded || isIOS) {
          if (!previewWin) throw new Error("Popup unavailable");
          previewWin.document.body.style.margin = "0";
          previewWin.document.body.style.background = "#0f172a";
          previewWin.document.title = filename;
          const img = previewWin.document.createElement("img");
          img.src = blobUrl;
          img.style.maxWidth = "100%";
          img.style.height = "auto";
          img.style.display = "block";
          img.style.margin = "0 auto";
          previewWin.document.body.appendChild(img);
          const hint = previewWin.document.createElement("p");
          hint.style.cssText = "font-family: sans-serif; text-align: center; color: #fff; padding: 16px;";
          hint.textContent = isIOS
            ? "Tap and hold the image, then choose 'Save Image' to save your ticket."
            : "If the download didn't start, tap and hold the image and choose 'Save Image'.";
          previewWin.document.body.appendChild(hint);
        }
      } else {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      console.error("Download failed:", e);
      alert("Download failed. Try taking a screenshot instead.");
    } finally {
      setDownloading(false);
      if (blobUrl) {
        // Clean up after a beat so iOS can still finish reading the blob.
        setTimeout(() => URL.revokeObjectURL(blobUrl!), 15000);
      }
    }
  }, [activeBooking, ship]);

  if (loading) return (
    <div className="max-w-md mx-auto">
      <PageSkeleton variant="details" />
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

      {/* Payment approved live-sync banner */}
      {justActivated && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-center gap-2.5"
        >
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-xs font-bold text-emerald-500">
            Payment approved! Your boarding QR is now active — no need to reload.
          </p>
        </motion.div>
      )}

      {/* Ticket card (on-screen display) */}
      <motion.div
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
              {activeBooking.idVerificationStatus === "rejected" && (
                <span className="flex items-center gap-1 text-[8px] font-bold text-rose-500 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                  <AlertTriangle className="w-2 h-2" /> ID Rejected
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-5 space-y-4">
          {activeBooking.idVerificationStatus === "rejected" && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
              <p className="text-rose-500 font-bold text-xs flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> ID Verification Rejected
              </p>
              {activeBooking.idRejectedReason && (
                <p className="text-[10px] text-rose-400/70 italic mt-1">Reason: {activeBooking.idRejectedReason}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">Your discount has been removed. You are now charged the regular fare.</p>
            </div>
          )}
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
              {activeBooking.idVerificationStatus === "rejected" ? (
                <p className="text-xs text-zinc-400 mb-5">ID verification was not completed in time, so your seat was released.</p>
              ) : (
                <p className="text-xs text-zinc-400 mb-5">Payment was not completed within the 3-hour window, so your seat was released.</p>
              )}
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

      {/* Hidden QR renderer + canvas used to generate the download image */}
      <div aria-hidden className="fixed top-0 left-0 z-[-50] w-0 h-0 overflow-hidden">
        <QRCodeCanvas
          ref={qrCanvasRef}
          value={activeBooking.qrCode}
          size={512}
          level="H"
          includeMargin={false}
        />
        <canvas ref={canvasRef} />
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