import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getShipById, getSeatsForShipAndDate, getLocalDate, generateId, uploadIDImage, getCurrentUser, saveBooking, Booking } from "@/lib/store";
import { ArrowLeft, User, Phone, Mail, Tag, AlertTriangle, Shield, CheckCircle, Camera, Loader2 } from "lucide-react";
import IdentityCenter from "@/components/IdentityCenter";

const PASSENGER_TYPES = [
  { value: "regular", label: "Regular",     color: "bg-primary/20 text-primary",     discount: 0,    penalty: 0 },
  { value: "student", label: "Student",     color: "bg-secondary/20 text-secondary", discount: 0.20, penalty: 0.20 },
  { value: "senior",  label: "Senior Citizen",  color: "bg-amber-500/20 text-amber-500", discount: 0.32, penalty: 0.32 },
  { value: "pwd",     label: "PWD",         color: "bg-amber-500/20 text-amber-500", discount: 0.32, penalty: 0.32 },
] as const;

type PassengerType = typeof PASSENGER_TYPES[number]["value"];

const TicketPreview = () => {
  const { shipId, seatId } = useParams<{ shipId: string; seatId: string }>();
  const navigate    = useNavigate();
  const location    = useLocation();
  const { 
    boardStop, 
    alightStop, 
    legPrice, 
    tripDate: _tripDate 
  } = (location.state || {}) as {
    boardStop?: string;
    alightStop?: string;
    legPrice?: number;
    tripDate?: string;
  };

  const [ship, setShip]   = useState<any>(null);
  const [seat, setSeat]   = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [name, setName]   = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [passengerType, setPassengerType] = useState<PassengerType>("regular");
  
  // Biometric Auth State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isIdVerified, setIsIdVerified] = useState(false);
  const [idVerificationStatus, setIdVerificationStatus] = useState<"none" | "pending" | "verified" | "rejected">("none");
  const [idImageUrl, setIdImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentBookingId] = useState(() => sessionStorage.getItem("current_booking_id") || generateId());

  // PERSISTENCE: Save ID immediately
  useEffect(() => {
    sessionStorage.setItem("current_booking_id", currentBookingId);
  }, [currentBookingId]);

  const tripDate = _tripDate || getLocalDate();

  useEffect(() => {
    if (!shipId || !seatId) return;
    getShipById(shipId).then(setShip);
    getSeatsForShipAndDate(shipId, tripDate, boardStop, alightStop).then((seats) =>
      setSeat(seats.find((s) => s.id === seatId) || null)
    );
    getCurrentUser().then(setCurrentUser);

    // Load from session
    const savedName = sessionStorage.getItem("booking_name");
    const savedPhone = sessionStorage.getItem("booking_phone");
    const savedEmail = sessionStorage.getItem("booking_email");
    const savedUrl = sessionStorage.getItem("booking_id_url");
    if (savedName) setName(savedName);
    if (savedPhone) setPhone(savedPhone);
    if (savedEmail) setEmail(savedEmail);
    if (savedUrl) {
      setIdImageUrl(savedUrl);
      setIdVerificationStatus("pending");
    }
  }, [shipId, seatId, tripDate, boardStop, alightStop]);

  // Save to session on change
  useEffect(() => {
    if (name) sessionStorage.setItem("booking_name", name);
    if (phone) sessionStorage.setItem("booking_phone", phone);
    if (email) sessionStorage.setItem("booking_email", email);
    if (idImageUrl) sessionStorage.setItem("booking_id_url", idImageUrl);
  }, [name, phone, email, idImageUrl]);

  if (!ship || !seat) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const pt          = PASSENGER_TYPES.find((p) => p.value === passengerType)!;
  const basePrice   = legPrice || ship.price;
  const discount    = pt.discount;
  
  // If not verified, penalty applies instead of discount
  const applyDiscount = passengerType === "regular" || isIdVerified;
  const deduction   = Math.round(basePrice * discount);
  
  // Final calculation
  const finalPrice  = applyDiscount ? (basePrice - deduction) : basePrice; // No penalty added on preview, just deny discount until verified.

  // To review, we MUST have identity fields filled AND if discount is claimed, it MUST be verified.
  const fieldsValid = name.trim().length >= 2 && phone.trim().length >= 10 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  // We allow proceeding to review if ID is pending, but PaymentPage will block the actual payment.
  const isValid = fieldsValid && (passengerType === "regular" || idImageUrl !== null);

  const idLabel: Record<string, string> = {
    student: "Student", senior: "Senior Citizen", pwd: "PWD",
  };

  const handlePassengerTypeChange = (pType: PassengerType) => {
    setPassengerType(pType);
    if (pType !== passengerType) {
      setIsIdVerified(false); // Reset verification if type changes
    }
  };

  const persistBooking = async (overrideStatus?: "pending" | "paid", overideVerification?: "pending" | "verified" | "rejected", uploadedUrl?: string) => {
    try {
      const u = await getCurrentUser();
      // We allow guest bookings for now to prevent testing blockers, 
      // but we log a warning if the user isn't authenticated.
      if (!u) {
        console.warn("[persistBooking] No authenticated user found. Saving as guest booking.");
      }
      
      if (!name || !phone || !seat) {
        console.error("[persistBooking] Missing required data:", { name, phone, seat });
        alert("Missing booking details. Please ensure your name and phone number are entered correctly.");
        return null;
      }
      
      const bookingData: Booking = {
        id: currentBookingId,
        shipId: shipId!,
        seatId: seatId!,
        seatLabel: seat.label,
        passengerName: name,
        passengerType: passengerType as any,
        phone: phone,
        email: email || undefined,
        status: overrideStatus || "pending",
        qrCode: `SPT-${currentBookingId}`,
        createdAt: new Date().toISOString(),
        tripDate: tripDate || getLocalDate(),
        boardStop: boardStop || undefined,
        alightStop: alightStop || undefined,
        legPrice: legPrice || undefined,
        idVerified: isIdVerified,
        idImageUrl: uploadedUrl || idImageUrl || undefined,
        idVerificationStatus: overideVerification || idVerificationStatus,
        userId: u?.id || null
      };
      console.log("[persistBooking] Data to save:", bookingData);
      await saveBooking(bookingData);
      console.log("[persistBooking] Save successful: " + currentBookingId);
      return true;
    } catch (err: any) {
      console.error("[persistBooking] CRITICAL FAILURE:", err);
      alert("Failed to save booking: " + (err.message || "Unknown error"));
      throw err;
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 max-w-md mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 glass-card rounded-xl hover:bg-muted/50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-display text-xl font-bold text-foreground">Passenger Details</h1>
      </div>

      {/* Ticket Preview Card */}
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
        className="glass-card rounded-2xl overflow-hidden mb-6">
        <div className="bg-primary/10 p-4 border-b border-border">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-display font-bold text-foreground">{ship.name}</p>
              <p className="text-sm text-muted-foreground">{ship.route}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-primary font-medium">{ship.departure}</p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Seat</span>
            <span className="font-display font-bold text-primary text-lg">{seat.label}</span>
          </div>
          {boardStop && (
            <div className="flex justify-between items-center mt-1">
              <span className="text-muted-foreground text-sm">Route</span>
              <span className="text-sm text-muted-foreground">{boardStop} → {alightStop}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Form */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="text-sm text-muted-foreground mb-1.5 block">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Dela Cruz"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1.5 block">Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09171234567"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1.5 block">Email Address <span className="text-xs text-muted-foreground/60">(required for payment receipt)</span></label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juan@email.com"
              type="email"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        </div>

        {/* Passenger Type */}
        <div>
          <label className="text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" /> Passenger Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PASSENGER_TYPES.map((p) => (
              <button key={p.value} onClick={() => handlePassengerTypeChange(p.value)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all border relative overflow-hidden ${
                  passengerType === p.value ? p.color + " border-current" : "bg-muted/30 text-muted-foreground border-border"
                }`}>
                {p.label}
                {p.discount > 0 && <span className="text-xs ml-1 opacity-70">({p.discount * 100}% off)</span>}
              </button>
            ))}
          </div>
        </div>

        {/* ID Notice & Verification Trigger */}
        <AnimatePresence>
          {passengerType !== "regular" && (
            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
              className="overflow-hidden">
              
              {!isIdVerified ? (
                <div className="flex flex-col p-5 rounded-xl bg-primary/10 border border-primary/30 mt-2 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -translate-y-10 translate-x-10 pointer-events-none" />
                   
                   <div className="flex gap-3 mb-4 relative z-10">
                     <Shield className="w-6 h-6 text-primary shrink-0" />
                     <div>
                       <p className="text-sm font-bold text-white tracking-widest uppercase mb-1">ID Verification</p>
                       <p className="text-xs text-muted-foreground leading-relaxed">
                         To claim the <span className="text-white">{idLabel[passengerType]}</span> discount, you must verify your identity. Please provide a clear photo of your valid ID card.
                       </p>
                     </div>
                   </div>

                   <button 
                     onClick={() => {
                       if (!name || !phone) {
                         alert("Please enter your name and phone number before verifying your ID.");
                         return;
                       }
                       setIsScannerOpen(true);
                     }}
                     className="w-full py-3 bg-primary hover:bg-[#FF3B47] text-[#0A1118] font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(227, 0, 15,0.2)] transition-all">
                     <Camera className="w-4 h-4" /> Verify ID to Unlock Discount
                   </button>
                </div>
              ) : (
                <div className="flex gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30 mt-2">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-500 mb-1">
                      {idVerificationStatus === "pending" ? "ID Submitted" : "Discount Authorized"}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {idVerificationStatus === "pending" 
                        ? "Your document is awaiting manual review. You can proceed to review your trip details while you wait."
                        : "Identity verified! Your " + idLabel[passengerType] + " discount has been applied to the final fare."}
                    </p>
                  </div>
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Price Summary */}
      <div className="glass-card rounded-xl p-4 mb-6">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Base fare</span>
          <span>₱{basePrice}</span>
        </div>
        {discount > 0 && applyDiscount && (
          <div className="flex justify-between text-sm text-secondary mt-1">
            <span>{pt.label} discount ({discount * 100}%)</span>
            <span>-₱{deduction}</span>
          </div>
        )}
        <div className="border-t border-border mt-2 pt-2 flex justify-between font-display font-bold text-foreground">
          <span>Total</span>
          <span className="text-primary">₱{finalPrice}</span>
        </div>
      </div>

      <motion.button
        whileHover={isValid ? { scale: 1.02 } : {}}
        whileTap={isValid ? { scale: 0.98 } : {}}
        disabled={!isValid || isUploading}
        onClick={async () => {
          if (!name || !phone) {
            alert("Please provide passenger name and phone number.");
            return;
          }
          setLoading(true);
          try {
            const saved = await persistBooking();
            if (!saved) {
              setLoading(false);
              return;
            }
          } catch (err: any) {
            alert("Failed to save booking: " + (err.message || "Unknown error"));
            setLoading(false);
            return;
          }
          
          // If passenger type is discounted (Student, Senior, PWD), save and redirect to Home with pop-up notice
          if (passengerType !== "regular") {
            sessionStorage.setItem("show_id_pending_modal", "true");
            sessionStorage.removeItem("booking_name");
            sessionStorage.removeItem("booking_phone");
            sessionStorage.removeItem("booking_email");
            sessionStorage.removeItem("booking_id_url");
            sessionStorage.removeItem("current_booking_id");
            navigate("/booking");
            return;
          }

          navigate(`/review/${shipId}/${seatId}`, {
            state: { 
              bookingId: currentBookingId,
              boardStop, alightStop, legPrice, tripDate, name, phone, email, passengerType, price: finalPrice, basePrice, deduction: deduction, idVerified: isIdVerified, idImageUrl, idVerificationStatus 
            },
          });
          setLoading(false);
        }}
        className={`w-full py-4 rounded-2xl font-display font-bold text-lg transition-all flex items-center justify-center gap-2 ${
          isValid ? "btn-ocean" : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}>
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
          passengerType !== "regular" && !idImageUrl 
            ? "Upload ID to Continue" 
            : passengerType !== "regular"
            ? `Submit ID & Return Home — ₱${finalPrice}`
            : `Review Booking — ₱${finalPrice}`
        )}
      </motion.button>

      {/* Identity Verification Component */}
      {isScannerOpen && (
        <IdentityCenter 
          bookingId={currentBookingId} 
          passengerType={idLabel[passengerType]}
          onClose={() => setIsScannerOpen(false)}
          onUploadComplete={async (url) => {
            setLoading(true); // Show spinner during DB save
            setIdImageUrl(url);
            setIdVerificationStatus("pending");
            try {
              await persistBooking("pending", "pending", url);
            } catch (err) {
              console.error("Auto-persist failed:", err);
            } finally {
              setLoading(false);
              setIsScannerOpen(false);
            }
          }}
        />
      )}
    </div>
  );
};

export default TicketPreview;