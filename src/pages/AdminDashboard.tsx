import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getShips, getStaffList, addStaff, deleteStaff, addShip, deleteShip, toggleShipActive, getScanHistory, generateSeatsForShip, Ship, Staff, ScanRecord, StaffRole, SystemLog, getSystemLogs, addSystemLog, getShipStops, Stop, getReviewsByShip, Review, updateIDVerificationStatus } from "@/lib/store";
import {
  ArrowLeft, Users, Ship as ShipIcon, Armchair, Download, LogOut,
  Lock, Unlock, FileText, Loader2, UserPlus, Trash2, Eye, EyeOff,
  CheckCircle, AlertTriangle, History, UserCog, ChevronDown, ChevronRight,
  Plus, ImageIcon, X, Pencil, Save, ToggleLeft, ToggleRight, MapPin, Clock, ShieldAlert, Power, MessageSquare, Star, RefreshCw, Printer, HandCoins,
  ScanLine, Keyboard, Camera, CameraOff, Wallet, Search
} from "lucide-react";
import { supabase } from "@/lib/store";
import { Html5Qrcode } from "html5-qrcode";

// ─── Defined OUTSIDE component to prevent cursor-jump on re-render ────────────

interface InputFieldProps {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}
const InputField = ({ label, value, onChange, placeholder, type = "text", required = false }: InputFieldProps) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block uppercase font-bold tracking-widest text-[9px]">
      {label}{required && <span className="text-destructive ml-1">*</span>}
    </label>
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type}
      className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all" />
  </div>
);

const BookingRow = ({ b, typeColor, onCollect, onPrint }: { b: any; typeColor: Record<string, string>; onCollect?: (id: string) => void; onPrint?: (id: string) => void }) => (
  <div className="glass-card rounded-xl p-4 flex items-center justify-between gap-3 border-border/50 hover:bg-muted/30 transition-colors">
    <div className="flex items-center gap-4 min-w-0">
      <div className={`w-2 h-10 rounded-full ${typeColor[b.passengerType] || "bg-primary/20"}`} />
      <div>
        <p className="font-bold text-foreground text-sm tracking-tight">{b.passengerName}</p>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Seat {b.seatLabel} · {b.phone}</p>
        {b.boardStop && b.alightStop && <p className="text-[10px] text-primary/70 font-bold mt-1 uppercase tracking-tighter">{b.boardStop} → {b.alightStop}</p>}
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      {b.status === "counter" ? (
        <>
          <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30">
            For Pickup / Unpaid
          </span>
          <button
            onClick={() => onCollect?.(b.id)}
            className="px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/30 transition-all flex items-center gap-1"
            title="Collect payment at the counter and mark as paid"
          >
            <HandCoins className="w-3.5 h-3.5" /> Collect & Mark Paid
          </button>
        </>
      ) : (
        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
          b.status === "boarded"
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.1)]"
            : "bg-primary/10 text-primary border border-primary/20"
        }`}>
          {b.status}
        </span>
      )}
      {(b.status === "paid" || b.status === "boarded") && (
        <button
          onClick={() => onPrint?.(b.id)}
          className="p-2 rounded-xl bg-muted/40 text-muted-foreground border border-border hover:text-primary transition-all"
          title="Print paper ticket"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  </div>
);

const ReservationRow = ({ b, onSelect }: { b: any; onSelect: (id: string) => void }) => (
  <button onClick={() => onSelect(b.id)} className="glass-card rounded-xl p-4 flex items-center justify-between gap-3 border-border/50 hover:bg-muted/30 transition-colors text-left w-full">
    <div className="flex items-center gap-4 min-w-0">
      <div className="w-2 h-10 rounded-full bg-amber-500/40" />
      <div className="min-w-0">
        <p className="font-bold text-foreground text-sm tracking-tight">{b.passengerName || b.passenger_name}</p>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Seat {b.seatLabel || b.seat_label} · {b.phone}</p>
        <p className="text-[10px] text-primary/70 font-bold mt-1 uppercase tracking-tighter font-mono">{b.qr_code}</p>
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30">
        For Pickup / Unpaid
      </span>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  </button>
);

const StaffRow = ({ s, onRevoke }: { s: Staff; onRevoke: (id: string) => void }) => {
  const [showDetails, setShowDetails] = useState(false);
  return (
    <div className="glass-card p-5 rounded-3xl border-border/40 group relative overflow-hidden transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-foreground font-black tracking-tighter shrink-0">
            {s.name[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground leading-tight mb-1 truncate">{s.name}</p>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter opacity-50">{s.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setShowDetails(!showDetails)} className="p-2 text-muted-foreground hover:text-primary transition-colors">
            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button onClick={() => onRevoke(s.id)} className="p-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {showDetails && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-3 pt-4 mt-4 border-t border-border/30 overflow-hidden">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest shrink-0">Email</p>
              <p className="text-[10px] font-bold text-foreground font-mono truncate">{s.email}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest shrink-0">Security Key</p>
              <p className="text-[11px] font-bold text-primary font-mono select-all truncate">{s.password}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Types & Constants ────────────────────────────────────────────────────────
type Tab = "manifest" | "reservations" | "scan" | "seats" | "history" | "staff" | "vessel" | "reviews" | "verification";
function getLocalDate() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
const today = getLocalDate();

function groupByDate(bookings: any[]) {
  const groups: Record<string, Record<string, Record<string, any[]>>> = {};
  for (const b of bookings) {
    const date = b.tripDate || b.createdAt?.split("T")[0] || "Unknown";
    const [year, month, day] = date.split("-");
    if (!groups[year]) groups[year] = {};
    if (!groups[year][month]) groups[year][month] = {};
    if (!groups[year][month][day]) groups[year][month][day] = [];
    groups[year][month][day].push(b);
  }
  return groups;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  
  // Auth Check
  const staffJson = sessionStorage.getItem("adminStaff");
  console.log("[AdminDashboard] staffJson:", staffJson);
  const currentStaff: Staff = staffJson ? JSON.parse(staffJson) : ({} as Staff);
  console.log("[AdminDashboard] currentStaff:", currentStaff);

  useEffect(() => {
    console.log("[AdminDashboard] Auth useEffect firing. staffJson present?", !!staffJson);
    if (!staffJson) {
      console.log("[AdminDashboard] Redirecting to login...");
      navigate("/admin-login", { replace: true });
    }
  }, [staffJson, navigate]);

  const adminType = (currentStaff.shipType || "ferry") as "ferry" | "pumpboat";
  console.log("[AdminDashboard] adminType:", adminType);
  const [ships, setShips]                     = useState<Ship[]>([]);
  const [todayBookings, setTodayBookings]     = useState<any[]>([]);
  const [historyBookings, setHistoryBookings] = useState<any[]>([]);
  const [seats, setSeats]                     = useState<any[]>([]);
  const [staffList, setStaffList]             = useState<Staff[]>([]);
  const [scanHistory, setScanHistory]         = useState<ScanRecord[]>([]);
  const [reviews, setReviews]                 = useState<Review[]>([]);
  const [allShipsForMapping, setAllShipsForMapping] = useState<Ship[]>([]);
  const [selectedShipId, setSelectedShipId]   = useState<string | null>(null);
  const [activeTab, setActiveTab]             = useState<Tab>("manifest");
  console.log("[AdminDashboard] Tab states initialized.");
  const [selectedManifestDate, setSelectedManifestDate] = useState<string>(today);
  const [loading, setLoading]                 = useState(false);
  const [verificationBookings, setVerificationBookings] = useState<any[]>([]);
  const [reservations, setReservations]                 = useState<any[]>([]);
  const [reservationSearch, setReservationSearch]       = useState("");
  const [expandedYears, setExpandedYears]     = useState<string[]>([today.split("-")[0]]);
  const [expandedMonths, setExpandedMonths]   = useState<string[]>([]);

  // ── Counter scanner state ──
  const [scanCameraActive, setScanCameraActive] = useState(false);
  const [scanStarting, setScanStarting]         = useState(false);
  const [scanProcessing, setScanProcessing]     = useState(false);
  const [scanManualCode, setScanManualCode]     = useState("");
  const [scanError, setScanError]               = useState("");
  const [scanSuccessMsg, setScanSuccessMsg]     = useState("");
  const [scanBooking, setScanBooking]           = useState<any | null>(null);
  const scanQrRef = useRef<Html5Qrcode | null>(null);
  const scanHasScanned = useRef(false);

  // Staff and Ship Modals
  const [newName, setNewName]         = useState("");
  const [newEmail, setNewEmail]       = useState("");
  const [newPass, setNewPass]         = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [staffMsg, setStaffMsg]       = useState("");
  const [addingStaff, setAddingStaff] = useState(false);
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [showShipCreate, setShowShipCreate] = useState(false);
  const [requestingShip, setRequestingShip] = useState(false);
  const [shipFormMsg, setShipFormMsg]       = useState("");
  
  const [newShipModel, setNewShipModel] = useState<any>({ 
    name: "", type: adminType, stops: [{ location: "", departure: "", arrival: "-" }, { location: "", departure: "-", arrival: "" }],
    price: 100, totalSeats: 100, scheduleDays: "", paymongoSecretKey: currentStaff?.paymongoSecretKey || "", paymongoPublicKey: currentStaff?.paymongoPublicKey || ""
  });

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingBookingId, setRejectingBookingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("Invalid ID Document");

  const typeColor: Record<string, string> = {
    regular: "bg-primary text-primary-foreground", student: "bg-secondary text-secondary-foreground",
    senior: "bg-amber-500 text-white", pwd: "bg-amber-500 text-white",
  };

  const loadShips = useCallback(async () => {
    const { data: latestStaff } = await supabase.from("staff").select("role, ship_id").eq("id", currentStaff.id).single();
    if (!latestStaff) return;

    const freshRole = latestStaff.role;
    const freshShipIds = latestStaff.ship_id ? latestStaff.ship_id.split(",").map((s: string) => s.trim()) : [];
    
    const all = await getShips();
    setAllShipsForMapping(all); // Keep a list of ALL ships for name lookups
    let filtered = freshRole === "super_admin" 
      ? all.filter(s => s.type === adminType) 
      : all.filter(s => freshShipIds.includes(s.id) || s.requester_id === currentStaff.id);
    
    setShips(filtered);
    if (!selectedShipId && filtered.length > 0) setSelectedShipId(filtered[0].id);
  }, [adminType, currentStaff.id, currentStaff.role, selectedShipId]);

  const loadShipData = useCallback(async () => {
    if (!selectedShipId) return;
    setLoading(true);
    try {
      const { data: tData } = await supabase.from("bookings").select("*").eq("ship_id", selectedShipId).eq("trip_date", selectedManifestDate).in("status", ["paid", "boarded", "counter"]);
      const tripBookings = (tData || []).map(r => ({ ...r, passengerName: r.passenger_name, passengerType: r.passenger_type, seatLabel: r.seat_label, tripDate: r.trip_date, boardStop: r.board_stop, alightStop: r.alight_stop }));
      setTodayBookings(tripBookings.filter(b => b.status !== "counter"));
      setReservations(tripBookings.filter(b => b.status === "counter").sort((a, b) => (a.created_at || "").localeCompare(b.created_at || "")));

      const { data: hData } = await supabase.from("bookings").select("*").eq("ship_id", selectedShipId).lt("trip_date", today).in("status", ["paid", "boarded"]);
      setHistoryBookings((hData || []).map(r => ({ ...r, passengerName: r.passenger_name, passengerType: r.passenger_type, seatLabel: r.seat_label, tripDate: r.trip_date })));

      const { data: sData } = await supabase.from("seats").select("*").eq("ship_id", selectedShipId).order("label");
      setSeats((sData || []).map((s: any) => {
        const booking = (tData || []).find((b: any) => b.seat_id === s.id);
        const status = s.status === "blocked" ? "blocked" : booking ? (booking.status === "counter" ? "reserved" : "booked") : "available";
        return { ...s, status, bookingStatus: booking?.status || null };
      }));

      const shipReviews = await getReviewsByShip(selectedShipId);
      setReviews(shipReviews);

      // Load items pending verification for ALL managed ships
      // If Admin or Super Admin, show ALL pending IDs in the whole system for centralized review
      const managedShipIds = ships.map(s => s.id);
      let query = supabase.from("bookings").select("*").eq("id_verification_status", "pending").neq("status", "expired");
      
      // Only restrict 'scanner' roles to their specific ships
      if (currentStaff.role === "scanner") {
        query = query.in("ship_id", managedShipIds);
      }
      
      const { data: vData } = await query.order("created_at", { ascending: true });
      setVerificationBookings(vData || []);
    } finally { setLoading(false); }
  }, [selectedShipId, selectedManifestDate]);

  useEffect(() => { loadShips(); }, [loadShips]);
  useEffect(() => { loadShipData(); }, [loadShipData]);

  // Real-time: keep reservations + manifest in sync when a passenger books,
  // pays, or cancels (auto-remove cancelled reservations).
  useEffect(() => {
    if (!selectedShipId) return;
    const channel = supabase
      .channel(`admin-bookings-${selectedShipId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings', filter: `ship_id=eq.${selectedShipId}` }, () => loadShipData())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `ship_id=eq.${selectedShipId}` }, () => loadShipData())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'bookings', filter: `ship_id=eq.${selectedShipId}` }, () => loadShipData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedShipId, selectedManifestDate, loadShipData]);
  
  useEffect(() => {
    getStaffList(adminType).then(setStaffList);
  }, [adminType, selectedShipId, activeTab]);

  const handleUpdateVessel = async () => {
    if (!selectedShipId || !currentShip) return;

    if (!confirm("Are you sure you want to save these changes? Architecture modifications will immediately wipe and regenerate the seating matrix.")) return;

    setLoading(true);
    try {
      const stopsArr = getShipStops(currentShip);
      const routeStr = stopsArr.map(s => s.location).filter(Boolean).join(" → ");
      
      await supabase.from("ships").update({ 
        name: currentShip.name, 
        price: currentShip.price, 
        total_seats: currentShip.totalSeats, 
        total_bunks: currentShip.totalBunks || 0, 
        is_active: currentShip.isActive,
        route: routeStr,
        stops: JSON.stringify(stopsArr),
        schedule_days: currentShip.scheduleDays,
        departure: stopsArr[0]?.departure || currentShip.departure,
        arrival: stopsArr[stopsArr.length - 1]?.arrival || currentShip.arrival
      }).eq("id", selectedShipId);

      await generateSeatsForShip(selectedShipId, currentShip.totalSeats, currentShip.totalBunks || 0);
      setShipFormMsg("Vessel architecture & route updated!");
      loadShips();
    } catch (e: any) { setShipFormMsg(e.message); }
    finally { setLoading(false); setTimeout(() => setShipFormMsg(""), 3000); }
  };

  const handleAddStaff = async () => {
    if (!newName || !newEmail || !newPass) return;
    setIsSavingStaff(true);
    try {
      await addStaff(newName, newEmail, newPass, adminType, selectedShipId ? [selectedShipId] : undefined, "scanner");
      setStaffMsg("Staff added!");
      setNewName(""); setNewEmail(""); setNewPass("");
      getStaffList(adminType).then(setStaffList);
      setTimeout(() => {
        setAddingStaff(false);
        setStaffMsg("");
      }, 2000);
    } catch (e: any) {
      setStaffMsg(e.message || "Failed to add staff");
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleStopChange = (idx: number, field: string, val: any) => {
    const next = [...newShipModel.stops];
    next[idx] = { ...next[idx], [field]: val };
    setNewShipModel({ ...newShipModel, stops: next });
  };

  const handleRequestShip = async () => {
    setRequestingShip(true);
    try {
      const routeStr = newShipModel.stops.map((s: any) => s.location).filter(Boolean).join(" → ");
      const id = await addShip({ ...newShipModel, route: routeStr, departure: newShipModel.stops[0].departure, arrival: newShipModel.stops[newShipModel.stops.length-1].arrival, isConfirmed: false, scheduleDays: newShipModel.scheduleDays, requesterId: currentStaff.id, requesterName: currentStaff.name });
      setShipFormMsg("Requested!");
      setTimeout(() => setShowShipCreate(false), 2000);
      loadShips();
    } finally { setRequestingShip(false); }
  };

  const handleVerifyIdentity = async (bookingId: string) => {
    try {
      setLoading(true);
      await updateIDVerificationStatus(bookingId, "verified", true, undefined, currentStaff.id);
      await loadShipData(); // Refresh list
    } catch (err: any) {
      alert("Verification failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectIdentity = async () => {
    if (!rejectingBookingId) return;
    try {
      setLoading(true);
      await updateIDVerificationStatus(rejectingBookingId, "rejected", false, rejectReason, currentStaff.id);
      setShowRejectModal(false);
      setRejectingBookingId(null);
      await loadShipData(); // Refresh list
    } catch (err: any) {
      alert("Action failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Counter collection: cash received at the terminal → mark as paid ────────
  const handleCollectPaid = async (bookingId: string) => {
    if (!confirm("Confirm payment collected at the counter for this booking?")) return;
    setLoading(true);
    try {
      await supabase.from("bookings").update({ status: "paid" }).eq("id", bookingId);
      await addSystemLog("COUNTER_COLLECT", `Collected counter payment for booking ${bookingId}`, currentStaff.name);
      await loadShipData();
    } catch (err: any) {
      alert("Failed to mark as paid: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintTicket = (bookingId: string) => {
    window.open(`/print-ticket/${bookingId}`, "_blank");
  };

  // ── Counter scanner: scan reservation QR → popup → approve → activate QR ────
  const startScanCamera = async () => {
    setScanStarting(true);
    scanHasScanned.current = false;
    setScanError("");
    setScanSuccessMsg("");
    setScanCameraActive(true);
    setTimeout(async () => {
      if (!scanQrRef.current) {
        scanQrRef.current = new Html5Qrcode("admin-qr-reader");
      }
      try {
        await scanQrRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (!scanHasScanned.current) {
              scanHasScanned.current = true;
              stopScanCamera();
              processScanCode(decodedText);
            }
          },
          () => { } // ignore frame scanning errors
        );
        setScanStarting(false);
      } catch (err: any) {
        console.error("Camera start error:", err);
        alert("Could not access camera.\nError: " + String(err));
        setScanCameraActive(false);
        setScanStarting(false);
      }
    }, 100);
  };

  const stopScanCamera = () => {
    if (scanQrRef.current && scanQrRef.current.isScanning) {
      scanQrRef.current.stop().catch(() => { });
    }
    setScanCameraActive(false);
  };

  const processScanCode = async (code: string) => {
    if (scanProcessing) return;
    setScanProcessing(true);
    setScanError("");
    setScanSuccessMsg("");
    try {
      const cleanCode = code.trim();
      let { data: booking } = await supabase.from("bookings").select("*").eq("qr_code", cleanCode).maybeSingle();
      if (!booking) {
        const altCode = cleanCode.replace(/^SPT-/, "");
        const { data: altBooking } = await supabase.from("bookings").select("*")
          .or(`id.eq.${cleanCode},id.eq.${altCode},qr_code.eq.SPT-${cleanCode},qr_code.eq.${altCode}`)
          .maybeSingle();
        if (altBooking) booking = altBooking;
      }
      if (!booking) { setScanError("No booking found for that code."); return; }

      if (booking.status === "counter") { setScanBooking(booking); return; }
      if (["paid", "boarded"].includes(booking.status)) {
        setScanSuccessMsg(`${booking.passenger_name} is already confirmed (${booking.status}) — QR is active.`);
        return;
      }
      setScanError(`Ticket status is "${booking.status}" — not a payable counter reservation.`);
    } catch {
      setScanError("Error processing scan. Try again.");
    } finally {
      setScanProcessing(false);
    }
  };

  const handleScanManual = () => {
    if (scanManualCode.trim()) {
      processScanCode(scanManualCode.trim());
      setScanManualCode("");
    }
  };

  const handleApproveScan = async () => {
    if (!scanBooking) return;
    setLoading(true);
    try {
      await supabase.from("bookings").update({ status: "paid" }).eq("id", scanBooking.id);
      await addSystemLog("COUNTER_APPROVE", `Activated QR for ${scanBooking.passenger_name} (${scanBooking.id})`, currentStaff.name);
      const name = scanBooking.passenger_name;
      setScanBooking(null);
      setScanSuccessMsg(`${name} marked PAID — boarding QR activated`);
      loadShipData();
    } catch (err: any) {
      alert("Failed to approve: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => () => stopScanCamera(), []);
  useEffect(() => { if (activeTab !== "scan") stopScanCamera(); }, [activeTab]);

  const currentShip = ships.find(s => s.id === selectedShipId);
  const filteredReservations = reservations.filter(b => {
    const q = reservationSearch.trim().toLowerCase();
    if (!q) return true;
    return (b.passengerName || "").toLowerCase().includes(q)
      || (b.qr_code || "").toLowerCase().includes(q)
      || (b.id || "").toLowerCase().includes(q);
  });
  const downloadCSV = (bookings: any[], label: string) => {
    const csv = [["Name","Type","Seat","Phone"], ...bookings.map(b => [b.passengerName, b.passengerType, b.seatLabel, b.phone])].map(r => r.join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `${label}.csv`; a.click();
  };

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "manifest", label: "Manifest", icon: FileText },
    { id: "reservations", label: "Reservations", icon: Wallet },
    { id: "scan",     label: "Scan & Confirm", icon: ScanLine },
    { id: "seats",    label: "Seats",    icon: Armchair },
    { id: "history",  label: "History",  icon: History },
    { id: "staff",    label: "Staff",    icon: UserCog },
    { id: "vessel",   label: "Vessel",   icon: ShipIcon },
    { id: "reviews",  label: "Reviews",  icon: MessageSquare },
    { id: "verification", label: "Identity", icon: ShieldAlert },
  ];

  if (!staffJson || !currentStaff.id) return null;

  return (
    <div className="min-h-screen px-4 py-8 max-w-4xl mx-auto font-sans selection:bg-primary selection:text-white">
      {/* Header */}
      <header className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-5">
           <button onClick={() => navigate("/")} className="p-3 glass-card rounded-2xl hover:bg-muted/50 transition-all active:scale-95"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
           <div><h1 className="text-2xl font-black text-foreground tracking-tighter leading-none mb-1 capitalize">{adminType} Master Console</h1><p className="text-[10px] text-muted-foreground font-black tracking-[0.3em] uppercase opacity-60">{currentShip?.name || "Terminal Standby"}</p></div>
        </div>
        <div className="flex items-center gap-2">
          {verificationBookings.length > 0 && (
            <div className="bg-destructive text-white text-[9px] font-bold px-2 py-1 rounded-full animate-pulse">
              {verificationBookings.length} PENDING IDs
            </div>
          )}
          <button onClick={() => { sessionStorage.clear(); navigate("/"); }} className="p-3 glass-card rounded-2xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all active:scale-95"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      {/* Ship Tabs */}
      <div className="flex gap-2 mb-10 overflow-x-auto no-scrollbar pb-2">
         {ships.map(s => (
           <button key={s.id} onClick={() => setSelectedShipId(s.id)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${selectedShipId === s.id ? "bg-primary text-white border-primary shadow-xl shadow-primary/20" : "glass-card text-muted-foreground border-border/50 hover:border-primary/30"}`}>{s.name} {!s.isConfirmed && " (Pending)"}</button>
         ))}
         <button onClick={() => setShowShipCreate(true)} className="px-6 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-black text-xs uppercase tracking-widest hover:bg-primary/20 transition-all whitespace-nowrap shrink-0 ml-auto">+ Submit Request</button>
      </div>

      {selectedShipId && currentShip ? (
        <div className="space-y-8">
           {/* Stats */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[ { l: "Trip", v: todayBookings.length, i: Users, c: "text-primary" }, { l: "Archive", v: historyBookings.length, i: History, c: "text-secondary" }, { l: "Capacity", v: currentShip.totalSeats + (currentShip.totalBunks || 0)*2, i: Armchair, c: "text-amber-500" }, { l: "Vessels", v: ships.length, i: ShipIcon, c: "text-purple-500" }].map(s => (
                <div key={s.l} className="glass-card p-5 rounded-[2rem] text-center border-border/30">
                  <s.i className={`w-4 h-4 mx-auto mb-3 opacity-40 ${s.c}`} />
                  <p className="text-2xl font-black text-foreground tracking-tighter mb-1">{s.v}</p>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">{s.l}</p>
                </div>
              ))}
           </div>

           {/* Tab Nav */}
           <nav className="flex p-1.5 bg-muted/40 rounded-3xl border border-border/50 gap-1">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === t.id ? "bg-background text-primary shadow-sm border border-border/30" : "text-muted-foreground hover:text-foreground"}`}><t.icon className="w-3.5 h-3.5" /> {t.label}</button>
              ))}
           </nav>

           {/* Content area */}
           <main className="min-h-[400px]">
              {activeTab === "manifest" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center glass-card p-5 rounded-[2rem]">
                    <div><p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Schedule View</p><p className="text-sm font-bold text-foreground">Trip date: {selectedManifestDate}</p></div>
                    <div className="flex gap-2">
                       <input type="date" value={selectedManifestDate} onChange={e => setSelectedManifestDate(e.target.value)} className="bg-muted px-4 py-2 rounded-xl text-xs font-bold border-none outline-none" />
                       <button onClick={() => downloadCSV(todayBookings, "manifest")} className="p-2.5 glass-card rounded-xl text-primary border border-primary/20 hover:bg-primary/10"><Download className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {todayBookings.length === 0 ? <div className="py-20 text-center glass-card rounded-[2.5rem] border-dashed opacity-40 font-black text-xs uppercase tracking-widest">No Active Bookings</div>
                  : <div className="grid gap-3">{todayBookings.map(b => <BookingRow key={b.id} b={b} typeColor={typeColor} onCollect={handleCollectPaid} onPrint={handlePrintTicket} />)}</div>}
                </div>
              )}

              {activeTab === "seats" && (
                <div className="space-y-10">
                   <div className="glass-card rounded-[2rem] p-5 border-border/50">
                     <div className="flex items-center justify-between gap-4 mb-4">
                       <div>
                         <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Seat Availability</p>
                         <p className="text-sm font-bold text-foreground">
                           {new Date(selectedManifestDate + "T00:00:00").toLocaleDateString("en-PH", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
                         </p>
                       </div>
                       <input type="date" value={selectedManifestDate} onChange={e => setSelectedManifestDate(e.target.value)}
                         className="bg-muted px-4 py-2 rounded-xl text-xs font-bold border-none outline-none" />
                     </div>
                     <div className="flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest">
                       <span className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">Available</span>
                       <span className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500">Booked</span>
                       <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">Reserved</span>
                       <span className="px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground">Blocked</span>
                     </div>
                   </div>
                   {(() => {
                      const regular = seats.filter(s => s.type === "seat");
                      
                      
                      // Sort berths numerically (U1, U2, ... U10) instead of alphabetically (U1, U10, U2)
                      const sortBerths = (a: any, b: any) => {
                        const numA = parseInt(a.label.replace(/\D/g, '')) || 0;
                        const numB = parseInt(b.label.replace(/\D/g, '')) || 0;
                        return numA - numB;
                      };

                      const up = seats.filter(s => s.type === "bunk-upper").sort(sortBerths);
                      const lw = seats.filter(s => s.type === "bunk-lower").sort(sortBerths);
                      
                      const Seat = (s: any) => (
                        <button key={s.id} onClick={() => s.status !== "booked" && s.status !== "reserved" && supabase.from("seats").update({ status: s.status === "blocked" ? "available" : "blocked" }).eq("id", s.id).then(() => loadShipData())} 
                          className={`p-3 rounded-2xl text-[10px] font-black flex flex-col items-center justify-center transition-all border w-16 h-16 shrink-0 ${s.status === "booked" ? "bg-red-500/10 border-red-500/20 text-red-500" : s.status === "reserved" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : s.status === "blocked" ? "bg-muted text-muted-foreground/30" : "bg-primary/10 border-primary/20 text-primary hover:scale-105"}`}>
                          {s.status === "booked" ? <Users className="w-3 h-3 mb-1" /> : s.status === "reserved" ? <Wallet className="w-3 h-3 mb-1" /> : s.status === "blocked" ? <Lock className="w-3 h-3 mb-1" /> : <Armchair className="w-3 h-3 mb-1" />}
                          {s.label}
                        </button>
                      );

                      return (
                        <div className="space-y-12">
                           <section>
                              <h3 className="text-[10px] font-black text-muted-foreground uppercase mb-6 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Seating Deck ({regular.length})</h3>
                              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">{regular.map(Seat)}</div>
                           </section>
                           {up.length > 0 && (
                              <section className="bg-muted/20 p-8 rounded-[3rem] border border-border/50">
                                 <h3 className="text-[10px] font-black text-muted-foreground uppercase mb-8 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Accommodation Berths ({up.length*2})</h3>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {up.map((ub, idx) => (
                                       <div key={idx} className="glass-card p-5 rounded-3xl border-border/50 flex flex-col gap-4 hover:border-amber-500/30 transition-colors">
                                          <div className="flex justify-between items-center"><p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Berth Suite {ub.label.replace('U', '')}</p><div className="flex gap-1"><div className="w-1 h-1 rounded-full bg-amber-500" /><div className="w-1 h-1 rounded-full bg-secondary" /></div></div>
                                          <div className="flex items-center gap-4 justify-center py-2 bg-background/20 rounded-2xl border border-border/10">
                                            <div className="flex flex-col items-center gap-1"><span className="text-[7px] font-bold text-muted-foreground uppercase">Upper</span>{Seat(ub)}</div>
                                            <div className="w-px h-10 bg-border/20 mx-2" />
                                            {lw[idx] && <div className="flex flex-col items-center gap-1"><span className="text-[7px] font-bold text-muted-foreground uppercase">Lower</span>{Seat(lw[idx])}</div>}
                                          </div>
                                       </div>
                                    ))}
                                 </div>
                              </section>
                           )}
                        </div>
                      )
                   })()}
                </div>
              )}

              {activeTab === "vessel" && (
                <div className="space-y-8">
                  <div className="glass-card rounded-[3rem] p-10 relative overflow-hidden bg-gradient-to-br from-background to-muted/30 border-border/50">
                     <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none transform rotate-12"><ShipIcon className="w-40 h-40" /></div>
                     <div className="relative z-10">
                         <div className="flex justify-between items-start mb-12">
                            <div><h2 className="text-4xl font-black text-foreground tracking-tighter mb-2">Vessel Architecture</h2><p className="text-sm text-muted-foreground font-medium">Technical specifications for {currentShip.name}</p></div>
                            <div className="flex flex-col items-end gap-2">
                               <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${currentShip.isConfirmed ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"} border`}>
                                 {currentShip.isConfirmed ? "Approved" : "Pending Confirmation"}
                               </div>
                               <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${currentShip.isActive ? "bg-secondary/10 text-secondary border-secondary/20" : "bg-destructive/10 text-destructive border-destructive/20"} border`}>
                                 {currentShip.isActive ? "Deployed" : "Staged (Internal Only)"}
                               </div>
                            </div>
                         </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <InputField label="Operator Callsign" value={currentShip.name} onChange={v => setShips(ships.map(s => s.id === selectedShipId ? {...s, name: v} : s))} />
                           <InputField label="Base Price (₱)" type="number" value={String(currentShip.price)} onChange={v => setShips(ships.map(s => s.id === selectedShipId ? {...s, price: Number(v)} : s))} />
                           <InputField label="Deck Seating" type="number" value={String(currentShip.totalSeats)} onChange={v => setShips(ships.map(s => s.id === selectedShipId ? {...s, totalSeats: Number(v)} : s))} />
                           <InputField label="Accommodation Suites" type="number" value={String(currentShip.totalBunks || 0)} onChange={v => setShips(ships.map(s => s.id === selectedShipId ? {...s, totalBunks: Number(v)} : s))} />
                        </div>

                        {/* Operational Schedule */}
                        <div className="mt-12 space-y-6">
                           <div className="flex justify-between items-center">
                              <div>
                                 <h3 className="text-xl font-black text-foreground tracking-tight">Weekly Operational Schedule</h3>
                                 <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Select days this vessel is in service</p>
                              </div>
                           </div>
                           <div className="flex flex-wrap gap-2">
                              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => {
                                 const days = currentShip.scheduleDays ? currentShip.scheduleDays.split(",").map(d => d.trim()).filter(Boolean) : [];
                                 const isActive = days.includes(day);
                                 return (
                                    <button 
                                       key={day}
                                       onClick={() => {
                                          const nextDays = isActive ? days.filter(d => d !== day) : [...days, day];
                                          setShips(ships.map(s => s.id === selectedShipId ? {...s, scheduleDays: nextDays.join(",")} : s));
                                       }}
                                       className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                          isActive 
                                             ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105" 
                                             : "glass-card text-muted-foreground border-border/50 hover:border-primary/30"
                                       }`}
                                    >
                                       {day}
                                    </button>
                                 );
                              })}
                           </div>
                        </div>

                        {/* Route Matrix */}
                        <div className="mt-12 space-y-6">
                           <div className="flex justify-between items-center">
                              <div>
                                 <h3 className="text-xl font-black text-foreground tracking-tight">Navigation Matrix</h3>
                                 <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Define ports, schedules and leg pricing</p>
                               </div>
                               <button onClick={() => {
                                  const stops = getShipStops(currentShip);
                                  const next = [...stops, { location: "", arrival: "", departure: "", price: 0 }];
                                  setShips(ships.map(s => s.id === selectedShipId ? {...s, stops: JSON.stringify(next)} : s));
                               }} className="text-primary text-[10px] font-black uppercase hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add Stop</button>
                           </div>
                           <div className="space-y-4">
                              {getShipStops(currentShip).map((s, idx) => (
                                 <div key={idx} className="flex flex-col md:flex-row gap-4 p-5 glass-card rounded-3xl border-border/30 bg-muted/10 items-end group">
                                    <div className="flex-1 w-full"><InputField label={idx === 0 ? "Initial Port" : "Transit Stop"} value={s.location} onChange={v => {
                                       const next = getShipStops(currentShip);
                                       next[idx].location = v;
                                       setShips(ships.map(ship => ship.id === selectedShipId ? {...ship, stops: JSON.stringify(next)} : ship));
                                    }} /></div>
                                    <div className="w-full md:w-28"><InputField label="Arrival" value={s.arrival} onChange={v => {
                                       const next = getShipStops(currentShip);
                                       next[idx].arrival = v;
                                       setShips(ships.map(ship => ship.id === selectedShipId ? {...ship, stops: JSON.stringify(next)} : ship));
                                    }} /></div>
                                    <div className="w-full md:w-28"><InputField label="Departure" value={s.departure} onChange={v => {
                                       const next = getShipStops(currentShip);
                                       next[idx].departure = v;
                                       setShips(ships.map(ship => ship.id === selectedShipId ? {...ship, stops: JSON.stringify(next)} : ship));
                                    }} /></div>
                                    <div className="w-full md:w-28"><InputField label="Leg ₱" type="number" value={String(s.price || 0)} onChange={v => {
                                       const next = getShipStops(currentShip);
                                       next[idx].price = Number(v);
                                       setShips(ships.map(ship => ship.id === selectedShipId ? {...ship, stops: JSON.stringify(next)} : ship));
                                    }} /></div>
                                    <button onClick={() => {
                                       const next = getShipStops(currentShip);
                                       next.splice(idx,1);
                                       setShips(ships.map(ship => ship.id === selectedShipId ? {...ship, stops: JSON.stringify(next)} : ship));
                                    }} className="p-3 text-destructive mb-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-5 h-5" /></button>
                                 </div>
                              ))}
                           </div>
                        </div>

                         <div className="mt-12 flex flex-col md:flex-row gap-4 pt-10 border-t border-border/30">
                            <button onClick={handleUpdateVessel} disabled={loading} className="flex-[2] py-5 bg-primary text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes</button>
                            
                            {!currentShip.isConfirmed ? (
                              <button disabled className="flex-1 px-8 rounded-3xl border border-amber-500/20 bg-amber-500/5 text-amber-500/50 text-[10px] uppercase font-black tracking-widest cursor-not-allowed">Awaiting Approval</button>
                            ) : (
                              <button 
                                onClick={async () => {
                                  if (!confirm("Are you sure you want to change the deployment status of this vessel?")) return;
                                  await toggleShipActive(currentShip.id, !currentShip.isActive);
                                  loadShips();
                                }} 
                                className={`flex-1 px-8 rounded-3xl border font-black text-[10px] uppercase tracking-widest transition-all shadow-xl ${currentShip.isActive ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20" : "bg-secondary text-white border-secondary shadow-secondary/20 hover:scale-105"}`}
                              >
                                {currentShip.isActive ? "Deactivate Fleet" : "Deploy to Public"}
                              </button>
                            )}
                         </div>
                        {shipFormMsg && <p className="mt-6 text-center text-[10px] font-black text-secondary tracking-widest uppercase animate-pulse">{shipFormMsg}</p>}
                     </div>
                  </div>
                 </div>
              )}

              {activeTab === "staff" && (
                <div className="space-y-6">
                   <div className="flex justify-between items-center"><h3 className="text-[10px] font-black text-muted-foreground uppercase">Terminal Personnel</h3><button onClick={() => setAddingStaff(true)} className="px-5 py-2.5 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">Enroll Staff</button></div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {staffList.filter(s => s.role === "scanner" && (s.shipIds?.includes(selectedShipId || "") || (s.shipIds?.length === 0))).map(s => (
                        <StaffRow 
                          key={s.id} 
                          s={s} 
                          onRevoke={async (id) => { 
                            if(confirm("Revoke access?")) { 
                              await supabase.from("staff").delete().eq("id", id); 
                              loadShips(); 
                            } 
                          }} 
                        />
                      ))}
                   </div>
                </div>
              )}

               {activeTab === "history" && (
                <div className="space-y-10">
                   <div className="flex items-center justify-between">
                     <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Trip Archives</h3>
                     <History className="w-4 h-4 text-muted-foreground/30" />
                   </div>

                   {historyBookings.length === 0 ? (
                     <div className="py-20 text-center glass-card rounded-[2.5rem] opacity-40 font-black text-xs uppercase tracking-widest border-dashed">
                       Archive Empty
                     </div>
                   ) : (
                     Object.entries(groupByDate(historyBookings)).sort(([a], [b]) => b.localeCompare(a)).map(([year, months]) => {
                       const isYearExpanded = expandedYears.includes(year);
                       return (
                         <div key={year} className="space-y-4">
                           {/* Year Folder Header */}
                           <button 
                             onClick={() => setExpandedYears(prev => prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year])}
                             className="flex items-center gap-3 w-full group transition-all"
                           >
                             <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black tracking-[0.2em] uppercase transition-all flex items-center gap-2 ${
                               isYearExpanded ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105" : "bg-primary/5 text-primary border-primary/20"
                             }`}>
                               {isYearExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                               {year}
                             </div>
                             <div className={`flex-1 h-px bg-gradient-to-r transition-all ${isYearExpanded ? "from-primary/40 to-transparent" : "from-primary/10 to-transparent"}`} />
                           </button>

                           <AnimatePresence>
                             {isYearExpanded && (
                               <motion.div 
                                 initial={{ height: 0, opacity: 0 }} 
                                 animate={{ height: "auto", opacity: 1 }} 
                                 exit={{ height: 0, opacity: 0 }}
                                 className="overflow-hidden space-y-6"
                               >
                                 {Object.entries(months).sort(([a], [b]) => b.localeCompare(a)).map(([month, days]) => {
                                   const monthKey = `${year}-${month}`;
                                   const isMonthExpanded = expandedMonths.includes(monthKey);
                                   return (
                                     <div key={month} className="ml-4 pl-6 border-l border-border/30 space-y-4">
                                       {/* Month Sub-header */}
                                       <button 
                                         onClick={() => setExpandedMonths(prev => prev.includes(monthKey) ? prev.filter(m => m !== monthKey) : [...prev, monthKey])}
                                         className={`flex items-center gap-2 w-full transition-all group ${isMonthExpanded ? "text-foreground" : "text-muted-foreground/60"}`}
                                       >
                                         <div className={`w-2 h-2 rounded-full transition-all ${isMonthExpanded ? "bg-primary scale-125 shadow-[0_0_8px_rgba(227, 0, 15,0.4)]" : "bg-muted-foreground/30"}`} />
                                         <h4 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                           {new Date(2000, parseInt(month) - 1).toLocaleString("default", { month: "long" })}
                                           {isMonthExpanded ? <ChevronDown className="w-3 h-3 opacity-40" /> : <ChevronRight className="w-3 h-3 opacity-40" />}
                                         </h4>
                                       </button>

                                       <AnimatePresence>
                                         {isMonthExpanded && (
                                           <motion.div 
                                             initial={{ height: 0, opacity: 0 }} 
                                             animate={{ height: "auto", opacity: 1 }} 
                                             exit={{ height: 0, opacity: 0 }}
                                             className="overflow-hidden space-y-4"
                                           >
                                             {Object.entries(days).sort(([a], [b]) => b.localeCompare(a)).map(([day, items]) => (
                                               <div key={day} className="glass-card rounded-[2rem] overflow-hidden border-border/30 hover:border-border transition-colors">
                                                 <div className="px-6 py-4 bg-muted/10 border-b border-border/30 flex justify-between items-center group/item">
                                                   <div className="flex items-center gap-3">
                                                     <p className="text-[10px] font-black text-foreground uppercase tracking-wider">
                                                       {new Date(`${year}-${month}-${day}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                                                     </p>
                                                     <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                                                     <p className="text-[9px] font-black text-muted-foreground uppercase">{items.length} Records</p>
                                                   </div>
                                                   <button 
                                                     onClick={(e) => { e.stopPropagation(); downloadCSV(items, `manifest-${year}-${month}-${day}`); }} 
                                                     className="p-2 rounded-xl text-primary hover:bg-primary/10 transition-all opacity-40 group-hover/item:opacity-100"
                                                   >
                                                     <Download className="w-3.5 h-3.5" />
                                                   </button>
                                                 </div>
                                                  <div className="p-4 space-y-2">
                                                    {items.map(b => <BookingRow key={b.id} b={b} typeColor={typeColor} onPrint={handlePrintTicket} />)}
                                                  </div>
                                               </div>
                                             ))}
                                           </motion.div>
                                         )}
                                       </AnimatePresence>
                                     </div>
                                   );
                                 })}
                               </motion.div>
                             )}
                           </AnimatePresence>
                         </div>
                       );
                     })
                   )}
                </div>
              )}

              {activeTab === "reviews" && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-[1.75rem] font-bold text-foreground tracking-tight">Vessel Feedback</h2>
                      <p className="text-muted-foreground text-sm mt-1">Passenger ratings and survey analytics for {currentShip?.name}.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="glass-card px-6 py-3 rounded-2xl flex items-center gap-3">
                         <div className="flex items-center gap-1 text-amber-500">
                            <Star className="w-5 h-5 fill-current" />
                            <span className="text-xl font-bold">
                              {reviews.length > 0 
                                ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                                : "0.0"}
                            </span>
                         </div>
                         <div className="h-8 w-px bg-border/50" />
                         <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">
                            <p>Average</p>
                            <p className="mt-1">Rating</p>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {["ease", "clarity", "recommend"].map((qId) => {
                      const counts: any = {};
                      reviews.forEach(r => {
                        const val = r.surveyData?.[qId];
                        if (val) counts[val] = (counts[val] || 0) + 1;
                      });
                      const topAnswer = Object.entries(counts).sort((a: any, b: any) => (b[1] as number) - (a[1] as number))[0];
                      
                      return (
                        <div key={qId} className="glass-card rounded-[2rem] p-6 border-border/50">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-4">
                            {qId === 'ease' ? 'Booking Experience' : qId === 'clarity' ? 'Information Clarity' : 'Recommendation'}
                          </p>
                          {topAnswer ? (
                            <>
                              <h4 className="text-lg font-bold text-foreground mb-1">{topAnswer[0]}</h4>
                              <p className="text-primary text-[10px] font-black uppercase tracking-wider">
                                {Math.round(((topAnswer[1] as number) / reviews.length) * 100)}% of passengers
                              </p>
                            </>
                          ) : (
                            <p className="text-muted-foreground text-xs italic opacity-40">No data collected</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Reviews List */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Recent Evaluations</h3>
                      <div className="text-[9px] font-bold text-muted-foreground/40">{reviews.length} Responses</div>
                    </div>
                    {reviews.length === 0 ? (
                      <div className="py-24 text-center glass-card rounded-[2.5rem] border-dashed opacity-40 font-black text-xs uppercase tracking-[0.3em]">
                        Signal Deficit: No Feedback Recorded
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {reviews.map((r) => (
                          <div key={r.id} className="glass-card p-6 rounded-[2rem] border-border/50 hover:border-primary/30 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center font-black text-foreground">
                                  {r.passengerName ? r.passengerName.charAt(0) : "P"}
                                </div>
                                <div>
                                  <p className="font-bold text-foreground text-sm tracking-tight">{r.passengerName || "Private Passenger"}</p>
                                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider opacity-60">{new Date(r.createdAt).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star key={star} className={`w-3 h-3 ${star <= r.rating ? "fill-amber-500 text-amber-500" : "text-slate-400"}`} />
                                ))}
                              </div>
                            </div>
                            
                            {r.comment && (
                              <div className="bg-muted/30 rounded-2xl p-4 mb-4 border border-border/30">
                                <p className="text-xs text-foreground/80 font-medium italic">"{r.comment}"</p>
                              </div>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {Object.entries(r.surveyData || {}).map(([q, a]: any) => (
                                <div key={q} className="bg-background/40 rounded-xl px-3 py-2 border border-border/20 shadow-sm">
                                  <p className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter mb-0.5 truncate">
                                    {q.replace(/_/g, " ")}
                                  </p>
                                  <p className="text-[10px] text-foreground font-bold truncate">{a}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "reservations" && (
                <div className="space-y-4">
                  <div className="glass-card rounded-[2rem] p-6 border-border/50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-black text-foreground tracking-tight">Counter Reservations</h2>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60 mt-1">Unpaid reservations for {selectedManifestDate} — collect payment to confirm</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="px-4 py-1.5 glass-card rounded-full text-[10px] font-black text-primary border-primary/20 uppercase tracking-widest">
                          {reservations.length} Pending
                        </div>
                        <button onClick={loadShipData} className="p-2 hover:bg-primary/10 rounded-full transition-colors text-primary" title="Refresh">
                          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <Search className="w-4 h-4 text-muted-foreground/50 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input value={reservationSearch} onChange={e => setReservationSearch(e.target.value)} placeholder="Search by passenger name or code (SPT-...)"
                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
                    </div>
                  </div>

                  {filteredReservations.length === 0 ? (
                    <div className="py-20 text-center glass-card rounded-[2.5rem] border-dashed opacity-40 font-black text-xs uppercase tracking-widest">
                      {reservations.length === 0 ? "No Reservations" : "No match found"}
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {filteredReservations.map(b => (
                        <ReservationRow key={b.id} b={b} onSelect={() => setScanBooking(b)} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "scan" && (
                <div className="space-y-4">
                  <div className="glass-card rounded-[2rem] p-6 border-border/50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-black text-foreground tracking-tight">Counter Scanner</h2>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60 mt-1">Scan a reservation QR → approve payment → activate the boarding code</p>
                      </div>
                      <button onClick={scanCameraActive ? stopScanCamera : startScanCamera} disabled={scanStarting}
                        className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-60 ${scanCameraActive ? "bg-destructive/15 text-destructive border border-destructive/30" : "bg-primary text-white shadow-lg shadow-primary/20"}`}>
                        {scanStarting ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</> :
                          scanCameraActive ? <><CameraOff className="w-4 h-4" /> Stop</> :
                            <><Camera className="w-4 h-4" /> Start Camera</>}
                      </button>
                    </div>

                    <div className={`relative rounded-2xl overflow-hidden bg-black ${scanCameraActive ? "block" : "hidden"}`} style={{ minHeight: "320px" }}>
                      <div id="admin-qr-reader" className="w-full h-full absolute inset-0 [&>video]:object-cover [&>video]:h-full" />
                    </div>

                    {!scanCameraActive && !scanStarting && (
                      <div className="text-center py-8">
                        <ScanLine className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Tap Start to scan a reservation QR</p>
                      </div>
                    )}
                    {scanProcessing && (
                      <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Looking up booking...</span>
                      </div>
                    )}
                  </div>

                  <div className="glass-card rounded-[2rem] p-6 border-border/50">
                    <div className="flex items-center gap-2 mb-4">
                      <Keyboard className="w-5 h-5 text-primary" />
                      <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Manual Entry</h3>
                    </div>
                    <div className="flex gap-2">
                      <input value={scanManualCode} onChange={e => setScanManualCode(e.target.value)} placeholder="SPT-XXXXXXXXXXXX"
                        className="flex-1 px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
                        onKeyDown={(e) => e.key === "Enter" && handleScanManual()} />
                      <button onClick={handleScanManual} disabled={scanProcessing}
                        className="px-6 py-3 rounded-xl bg-primary text-white font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-60">
                        <ScanLine className="w-4 h-4" /> Look Up
                      </button>
                    </div>
                  </div>

                  {scanError && (
                    <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center font-bold">
                      {scanError}
                    </div>
                  )}
                  {scanSuccessMsg && (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-sm text-center font-bold flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" /> {scanSuccessMsg}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "verification" && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between px-1">
                    <div>
                      <h2 className="text-xl font-black text-foreground tracking-tighter">Identity Control</h2>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Pending manual review for discount eligibility</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={loadShipData} className="p-2 hover:bg-primary/10 rounded-full transition-colors text-primary" title="Refresh">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      </button>
                      <div className="px-4 py-1.5 glass-card rounded-full text-[10px] font-black text-primary border-primary/20 uppercase tracking-widest">
                        {verificationBookings.length} Requests
                      </div>
                    </div>
                  </div>

                  {verificationBookings.length === 0 ? (
                    <div className="py-24 text-center glass-card rounded-[3rem] border-dashed opacity-40 flex flex-col items-center">
                       <CheckCircle className="w-16 h-16 mb-4 text-emerald-500/20" />
                       <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">Clear Horizon: No Pending Verifications</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {verificationBookings.map((b) => (
                        <div key={b.id} className="glass-card rounded-[2.5rem] overflow-hidden border-border/50 flex flex-col group transition-all hover:border-primary/30">
                          {/* Image Preview Container - Now fully clickable */}
                          <div 
                            className="aspect-video w-full bg-black/40 relative overflow-hidden cursor-pointer group"
                            onClick={() => b.id_image_url && window.open(b.id_image_url, "_blank")}
                          >
                            {b.id_image_url && b.id_image_url !== "null" ? (
                              <img 
                                src={b.id_image_url} 
                                alt="ID Preview" 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    parent.classList.add('flex', 'items-center', 'justify-center', 'flex-col', 'gap-2');
                                    // Only add the fallback if it doesn't already exist
                                    if (!parent.querySelector('.fallback-icon')) {
                                      parent.insertAdjacentHTML('beforeend', '<svg class="w-10 h-10 opacity-20 fallback-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg><p class="text-[8px] font-black uppercase tracking-widest opacity-40">Image Unavailable (Check Bucket Privacy)</p>');
                                    }
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground flex-col gap-2">
                                <ImageIcon className="w-10 h-10 opacity-20" />
                                <p className="text-[8px] font-black uppercase tracking-widest opacity-40">No Image Data</p>
                              </div>
                            )}
                            
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                              <div className="px-4 py-2 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                                Click to Expand
                              </div>
                            </div>

                            <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[9px] font-bold text-white uppercase tracking-widest border border-white/10 z-10">
                              {b.passenger_type}
                            </div>
                          </div>

                          {/* Details */}
                          <div className="p-6">
                            <div className="mb-6">
                              <h4 className="text-lg font-black text-foreground tracking-tight leading-none mb-1">{b.passenger_name}</h4>
                              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
                                Vessel: {allShipsForMapping.find(s => s.id === b.ship_id)?.name || "External Vessel"} | Contact: {b.phone}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                              <div className="bg-muted/30 rounded-2xl p-3 border border-border/20">
                                <p className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter mb-0.5">Vessel Route</p>
                                <p className="text-[10px] font-bold text-foreground truncate">{b.board_stop} → {b.alight_stop}</p>
                              </div>
                              <div className="bg-muted/30 rounded-2xl p-3 border border-border/20">
                                <p className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter mb-0.5">Trip Date</p>
                                <p className="text-[10px] font-bold text-foreground">{b.trip_date}</p>
                              </div>
                            </div>

                            <div className="flex gap-3">
                              <button 
                                onClick={() => handleVerifyIdentity(b.id)}
                                disabled={loading}
                                className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Approve
                              </button>
                              <button 
                                onClick={() => {
                                  setRejectingBookingId(b.id);
                                  setShowRejectModal(true);
                                }}
                                disabled={loading}
                                className="px-6 py-4 glass-card text-destructive rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-destructive/10 active:scale-95 transition-all border border-destructive/20"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
           </main>
        </div>
      ) : (
        <div className="py-32 text-center glass-card rounded-[3rem] border-dashed opacity-40 flex flex-col items-center">
           <ShipIcon className="w-20 h-20 mb-6 opacity-10" />
           <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em]">Authorized Vessel Selection Required</p>
        </div>
      )}

      {/* Staff Modal */}
      <AnimatePresence>
         {addingStaff && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/95 backdrop-blur-xl">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="glass-card w-full max-w-sm rounded-[3rem] p-10 border-border/50 relative">
                 <button onClick={() => setAddingStaff(false)} className="absolute top-8 right-8 p-1 text-muted-foreground hover:text-foreground"><X className="w-6 h-6" /></button>
                 <h2 className="text-3xl font-black text-foreground tracking-tighter mb-10">Staff Registry</h2>
                 <div className="flex flex-col gap-6">
                    <InputField label="Personnel Name" value={newName} onChange={setNewName} placeholder="Identity name" />
                    <InputField label="Service Identity (Email)" value={newEmail} onChange={setNewEmail} placeholder="Endpoint access" />
                    <div className="relative"><InputField label="Security Key" type={showPass ? "text" : "password"} value={newPass} onChange={setNewPass} placeholder="••••••••" /><button onClick={() => setShowPass(!showPass)} className="absolute bottom-4 right-4 p-1 text-muted-foreground">{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
                    {staffMsg && <p className="text-[10px] font-black text-center text-secondary uppercase animate-bounce">{staffMsg}</p>}
                    <button 
                       onClick={handleAddStaff} 
                       disabled={isSavingStaff}
                       className="py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                       {isSavingStaff ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                       {isSavingStaff ? "Enrolling..." : "Enroll Staff"}
                    </button>
                 </div>
              </motion.div>
           </div>
         )}
      </AnimatePresence>

      {/* Ship Proposal Modal */}
      <AnimatePresence>
         {showShipCreate && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/98 backdrop-blur-2xl overflow-y-auto">
              <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="glass-card w-full max-w-2xl rounded-[3rem] p-10 border-border/50 my-10 relative">
                 <button onClick={() => setShowShipCreate(false)} className="absolute top-8 right-8 p-3 text-muted-foreground hover:text-foreground"><X className="w-6 h-6" /></button>
                 <div className="flex items-center gap-6 mb-12">
                    <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary"><ShipIcon className="w-8 h-8" /></div>
                    <div><h2 className="text-4xl font-black text-foreground tracking-tighter mb-1 font-display">Vessel Request</h2><p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Pending centralized command approval</p></div>
                 </div>
                 <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8"><InputField label="Vessel Callsign" value={newShipModel.name} onChange={v => setNewShipModel({...newShipModel, name: v})} /><InputField label="Class Type" value={newShipModel.type} onChange={() => {}} placeholder={newShipModel.type} /></div>
                    <div className="space-y-6">
                       <div className="flex justify-between items-center"><p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Navigation Matrix</p><button onClick={() => setNewShipModel({...newShipModel, stops: [...newShipModel.stops, { location: "", arrival: "", departure: "" }]})} className="text-primary text-[10px] font-black uppercase hover:underline">+ Add Stop</button></div>
                       <div className="space-y-4">
                          {newShipModel.stops.map((s: any, idx: number) => (
                             <div key={idx} className="flex flex-col md:flex-row gap-4 p-5 glass-card rounded-3xl border-border/30 bg-muted/10 items-end">
                                <div className="flex-1 w-full"><InputField label={idx === 0 ? "Initial Port" : idx === newShipModel.stops.length-1 ? "Destination" : `Node #${idx+1}`} value={s.location} onChange={v => handleStopChange(idx, "location", v)} /></div>
                                <div className="w-full md:w-28"><InputField label="Arrival" value={s.arrival} onChange={v => handleStopChange(idx, "arrival", v)} /></div>
                                <div className="w-full md:w-28"><InputField label="Departure" value={s.departure} onChange={v => handleStopChange(idx, "departure", v)} /></div>
                                {newShipModel.stops.length > 2 && <button onClick={() => { const next = [...newShipModel.stops]; next.splice(idx,1); setNewShipModel({...newShipModel, stops: next}); }} className="p-3 text-destructive mb-1"><Trash2 className="w-5 h-5" /></button>}
                             </div>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-6">
                       <div className="flex justify-between items-center"><p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Weekly Operational Schedule</p></div>
                       <div className="flex flex-wrap gap-2">
                          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => {
                             const days = newShipModel.scheduleDays ? newShipModel.scheduleDays.split(",").map((d: string) => d.trim()).filter(Boolean) : [];
                             const isActive = days.includes(day);
                             return (
                                <button 
                                   key={day}
                                   onClick={() => {
                                      const nextDays = isActive ? days.filter((d: string) => d !== day) : [...days, day];
                                      setNewShipModel({...newShipModel, scheduleDays: nextDays.join(",")});
                                   }}
                                   className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                      isActive 
                                         ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105" 
                                         : "glass-card text-muted-foreground border-border/50 hover:border-primary/30"
                                   }`}
                                >
                                   {day}
                                </button>
                             );
                          })}
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-8"><InputField label="Proposed Tariff" type="number" value={String(newShipModel.price)} onChange={v => setNewShipModel({...newShipModel, price: Number(v)})} /><InputField label="Deck Seating" type="number" value={String(newShipModel.totalSeats)} onChange={v => setNewShipModel({...newShipModel, totalSeats: Number(v)})} /></div>
                    {shipFormMsg && <p className="text-[10px] font-black text-center text-secondary uppercase animate-pulse">{shipFormMsg}</p>}
                    <button onClick={handleRequestShip} disabled={requestingShip} className="w-full py-5 bg-primary text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all">Submit Request</button>
                 </div>
              </motion.div>
           </div>
         )}
      </AnimatePresence>

      {/* Counter Approval Modal */}
      <AnimatePresence>
        {scanBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/95 backdrop-blur-xl">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="glass-card w-full max-w-md rounded-[2.5rem] p-8 border-border/50 relative text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <button onClick={() => setScanBooking(null)} className="absolute top-6 right-6 p-1 text-muted-foreground hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-[#B45309]/20 flex items-center justify-center text-[#F59E0B]"><Wallet className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">Reservation Found</h3>
                  <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">Unpaid counter reservation — collect payment to activate</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-sm font-black text-foreground">{scanBooking.passenger_name}</p>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60 mt-0.5">Seat {scanBooking.seat_label} · {scanBooking.passenger_type}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase tracking-widest">
                    Unpaid
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-2xl p-3 border border-border/20">
                    <p className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter mb-0.5">Vessel</p>
                    <p className="text-[10px] font-bold text-foreground truncate">{allShipsForMapping.find(s => s.id === scanBooking.ship_id)?.name || "—"}</p>
                  </div>
                  <div className="bg-muted/30 rounded-2xl p-3 border border-border/20">
                    <p className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter mb-0.5">Trip Date</p>
                    <p className="text-[10px] font-bold text-foreground">{scanBooking.trip_date}</p>
                  </div>
                  <div className="bg-muted/30 rounded-2xl p-3 border border-border/20">
                    <p className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter mb-0.5">Route</p>
                    <p className="text-[10px] font-bold text-foreground truncate">{scanBooking.board_stop} → {scanBooking.alight_stop}</p>
                  </div>
                  <div className="bg-muted/30 rounded-2xl p-3 border border-border/20">
                    <p className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter mb-0.5">Amount</p>
                    <p className="text-[12px] font-black text-primary">₱{(scanBooking.leg_price || 0).toLocaleString()}</p>
                  </div>
                </div>
                {scanBooking.counter_deadline && (
                  <p className="text-[10px] text-muted-foreground mt-4 text-center font-mono">
                    Hold expires: {new Date(scanBooking.counter_deadline).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
                  </p>
                )}
              </div>

              <button onClick={handleApproveScan} disabled={loading}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <HandCoins className="w-4 h-4" />}
                Collect Payment & Activate QR
              </button>
              <button onClick={() => setScanBooking(null)} className="w-full py-3 mt-2 text-[10px] text-muted-foreground hover:text-white uppercase tracking-widest">
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rejection Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/95 backdrop-blur-xl">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="glass-card w-full max-w-sm rounded-[2.5rem] p-8 border-border/50 relative text-white">
              <button onClick={() => setShowRejectModal(false)} className="absolute top-6 right-6 p-1 text-muted-foreground hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500"><ShieldAlert className="w-5 h-5" /></div>
                <div><h3 className="text-xl font-black tracking-tight">Reject ID</h3><p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Specify reason for passenger</p></div>
              </div>
              
              <div className="space-y-4">
                {[
                  "Invalid ID Document",
                  "Name Mismatch",
                  "Blurry / Unreadable",
                  "Expired Identification",
                  "Incorrect Category"
                ].map(reason => (
                  <button 
                    key={reason}
                    onClick={() => setRejectReason(reason)}
                    className={`w-full p-4 rounded-2xl text-xs font-bold text-left transition-all border ${rejectReason === reason ? "bg-primary/10 border-primary text-primary" : "bg-muted/30 border-border/50 text-muted-foreground hover:border-primary/30"}`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <button 
                onClick={handleRejectIdentity}
                disabled={loading}
                className="w-full py-4 mt-8 bg-destructive text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-destructive/20 hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Trash2 className="w-4 h-4 text-white" />}
                Confirm Rejection
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;