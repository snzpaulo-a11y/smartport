import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { addScanRecord, updateBooking, generateId, getLocalDate, getCounterDeadline, BookingRow } from "@/lib/store";
import {
  ScanLine, ArrowLeft, Keyboard, AlertTriangle,
  CheckCircle, XCircle, Camera, CameraOff, Loader2, ShieldAlert, X, LogOut, Users, Wallet
} from "lucide-react";
import { supabase } from "@/lib/store";
import { Html5Qrcode } from "html5-qrcode";

type ScanDisplayBooking = {
  passengerName: string; passengerType: string; seatLabel: string;
  boardStop?: string | null; alightStop?: string | null;
  legPrice?: number | null; basePrice?: number;
};

const ScannerPage = () => {
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<{
    type: "success" | "duplicate" | "invalid" | "counter";
    message: string;
    booking?: ScanDisplayBooking;
  } | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const hasScanned = useRef(false);

  const scanStaffStr = sessionStorage.getItem("scanStaff");
  const scanStaff = scanStaffStr ? JSON.parse(scanStaffStr) : null;
  const staffId = scanStaff?.id;
  const staffName = scanStaff?.name;
  const assignedShipId = scanStaff?.shipId;
  const assignedShipType = scanStaff?.shipType;
  const isSuperAdmin = scanStaff?.role === "super_admin";

  const [assignedShipName, setAssignedShipName] = useState<string | null>(null);

  useEffect(() => {
    if (assignedShipId) {
      supabase.from("ships").select("name").eq("id", assignedShipId).maybeSingle().then(({ data }) => {
        if (data) setAssignedShipName(data.name);
      });
    }
    console.log("Scanner Initialized:", { staffId, staffName, assignedShipId, assignedShipType });
  }, [assignedShipId]);

  const startCamera = async () => {
    setStarting(true); hasScanned.current = false; setScanResult(null);
    try {
      // Delay slightly so the DOM can render the #qr-reader div if cameraActive becomes true
      setCameraActive(true);

      // Delay init until next frame so #qr-reader is mounted
      setTimeout(async () => {
        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode("qr-reader");
        }
        try {
          await html5QrCodeRef.current.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              if (!hasScanned.current) {
                hasScanned.current = true;
                stopCamera();
                processScan(decodedText);
              }
            },
            () => { } // ignore frame scanning errors
          );
          setStarting(false);
        } catch (err) {
          console.error("Camera start error:", err);
          alert("Could not access camera.\nError: " + String(err));
          setCameraActive(false);
          setStarting(false);
        }
      }, 100);

    } catch (err) {
      console.error("Camera init error:", err);
      setStarting(false);
    }
  };

  const stopCamera = () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      html5QrCodeRef.current.stop().catch(() => { });
    }
    setCameraActive(false);
  };

  useEffect(() => () => stopCamera(), []);

  const processScan = async (code: string) => {
    if (processing) return;
    setProcessing(true);
    try {
      const cleanCode = code.trim();
      const { data: firstBooking } = await supabase
        .from("bookings").select("*").eq("qr_code", cleanCode).maybeSingle();
      let booking = firstBooking as BookingRow | null;

      if (!booking) {
        const altCode = cleanCode.replace(/^SPT-/, "");
        const { data: altBooking } = await supabase
          .from("bookings").select("*")
          .or(`id.eq.${cleanCode},id.eq.${altCode},qr_code.eq.SPT-${cleanCode},qr_code.eq.${altCode}`)
          .maybeSingle();
        if (altBooking) booking = altBooking as BookingRow;
      }

      if (!booking) {
        setScanResult({ type: "invalid", message: "No valid booking found" }); return;
      }

      // ── Counter (pay-at-counter) reservation: not yet paid → send to counter ──
      if (booking.status === "counter") {
        const today = getLocalDate();
        const ticketDate = booking.trip_date || "";

        if (ticketDate && ticketDate < today) {
          setScanResult({
            type: "invalid",
            message: "Sorry, this ticket is not up to date.",
            booking: { passengerName: booking.passenger_name, passengerType: booking.passenger_type, seatLabel: booking.seat_label },
          });
          return;
        }
        if (ticketDate && ticketDate > today) {
          const formattedDate = new Date(ticketDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
          setScanResult({
            type: "invalid",
            message: `Your ticket is for ${formattedDate}`,
            booking: { passengerName: booking.passenger_name, passengerType: booking.passenger_type, seatLabel: booking.seat_label },
          });
          return;
        }

        const { data: ship } = await supabase.from("ships").select("*").eq("id", booking.ship_id).maybeSingle();

        if (!isSuperAdmin && assignedShipId && booking.ship_id !== assignedShipId) {
          setScanResult({
            type: "invalid",
            message: `UNAUTHORIZED: Ticket is for ${ship?.name || "another ship"}`,
            booking: { passengerName: booking.passenger_name, passengerType: booking.passenger_type, seatLabel: booking.seat_label },
          });
          return;
        }
        if (!isSuperAdmin && assignedShipType && ship?.type !== assignedShipType) {
          setScanResult({
            type: "invalid",
            message: `UNAUTHORIZED: This scanner is restricted to ${assignedShipType.toUpperCase()}s only!`,
            booking: { passengerName: booking.passenger_name, passengerType: booking.passenger_type, seatLabel: booking.seat_label },
          });
          return;
        }

        if (getCounterDeadline({ counterDeadline: booking.counter_deadline ?? undefined, createdAt: booking.created_at }).getTime() <= Date.now()) {
          setScanResult({
            type: "invalid",
            message: "Counter hold expired — seat has been released.",
            booking: { passengerName: booking.passenger_name, passengerType: booking.passenger_type, seatLabel: booking.seat_label },
          });
          return;
        }

        setScanResult({
          type: "counter",
          message: "PAY AT THE COUNTER",
          booking: { passengerName: booking.passenger_name, passengerType: booking.passenger_type, seatLabel: booking.seat_label },
        });
        return;
      }

      // Only paid/boarded tickets pass through to boarding validation
      if (!["paid", "boarded"].includes(booking.status)) {
        setScanResult({ type: "invalid", message: "Ticket not paid — complete payment first" }); return;
      }

      // ── Ship Details for Validation ──
      const { data: ship } = await supabase.from("ships").select("*").eq("id", booking.ship_id).maybeSingle();


      // ── Validation Phase 0: Trip Date Check ──
      const today = getLocalDate();
      const ticketDate = booking.trip_date || ""; // Ensuring we match the DB column

      if (ticketDate < today) {
        setScanResult({
          type: "invalid",
          message: "Sorry, this ticket is not up to date.",
          booking: { passengerName: booking.passenger_name, passengerType: booking.passenger_type, seatLabel: booking.seat_label }
        });
        return;
      }

      if (ticketDate > today) {
        const formattedDate = new Date(ticketDate).toLocaleDateString("en-PH", { 
          month: "short", day: "numeric", year: "numeric" 
        });
        setScanResult({
          type: "invalid",
          message: `Your ticket is for ${formattedDate}`,
          booking: { passengerName: booking.passenger_name, passengerType: booking.passenger_type, seatLabel: booking.seat_label }
        });
        return;
      }

      // ── Validation Phase 1: Specific Ship ──
      if (!isSuperAdmin && assignedShipId && booking.ship_id !== assignedShipId) {
        setScanResult({
          type: "invalid",
          message: `UNAUTHORIZED: Ticket is for ${ship?.name || "another ship"}`,
          booking: { passengerName: booking.passenger_name, passengerType: booking.passenger_type, seatLabel: booking.seat_label }
        });
        return;
      }

      // ── Validation Phase 2: Ship Type (Ferry vs Pumpboat) ──
      if (!isSuperAdmin && assignedShipType && ship?.type !== assignedShipType) {
        setScanResult({
          type: "invalid",
          message: `UNAUTHORIZED: This scanner is restricted to ${assignedShipType.toUpperCase()}s only!`,
          booking: { passengerName: booking.passenger_name, passengerType: booking.passenger_type, seatLabel: booking.seat_label }
        });
        return;
      }
      const isDuplicate = booking.status === "boarded";

      // Mark boarded first, then record the scan — so a failed status update
      // never leaves a "boarded" scan record behind.
      await updateBooking(booking.id, { status: "boarded" });

      await addScanRecord({
        id: generateId(), bookingId: booking.id,
        passengerName: booking.passenger_name, passengerType: booking.passenger_type,
        seatLabel: booking.seat_label, shipName: ship?.name || "",
        scannedAt: new Date().toISOString(), isDuplicate, staffId, staffName,
      });

      if (isDuplicate) {
        setScanResult({
          type: "duplicate", message: "DUPLICATE — Already boarded!",
          booking: { passengerName: booking.passenger_name, passengerType: booking.passenger_type, seatLabel: booking.seat_label },
        });
        return;
      }

      const result = {
        type: "success" as const, message: "BOARDING CONFIRMED",
        booking: {
          passengerName: booking.passenger_name, passengerType: booking.passenger_type,
          seatLabel: booking.seat_label, boardStop: booking.board_stop, alightStop: booking.alight_stop,
          legPrice: booking.leg_price, basePrice: ship?.price || 0,
        },
      };
      setScanResult(result);
    } catch {
      setScanResult({ type: "invalid", message: "Error processing scan. Try again." });
    } finally { setProcessing(false); }
  };

  const handleManualScan = () => {
    if (manualCode.trim()) { processScan(manualCode.trim()); setManualCode(""); }
  };

  const typeColor: Record<string, string> = {
    regular: "bg-primary/20 text-primary", student: "bg-secondary/20 text-secondary",
    senior: "bg-amber-500/20 text-amber-500", pwd: "bg-violet-500/20 text-violet-500",
  };

  const ptLabel: Record<string, string> = {
    regular: "Regular", student: "Student", senior: "Senior", pwd: "PWD",
  };

  return (
    <div className="min-h-screen px-4 py-6 max-w-md mx-auto">


      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-2 glass-card rounded-xl hover:bg-muted/50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Scanner</h1>
            <div className="flex flex-col">
              {staffName && <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{staffName}</p>}
              {assignedShipName ? (
                <p className="text-[10px] text-primary font-bold">🔒 Restricted: {assignedShipName}</p>
              ) : assignedShipType ? (
                <p className="text-[10px] text-secondary font-bold">🔒 Restricted: {assignedShipType.toUpperCase()}S</p>
              ) : (
                <p className="text-[10px] text-amber-500 font-bold">🔓 All Access (Super Admin)</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/scan-history")} className="p-2 glass-card rounded-xl hover:bg-muted/50 transition-colors" title="Vessel Manifest">
            <Users className="w-5 h-5 text-foreground" />
          </button>
          <button onClick={() => { sessionStorage.clear(); navigate("/"); }}
            className="p-2 glass-card rounded-xl hover:bg-destructive/20 transition-colors text-muted-foreground">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Camera Scanner */}
      <div className="glass-card rounded-2xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold text-foreground">Camera Scanner</h2>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} onClick={cameraActive ? stopCamera : startCamera} disabled={starting}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-all disabled:opacity-60 ${cameraActive ? "bg-destructive/20 text-destructive" : "btn-ocean"
              }`}>
            {starting ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</> :
              cameraActive ? <><CameraOff className="w-4 h-4" /> Stop</> :
                <><Camera className="w-4 h-4" /> Start</>}
          </motion.button>
        </div>

        <div className={`relative rounded-xl overflow-hidden bg-black ${cameraActive ? "block" : "hidden"}`} style={{ minHeight: "320px" }}>
          <div id="qr-reader" className="w-full h-full absolute inset-0 [&>video]:object-cover [&>video]:h-full" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-56 h-56 border-2 border-primary rounded-2xl relative">
              <span className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-xl" />
              <span className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-xl" />
              <span className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-xl" />
              <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-xl" />
              <motion.div animate={{ y: ["0%", "100%", "0%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute left-2 right-2 h-0.5 bg-primary/70 rounded-full" />
            </div>
          </div>
          <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/70 z-10">Point camera at QR code</p>
        </div>

        {!cameraActive && !starting && (
          <div className="text-center py-8">
            <Camera className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Tap Start to scan a QR code</p>
          </div>
        )}
        {processing && (
          <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Checking booking...</span>
          </div>
        )}
      </div>

      {/* Manual Input */}
      <div className="glass-card rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Keyboard className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-foreground">Manual Entry</h2>
        </div>
        <div className="flex gap-2">
          <input value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="SPT-XXXXXXXXXXXX"
            className="flex-1 px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleManualScan()} />
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={handleManualScan} disabled={processing} className="btn-ocean px-5 rounded-xl disabled:opacity-60">
            {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanLine className="w-5 h-5" />}
          </motion.button>
        </div>
      </div>

      {/* Scan Result */}
      {scanResult && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className={`rounded-2xl p-6 mb-6 border glass-card ${scanResult.type === "success" ? "border-green-500/50" :
            scanResult.type === "duplicate" || scanResult.type === "counter" ? "border-amber-500/50" : "border-destructive/50"
            }`}>
          <div className="text-center mb-4">
            {scanResult.type === "success" && <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-2" />}
            {scanResult.type === "duplicate" && <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-2" />}
            {scanResult.type === "counter" && <Wallet className="w-16 h-16 text-amber-500 mx-auto mb-2" />}
            {scanResult.type === "invalid" && <XCircle className="w-16 h-16 text-destructive mx-auto mb-2" />}
            <p className={`font-display font-bold text-lg ${scanResult.type === "success" ? "text-green-500" :
              scanResult.type === "duplicate" || scanResult.type === "counter" ? "text-amber-500" : "text-destructive"
              }`}>{scanResult.message}</p>
            {scanResult.type === "counter" && (
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-bold">
                Unpaid reservation — collect payment at the terminal counter
              </p>
            )}
          </div>
          {scanResult.booking && (
            <div className="text-center space-y-1">
              <p className="text-muted-foreground text-xs uppercase tracking-widest font-semibold">Active Passenger</p>
              <h3 className="text-2xl font-display font-bold text-foreground">{scanResult.booking.passengerName}</h3>
              <p className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                SEAT {scanResult.booking.seatLabel}
              </p>
            </div>
          )}
          <button onClick={() => { setScanResult(null); hasScanned.current = false; }}
            className="w-full mt-6 py-4 rounded-xl bg-primary text-[#0A1118] font-bold hover:bg-[#FF3B47] transition-all shadow-[0_0_20px_rgba(227, 0, 15,0.2)]">
            Scan Next Passenger
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default ScannerPage;