import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getShipById, getSeatsForShipAndDate, getLocalDate, Seat, Ship, getShipStops, calcLegPrice, generateId, uploadIDImage, saveBooking, deleteBooking, getCurrentUser } from "@/lib/store";
import { ArrowLeft, Loader2, BedDouble, Armchair, User, GraduationCap, Accessibility, Sailboat, Globe, Share2, CircleUserRound, Phone, Mail, Tag, AlertTriangle, QrCode, Home, Calendar, Ship as ShipIcon, Clock, ShieldCheck, Camera, Route, ChevronDown, ArrowRight, FileText } from "lucide-react";
import BiometricScanner from "@/components/BiometricScanner";

// â”€â”€ Seat button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SeatButton = ({
  seat, selected, onToggle,
}: {
  seat: Seat; selected: boolean; onToggle: () => void;
}) => {
  const isBunk  = seat.type === "bunk-upper" || seat.type === "bunk-lower";
  const isUpper = seat.type === "bunk-upper";

  const base =
    seat.status === "booked"  ? "bg-red-500/10 border-red-500/20 text-red-400 cursor-not-allowed opacity-50" :
    seat.status === "blocked" ? "bg-white/5 border-white/10 text-white/30 cursor-not-allowed opacity-40" :
    selected                  ? "bg-[#E3000F] border-[#E3000F] text-[#0A1118] shadow-[0_0_15px_rgba(227, 0, 15,0.4)] scale-110" :
                                "bg-[#E3000F]/10 border-[#E3000F]/30 text-[#E3000F] hover:bg-[#E3000F]/20 hover:scale-105";

  return (
    <button
      onClick={seat.status === "available" ? onToggle : undefined}
      style={{ width: isBunk ? 64 : 52, height: isBunk ? 64 : 52 }}
      className={`rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition-all duration-150 gap-0.5 ${base}`}
      title={isBunk ? (isUpper ? "Upper Bunk" : "Lower Bunk") : `Seat ${seat.label}`}
    >
      <span className="text-sm font-bold leading-none">{seat.label}</span>
      {isBunk && (
        <span className={`text-[9px] font-semibold mt-0.5 ${isUpper ? "text-amber-400" : "text-sky-400"}`}>
          {isUpper ? "â–² UPPER" : "â–¼ LOWER"}
        </span>
      )}
    </button>
  );
};

// â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SeatSelection = () => {
  const { shipId }   = useParams<{ shipId: string }>();
  const navigate     = useNavigate();
  const location     = useLocation();

  const [ship, setShip]       = useState<Ship | null>(null);
  const [seats, setSeats]     = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Group seat selections
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  
  // App flow state
  const [step, setStep] = useState<"type" | "seat" | "passenger">("type");

  // Single Passenger form (legacy fallback)
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [passType, setPassType] = useState("Regular");

  // Initialize passenger type from LegSelector selection
  useEffect(() => {
    if (routeTotal === 1 && routeGroups.length > 0) {
      const initial = routeGroups[0];
      setPassType(initial.charAt(0).toUpperCase() + initial.slice(1));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Biometric verification state (legacy fallback)
  const [verified, setVerified] = useState(false);
  const [verifiedScore, setVerifiedScore] = useState(0);
  const [idImageUrl, setIdImageUrl] = useState<string | null>(null);

  // Group passengers state
  const [passengers, setPassengers] = useState<Array<{
    name: string;
    phone: string;
    email: string;
    type: string;
    verified: boolean;
    verifiedScore: number;
    idImageUrl: string | null;
    idVerificationStatus: "none" | "pending" | "verified" | "rejected";
    bookingId: string;
    seatId: string;
    seatLabel: string;
  }>>([]);
  const [activePassengerIdx, setActivePassengerIdx] = useState<number | null>(null);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [isUploadingId, setIsUploadingId] = useState(false);
  const [pendingPassType, setPendingPassType] = useState<string | null>(null);

  // Seat Type memory
  const [seatTypeChoice, setSeatTypeChoice] = useState<"seat" | "bunk" | null>((location.state as any)?.accommodationType || null);

  // Group bookings already persisted this session — cancelled if the user backs
  // out and re-does the passenger step, so we don't orphan seats.
  const persistedBookingIdsRef = useRef<Set<string>>(new Set());

  const { 
    tripDate: _tripDate, 
    boardStop: initBoard, 
    alightStop: initAlight, 
    legPrice: initPrice,
    totalPassengers: routeTotal = 1,
    passengerGroups: routeGroups = ["regular"]
  } = (location.state || {}) as {
    tripDate?: string;
    boardStop?: string;
    alightStop?: string;
    legPrice?: number;
    accommodationType?: "seat" | "bunk";
    bookingType?: "book" | "reserve";
    totalPassengers?: number;
    passengerGroups?: string[];
  };

  const tripDate = _tripDate || getLocalDate();
  const [boardStop, setBoardStop] = useState(initBoard || "");
  const [alightStop, setAlightStop] = useState(initAlight || "");
  const [currentLegPrice, setCurrentLegPrice] = useState(initPrice || 0);

  useEffect(() => {
    if (ship && boardStop && alightStop) {
      const stops = getShipStops(ship);
      setCurrentLegPrice(calcLegPrice(stops, boardStop, alightStop));
    }
  }, [boardStop, alightStop, ship]);

  useEffect(() => {
    if (!shipId) return;
    Promise.all([
      getShipById(shipId),
      getSeatsForShipAndDate(shipId, tripDate, boardStop, alightStop),
    ]).then(([s, seatsData]) => {
      setShip(s);
      setSeats(seatsData);
      if ((location.state as any)?.accommodationType) {
        setStep("seat");
      }
      setLoading(false);
    });
  }, [shipId, tripDate, boardStop, alightStop, location.state]);

  useEffect(() => { setSelectedSeatIds([]); }, [seatTypeChoice]);

  useEffect(() => {
    if (step === "passenger") {
      // Cancel any bookings saved during a previous pass through this step so
      // their seats aren't held forever by unreachable orphaned rows.
      const staleIds = [...persistedBookingIdsRef.current];
      if (staleIds.length > 0) {
        persistedBookingIdsRef.current = new Set();
        staleIds.forEach(async (id) => {
          try {
            await deleteBooking(id);
          } catch (err) {
            console.error("Failed to cancel stale group booking:", id, err);
          }
        });
      }
      const selectedSeatsList = seats.filter(s => selectedSeatIds.includes(s.id));
      const initialPassengers = selectedSeatsList.map((seat, index) => {
        const type = routeGroups[index] || "regular";
        return {
          name: "",
          phone: "",
          email: "",
          type: type,
          verified: false,
          verifiedScore: 0,
          idImageUrl: null,
          idVerificationStatus: type === "regular" ? ("none" as const) : ("pending" as const),
          bookingId: generateId(),
          seatId: seat.id,
          seatLabel: seat.label
        };
      });
      setPassengers(initialPassengers);
    }
  }, [step, seats, selectedSeatIds, routeGroups]);

  if (loading) return (
    <div className="min-h-screen bg-[#060B11] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#E3000F]" />
    </div>
  );

  if (!ship) return <div className="min-h-screen bg-[#060B11] p-8 text-center text-white">Ship not found</div>;

  const regularSeats = seats.filter(s => s.type === "seat");
  const bunkSeats    = seats.filter(s => s.type === "bunk-upper" || s.type === "bunk-lower");
  const hasBunks     = bunkSeats.length > 0;

  const availableRegular = regularSeats.filter(s => s.status === "available").length;
  const availableBunk    = bunkSeats.filter(s => s.status === "available").length;

  const visibleSeats =
    seatTypeChoice === "seat" ? regularSeats :
    seatTypeChoice === "bunk" ? bunkSeats :
    seats;

  const rows = visibleSeats.reduce<Record<number, Seat[]>>((acc, seat) => {
    if (!acc[seat.row]) acc[seat.row] = [];
    acc[seat.row].push(seat);
    return acc;
  }, {});
  const rowNumbers   = Object.keys(rows).map(Number).sort((a, b) => a - b);
  const selectedSeatsList = seats.filter(s => selectedSeatIds.includes(s.id));
  const selectedSeat = selectedSeatsList[0] || null;

  const handleSeatToggle = (seat: Seat) => {
    if (selectedSeatIds.includes(seat.id)) {
      setSelectedSeatIds(selectedSeatIds.filter(id => id !== seat.id));
    } else {
      if (selectedSeatIds.length < routeTotal) {
        setSelectedSeatIds([...selectedSeatIds, seat.id]);
      } else {
        if (routeTotal === 1) {
          setSelectedSeatIds([seat.id]);
        } else {
          alert(`You can only select up to ${routeTotal} seats for this booking.`);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1118] text-white font-body pb-12">
      
      {/* â”€â”€ Top Header â”€â”€ */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (step === "type") navigate("/booking");
              else if (step === "seat") setStep("type");
              else if (step === "passenger") setStep("seat");
            }} 
            className="text-[#E3000F] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-display text-lg font-bold tracking-tight">SmartPort</span>
        </div>
        <div className="flex gap-4">
          <button className="text-[#8895A7] hover:text-white"><QrCode className="w-5 h-5" /></button>
          <button className="text-[#8895A7] hover:text-white"><CircleUserRound className="w-5 h-5" /></button>
        </div>
      </header>

      {/* â”€â”€ Progress Tracker â”€â”€ */}
      <div className="flex flex-col items-center mt-8 mb-12 max-w-sm mx-auto w-full px-8 hidden sm:flex">
        <div className="flex items-center justify-between w-full relative">
          <div className="absolute top-1/2 left-0 w-full h-px border-t border-dashed border-[#8895A7]/30 -z-10" />
          
          <div className="flex flex-col items-center gap-2 bg-[#0A1118] px-2 shadow-[0_0_20px_#0A1118]">
            <div className={`w-2 h-2 rounded-full ${step === "passenger" ? "bg-[#E3000F] shadow-[0_0_10px_rgba(227, 0, 15,1)]" : "bg-[#E3000F]"}`} />
            <span className="text-[8px] font-bold tracking-[0.2em] uppercase text-white">Search</span>
          </div>

          <div className="flex flex-col items-center gap-2 bg-[#0A1118] px-2 shadow-[0_0_20px_#0A1118]">
            <div className={`w-2 h-2 rounded-full ${step === "passenger" ? "bg-[#E3000F] shadow-[0_0_10px_rgba(227, 0, 15,1)]" : "bg-[#8895A7]/30"}`} />
            <span className={`text-[8px] font-bold tracking-[0.2em] uppercase ${step === "passenger" ? "text-white" : "text-[#8895A7]"}`}>Details</span>
          </div>

          <div className="flex flex-col items-center gap-2 bg-[#0A1118] px-2 shadow-[0_0_20px_#0A1118]">
            <div className="w-2 h-2 rounded-full bg-[#8895A7]/30" />
            <span className="text-[8px] font-bold tracking-[0.2em] uppercase text-[#8895A7]">Review</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* â•â• MOCKUP 6: PASSENGER DETAILS â•â• */}
        {step === "passenger" && selectedSeat && (
          <motion.div key="passenger" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}
            className="max-w-2xl mx-auto px-4 w-full flex flex-col gap-8 pb-32">
            
            <div className="text-center sm:text-left mb-2">
              <h1 className="font-display text-3xl font-extrabold mb-2">Passenger Details</h1>
              <p className="text-[#8895A7] text-sm">Please ensure the information matches your government ID.</p>
            </div>

            {/* Top Summary Card */}
            <div className="bg-[#131B24] rounded-2xl p-5 flex items-center gap-4 border border-white/5 shadow-xl">
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 hidden sm:block bg-[#280A0D]">
                <img src={ship.image || "https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=400&auto=format&fit=crop"} alt={ship.name} className="w-full h-full object-cover mix-blend-luminosity opacity-80" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-white font-bold text-lg">{ship.name}</h2>
                  <span className="px-3 py-1 rounded-full bg-[#4D0A0F] text-[#E3000F] text-[10px] font-bold tracking-[0.2em] uppercase shrink-0">
                    {ship.type.toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-[#8895A7] text-xs font-medium">
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {ship.departure}</span>
                  <span className="flex items-center gap-1.5"><Armchair className="w-4 h-4" /> Seats: {selectedSeatsList.map(s => s.label).join(", ")}</span>
                  {(() => {
                    const stops = getShipStops(ship);
                    if (stops.length <= 2) {
                      return boardStop && alightStop && (
                        <span className="flex items-center gap-1.5 text-[#E3000F] font-bold">
                          <Route className="w-4 h-4" /> {boardStop} â†’ {alightStop}
                        </span>
                      );
                    }
                    
                    const possibleAlight = stops.filter((_, idx) => {
                      const bIdx = stops.findIndex(s => s.location === boardStop);
                      return idx > bIdx;
                    });

                    return (
                      <div className="flex items-center gap-2">
                        <Route className="w-4 h-4 text-[#E3000F]" />
                        <span className="font-bold">{boardStop}</span>
                        <ArrowRight className="w-3 h-3 mx-1 opacity-50" />
                        <div className="relative group/select">
                          <select 
                            value={alightStop} 
                            onChange={(e) => setAlightStop(e.target.value)}
                            className="bg-[#351B1D] border border-white/10 rounded-lg pl-3 pr-8 py-1 text-[#E3000F] font-black appearance-none focus:outline-none focus:border-[#E3000F]/40 cursor-pointer shadow-sm"
                          >
                            {possibleAlight.map(s => (
                              <option key={s.location} value={s.location}>{s.location}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#E3000F] pointer-events-none transition-transform group-hover/select:translate-y-[-40%]" />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Dynamic Group Forms vs Legacy Form */}
            {routeTotal > 1 ? (
              <div className="space-y-6">
                {passengers.map((p, idx) => (
                  <div key={idx} className="bg-[#131B24] rounded-2xl p-6 border border-white/5 space-y-4 shadow-xl">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <h3 className="text-[#E3000F] font-bold text-xs tracking-wider uppercase">
                        Passenger {idx + 1}: {p.type === "pwd" ? "PWD" : p.type === "senior" ? "Senior Citizen" : p.type === "student" ? "Student" : "Adult (Regular)"}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded bg-white/5 border border-white/10 text-white font-bold text-[10px]">
                        Seat {p.seatLabel}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[#8895A7] text-[9px] font-bold tracking-widest uppercase block mb-1.5">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8895A7]" />
                          <input 
                            type="text" 
                            placeholder="Full name as printed on ID" 
                            value={p.name} 
                            onChange={e => {
                              const updated = [...passengers];
                              updated[idx].name = e.target.value;
                              setPassengers(updated);
                            }}
                            className="w-full bg-[#0A1118] border border-transparent focus:border-[#E3000F]/50 rounded-xl pl-11 pr-4 py-3.5 text-xs text-white placeholder:text-[#8895A7]/40 focus:outline-none transition-colors shadow-sm" 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[#8895A7] text-[9px] font-bold tracking-widest uppercase block mb-1.5">Phone Number</label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8895A7]" />
                            <input 
                              type="text" 
                              placeholder="09XXXXXXXXX" 
                              value={p.phone} 
                              onChange={e => {
                                const updated = [...passengers];
                                updated[idx].phone = e.target.value;
                                setPassengers(updated);
                              }}
                              className="w-full bg-[#0A1118] border border-transparent focus:border-[#E3000F]/50 rounded-xl pl-11 pr-4 py-3.5 text-xs text-white placeholder:text-[#8895A7]/40 focus:outline-none transition-colors shadow-sm" 
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[#8895A7] text-[9px] font-bold tracking-widest uppercase block mb-1.5">Email Address</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8895A7]" />
                            <input 
                              type="email" 
                              placeholder="email@example.com" 
                              value={p.email} 
                              onChange={e => {
                                const updated = [...passengers];
                                updated[idx].email = e.target.value;
                                setPassengers(updated);
                              }}
                              className="w-full bg-[#0A1118] border border-transparent focus:border-[#E3000F]/50 rounded-xl pl-11 pr-4 py-3.5 text-xs text-white placeholder:text-[#8895A7]/40 focus:outline-none transition-colors shadow-sm" 
                            />
                          </div>
                        </div>
                      </div>

                      {/* ID Verification for Student / PWD */}
                      {p.type !== "regular" && (
                        <div className="pt-1.5">
                          {p.verified ? (
                            <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-2.5">
                              <ShieldCheck className="w-4.5 h-4.5 text-green-500 shrink-0" />
                              <div className="flex-1">
                                <p className="text-green-400 text-xs font-bold">ID Captured & Attached</p>
                                <p className="text-white/40 text-[9px]">Verification status: Pending review</p>
                              </div>
                              <span className="text-[9px] text-green-500/60 font-mono font-bold tracking-wider uppercase">Validated</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setActivePassengerIdx(idx);
                                setScannerOpen(true);
                              }}
                              className="w-full py-3 bg-[#E3000F]/10 border border-dashed border-[#E3000F]/30 hover:border-[#E3000F] rounded-xl flex items-center justify-center gap-2 text-[#E3000F] hover:bg-[#E3000F]/15 transition-all text-xs font-bold"
                            >
                              <Camera className="w-4 h-4" />
                              Upload {p.type === "student" ? "Student" : p.type === "senior" ? "Senior" : "PWD"} ID
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Group Fare Summary & Action Box */}
                <div className="bg-[#131B24] rounded-2xl p-6 sm:p-8 mt-4 shadow-xl border border-white/5">
                  <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between sm:items-end gap-6">
                    <div>
                      <p className="text-[#8895A7] text-[10px] font-bold tracking-widest uppercase mb-1">Group Total Amount</p>
                      <p className="text-3xl font-extrabold text-white">
                        ₱{passengers.reduce((sum, p) => {
                          const base = currentLegPrice || ship.price;
                          const discount = p.type === "student" ? 0.2 : p.type === "regular" ? 0 : 0.2;
                          return sum + (base - Math.round(base * discount));
                        }, 0).toFixed(2)}
                      </p>
                    </div>

                    <button 
                      disabled={passengers.some(p => !p.name || !p.phone || !p.email || (p.type !== "regular" && !p.verified))}
                      onClick={async () => {
                        const currentBase = currentLegPrice || ship.price;
                        const user = await getCurrentUser();

                        // Immediate save all bookings to lock their seats
                        const groupTimestamp = new Date().toISOString();
                        const savePromises = passengers.map(p => {
                          const discount = p.type === "student" ? 0.2 : p.type === "regular" ? 0 : 0.2;
                          const deduction = Math.round(currentBase * discount);
                          const fPrice = currentBase - deduction;

                          return saveBooking({
                            id: p.bookingId,
                            shipId: shipId!,
                            seatId: p.seatId,
                            seatLabel: p.seatLabel,
                            passengerName: p.name,
                            passengerType: p.type as any,
                            phone: p.phone,
                            email: p.email || undefined,
                            status: "pending",
                            qrCode: `SPT-${p.bookingId}`,
                            createdAt: groupTimestamp,
                            tripDate: tripDate,
                            boardStop: boardStop || undefined,
                            alightStop: alightStop || undefined,
                            legPrice: currentBase,
                            idVerified: p.verified,
                            idImageUrl: p.idImageUrl || undefined,
                            idVerificationStatus: p.idVerificationStatus,
                            userId: user?.id || null
                          });
                        });

                        await Promise.all(savePromises);
                        passengers.forEach(p => persistedBookingIdsRef.current.add(p.bookingId));

                        // Navigate to review page passing group details
                        navigate(`/review/${ship.id}/group`, {
                          state: {
                            isGroup: true,
                            passengers: passengers.map(p => {
                              const discount = p.type === "student" ? 0.2 : p.type === "regular" ? 0 : 0.2;
                              const deduction = Math.round(currentBase * discount);
                              const fPrice = currentBase - deduction;
                              return {
                                ...p,
                                price: fPrice,
                                basePrice: currentBase,
                                deduction
                              };
                            }),
                            shipName: ship.name,
                            boardStop,
                            alightStop,
                            tripDate,
                            bookingType: (location.state as any)?.bookingType
                          }
                        });
                      }}
                      className="bg-[#E3000F] hover:bg-[#FF3B47] text-[#0A1118] font-bold px-8 py-4 sm:py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(227, 0, 15,0.2)] disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto cursor-pointer"
                    >
                      Review Group Booking
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="text-[#8895A7] text-[10px] font-bold tracking-widest uppercase block mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8895A7]" />
                    <input type="text" placeholder="e.g. Alexander Sterling" value={fullName} onChange={e => setFullName(e.target.value)}
                      className="w-full bg-[#131B24] border border-transparent focus:border-[#E3000F]/50 rounded-xl pl-12 pr-4 py-4 text-sm text-white placeholder:text-[#8895A7]/50 focus:outline-none transition-colors shadow-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[#8895A7] text-[10px] font-bold tracking-widest uppercase block mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8895A7]" />
                      <input type="text" placeholder="+1 (555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)}
                        className="w-full bg-[#131B24] border border-transparent focus:border-[#E3000F]/50 rounded-xl pl-12 pr-4 py-4 text-sm text-white placeholder:text-[#8895A7]/50 focus:outline-none transition-colors shadow-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[#8895A7] text-[10px] font-bold tracking-widest uppercase block mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8895A7]" />
                      <input type="email" placeholder="alex@example.com" value={email} onChange={e => setEmail(e.target.value)}
                        className="w-full bg-[#131B24] border border-transparent focus:border-[#E3000F]/50 rounded-xl pl-12 pr-4 py-4 text-sm text-white placeholder:text-[#8895A7]/50 focus:outline-none transition-colors shadow-sm" />
                    </div>
                  </div>
                </div>

                {/* Passenger Type */}
                <div>
                  <label className="text-[#8895A7] text-[10px] font-bold tracking-widest uppercase block mb-3">
                    Passenger Type
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { id: "Regular", label: "Regular", discount: 0 },
                      { id: "Student", label: "Student", discount: 0.2 },
                      { id: "Senior", label: "Senior", discount: 0.2 },
                      { id: "PWD", label: "PWD", discount: 0.2 },
                    ].map(pt => (
                      <button key={pt.id} onClick={() => {
                        if (pt.id === "Regular") {
                          setPassType("Regular");
                          setVerified(false);
                          setVerifiedScore(0);
                        } else {
                          setPassType(pt.id);
                          setVerified(false);
                          setVerifiedScore(0);
                        }
                      }}
                        className={`px-8 py-3 rounded-full text-xs font-bold transition-all border ${
                          passType === pt.id 
                            ? "bg-[#E3000F] text-[#0A1118] border-[#E3000F] shadow-[0_0_15px_rgba(227, 0, 15,0.3)]" 
                            : "bg-[#212A34] hover:bg-[#2A3440] text-white/70 border-white/5"
                        }`}>
                        {pt.label} {pt.discount > 0 && <span className={passType === pt.id ? "text-[#0A1118]/70" : "text-amber-500"}> {pt.discount * 100}% off</span>}
                      </button>
                    ))}
                  </div>

                  {/* Verified Badge */}
                  <AnimatePresence>
                    {verified && passType !== "Regular" && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="mt-4 flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
                        <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-green-400 text-sm font-bold">ID Captured</p>
                          <p className="text-white/40 text-[11px]">{isUploadingId ? "Uploading document..." : "Verification status: Pending Review"}</p>
                        </div>
                        <span className="text-[9px] text-green-500/60 font-mono tracking-widest uppercase">Validated</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Warning Box */}
                <AnimatePresence>
                  {passType !== "Regular" && !verified && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="border border-white/5 bg-white/5 rounded-xl p-4 flex gap-3 mt-2">
                        <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-white text-sm font-bold mb-1">ID Verification Required</h4>
                          <p className="text-white/50 text-xs leading-relaxed mb-3">
                            To claim the <span className="text-white font-bold">{passType === "Student" ? "Student" : passType === "PWD" ? "PWD" : "Senior"} discount</span>, you must provide a clear photo of your valid ID.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setPendingPassType(passType);
                              setScannerOpen(true);
                            }}
                            className="w-full py-3 bg-[#E3000F]/10 border border-dashed border-[#E3000F]/30 hover:border-[#E3000F] rounded-xl flex items-center justify-center gap-2 text-[#E3000F] hover:bg-[#E3000F]/15 transition-all text-xs font-bold"
                          >
                            <Camera className="w-4 h-4" />
                            Upload {passType === "Student" ? "Student" : passType === "PWD" ? "PWD" : "Senior"} ID
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Fare Summary & Action Box */}
                <div className="bg-[#131B24] rounded-2xl p-6 sm:p-8 mt-4 shadow-xl border border-white/5">
                  <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between sm:items-end gap-6">
                    <div>
                      <p className="text-[#8895A7] text-[10px] font-bold tracking-widest uppercase mb-1">Total Amount</p>
                      <p className="text-3xl font-extrabold text-white">
                        ₱{((currentLegPrice || ship.price) - Math.round((currentLegPrice || ship.price) * (passType === "Student" ? 0.2 : passType === "Regular" ? 0 : 0.2))).toFixed(2)}
                      </p>
                    </div>

                    <button 
                      disabled={!fullName || !phone || !email || (passType !== "Regular" && !verified)}
                      onClick={async () => {
                        const currentBase = currentLegPrice || ship.price;
                        const discount = passType === "Student" ? 0.2 : passType === "Regular" ? 0 : 0.2;
                        const deduction = Math.round(currentBase * discount);
                        const fPrice = currentBase - deduction;
                        
                        let bId = sessionStorage.getItem("current_booking_id");
                        
                        // If regular passenger, we save now to lock the seat
                        if (!bId && passType === "Regular") {
                          bId = generateId();
                          try {
                            const user = await getCurrentUser();
                            await saveBooking({
                              id: bId,
                              shipId: shipId!,
                              seatId: selectedSeatIds[0] || "",
                              seatLabel: selectedSeat?.label || "",
                              passengerName: fullName,
                              passengerType: "regular",
                              phone: phone,
                              email: email || undefined,
                              status: "pending",
                              qrCode: `SPT-${bId}`,
                              createdAt: new Date().toISOString(),
                              tripDate: tripDate,
                              boardStop: boardStop || undefined,
                              alightStop: alightStop || undefined,
                              legPrice: currentLegPrice || undefined,
                              idVerified: false,
                              idVerificationStatus: "none",
                              userId: user?.id || null
                            });
                            sessionStorage.setItem("current_booking_id", bId);
                          } catch (err) {
                            console.error("Failed to lock seat:", err);
                          }
                        }

                        navigate(`/review/${ship.id}/${selectedSeat.id}`, {
                          state: { 
                            bookingId: bId || undefined,
                            tripDate, name: fullName, phone, email, passengerType: passType.toLowerCase(), 
                            price: fPrice, basePrice: currentBase, deduction, verified, verifiedScore,
                            idImageUrl, idVerificationStatus: passType === "Regular" ? "none" : "pending",
                            boardStop, alightStop, legPrice: currentLegPrice,
                            bookingType: (location.state as any)?.bookingType,
                            seatLabel: selectedSeat.label,
                            shipName: ship.name
                          }
                        });
                      }}
                      className="bg-[#E3000F] hover:bg-[#FF3B47] text-[#0A1118] font-bold px-8 py-4 sm:py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(227, 0, 15,0.2)] disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                    >
                      Review Booking
                    </button>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        )}

        {/* Biometric Scanner Modal */}
        <BiometricScanner
          isOpen={scannerOpen}
          onClose={() => {
            setScannerOpen(false);
            setPendingPassType(null);
          }}
          onSuccess={async (fileBlob) => {
            setIsUploadingId(true);
            try {
              if (routeTotal > 1) {
                if (activePassengerIdx === null) return;
                const currentPassenger = passengers[activePassengerIdx];
                const url = await uploadIDImage(currentPassenger.bookingId, fileBlob);
                
                const updatedPassengers = [...passengers];
                updatedPassengers[activePassengerIdx] = {
                  ...currentPassenger,
                  idImageUrl: url,
                  verified: true,
                  verifiedScore: 1.0,
                  idVerificationStatus: "pending"
                };
                setPassengers(updatedPassengers);

                // Immediate save to lock seat and submit ID for this group member
                const user = await getCurrentUser();
                const currentBase = currentLegPrice || ship.price;
                const discount = currentPassenger.type === "student" ? 0.2 : currentPassenger.type === "regular" ? 0 : 0.2;
                const deduction = Math.round(currentBase * discount);
                const fPrice = currentBase - deduction;

                await saveBooking({
                  id: currentPassenger.bookingId,
                  shipId: shipId!,
                  seatId: currentPassenger.seatId,
                  seatLabel: currentPassenger.seatLabel,
                  passengerName: currentPassenger.name || "Pending Name",
                  passengerType: currentPassenger.type.toLowerCase() as any,
                  phone: currentPassenger.phone || "0000000000",
                  email: currentPassenger.email || undefined,
                  status: "pending",
                  qrCode: `SPT-${currentPassenger.bookingId}`,
                  createdAt: new Date().toISOString(),
                  tripDate: tripDate,
                  boardStop: boardStop || undefined,
                  alightStop: alightStop || undefined,
                  legPrice: currentBase,
                  idVerified: true,
                  idImageUrl: url,
                  idVerificationStatus: "pending",
                  userId: user?.id || null
                });

                persistedBookingIdsRef.current.add(currentPassenger.bookingId);

              } else {
                // REUSE existing ID if we have one to avoid "Ghost" tickets
                let bId = sessionStorage.getItem("current_booking_id");
                const bookingIdToUse = bId || generateId();
                
                const url = await uploadIDImage(bookingIdToUse, fileBlob);
                setIdImageUrl(url);
                setVerified(true);
                setVerifiedScore(1.0);
                const pType = pendingPassType || passType;
                if (pendingPassType) setPassType(pendingPassType);

                // IMMEDIATE PERSISTENCE
                // This ensures the seat is locked and admin can see the request
                const user = await getCurrentUser();
                await saveBooking({
                  id: bookingIdToUse,
                  shipId: shipId!,
                  seatId: selectedSeatIds[0] || "",
                  seatLabel: selectedSeat?.label || "",
                  passengerName: fullName || "Pending Name",
                  passengerType: pType.toLowerCase() as any,
                  phone: phone || "0000000000",
                  email: email || undefined,
                  status: "pending",
                  qrCode: `SPT-${bookingIdToUse}`,
                  createdAt: new Date().toISOString(),
                  tripDate: tripDate,
                  boardStop: boardStop || undefined,
                  alightStop: alightStop || undefined,
                  legPrice: currentLegPrice || undefined,
                  idVerified: true,
                  idImageUrl: url,
                  idVerificationStatus: "pending",
                  userId: user?.id || null
                });
                
                // Store booking ID for later steps
                sessionStorage.setItem("current_booking_id", bookingIdToUse);
              }
            } catch (err: any) {
              console.error("Upload/Save error:", err);
              alert(err.message || "Failed to process ID. Please try again.");
            } finally {
              setIsUploadingId(false);
              setScannerOpen(false);
              setPendingPassType(null);
            }
          }}
        />

        {/* â•â• STEP 2: CHOOSE ACCOMMODATION TYPE â•â• */}
        {step === "type" && (
          <motion.div key="type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}
            className="max-w-xl mx-auto px-4 w-full pb-nav">
            <h2 className="text-white text-3xl font-extrabold mb-1">Choose your accommodation</h2>
            <p className="text-white/60 text-sm mb-8">Select how you'd like to travel on this trip.</p>

            <div className={`grid gap-4 mb-8 ${hasBunks ? "grid-cols-2" : "grid-cols-1 max-w-sm mx-auto"}`}>
              <button onClick={() => availableRegular > 0 && setSeatTypeChoice("seat")} disabled={availableRegular === 0}
                className={`bg-[#131B24] rounded-[2rem] p-6 flex flex-col items-center gap-4 border-2 transition-all w-full group ${availableRegular === 0 ? "opacity-40 cursor-not-allowed border-transparent" : "border-transparent hover:border-[#E3000F]/50 cursor-pointer"}`}>
                <div className="w-16 h-16 rounded-2xl bg-[#351B1D] group-hover:bg-[#E3000F]/10 flex items-center justify-center transition-colors">
                  <Armchair className="w-8 h-8 text-[#E3000F]" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-white text-lg mb-1">Regular Seat</p>
                  <p className="text-xs text-white/50 leading-relaxed">Standard upright cabin seat.</p>
                </div>
                <div className="w-full pt-4 mt-auto border-t border-white/5 flex flex-col items-center text-sm">
                  <span className={`font-extrabold ${availableRegular > 0 ? "text-[#E3000F]" : "text-red-400"}`}>{availableRegular} / {regularSeats.length}</span>
                  <span className="text-[10px] font-bold tracking-widest text-white/30 uppercase mt-1">Available</span>
                </div>
              </button>

              {hasBunks && (
                <button onClick={() => availableBunk > 0 && setSeatTypeChoice("bunk")} disabled={availableBunk === 0}
                  className={`bg-[#131B24] rounded-[2rem] p-6 flex flex-col items-center gap-4 border-2 transition-all w-full group ${availableBunk === 0 ? "opacity-40 cursor-not-allowed border-transparent" : "border-transparent hover:border-amber-400/50 cursor-pointer"}`}>
                  <div className="w-16 h-16 rounded-2xl bg-[#351B1D] group-hover:bg-amber-400/10 flex items-center justify-center transition-colors">
                    <BedDouble className="w-8 h-8 text-amber-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-white text-lg mb-1">Bunk Bed</p>
                    <p className="text-xs text-white/50 leading-relaxed">Lie-flat berth for overnight trips.</p>
                  </div>
                  <div className="w-full pt-4 mt-auto border-t border-white/5 flex justify-between px-2 text-xs">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-amber-400">{bunkSeats.filter(s => s.type === "bunk-upper" && s.status === "available").length}</span>
                      <span className="text-[9px] uppercase tracking-widest text-amber-400/60 font-bold mt-1">Upper</span>
                    </div>
                    <div className="w-px bg-white/5" />
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-[#E3000F]">{bunkSeats.filter(s => s.type === "bunk-lower" && s.status === "available").length}</span>
                      <span className="text-[9px] uppercase tracking-widest text-[#E3000F]/60 font-bold mt-1">Lower</span>
                    </div>
                  </div>
                </button>
              )}
            </div>

            <motion.button whileHover={seatTypeChoice ? { scale: 1.02 } : {}} whileTap={seatTypeChoice ? { scale: 0.98 } : {}} disabled={!seatTypeChoice}
              onClick={() => seatTypeChoice && setStep("seat")}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${seatTypeChoice ? "bg-[#E3000F] text-[#0A1118] shadow-[0_0_20px_rgba(227, 0, 15,0.3)] hover:shadow-[0_0_30px_rgba(227, 0, 15,0.5)]" : "bg-[#351B1D] text-white/30 cursor-not-allowed"}`}>
              Continue to map
            </motion.button>
          </motion.div>
        )}

        {/* â•â• STEP 3: SEAT SELECTION â•â• */}
        {step === "seat" && (
          <motion.div key="seat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}
            className="max-w-xl mx-auto px-4 w-full pb-nav">
            <h2 className="text-white text-2xl font-extrabold mb-1">Select your {seatTypeChoice === "bunk" ? "bed" : "seat"}</h2>
            <p className="text-white/60 text-sm mb-6">
              Selected <span className="text-[#E3000F] font-bold">{selectedSeatIds.length}</span> of <span className="text-[#E3000F] font-bold">{routeTotal}</span> required {routeTotal === 1 ? "seat" : "seats"}.
            </p>

            <div className="bg-[#131B24] rounded-[2rem] p-6 mb-6">
              <div className="flex justify-center gap-6 text-xs text-white/60 mb-8 border-b border-white/5 pb-6">
                <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#E3000F]/20 border border-[#E3000F]/40" /> Available</span>
                <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#E3000F]" /> Selected</span>
                <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-white/10" /> Booked</span>
              </div>

              <div className="overflow-x-auto custom-scroll pb-4">
                <div className="flex justify-center mb-6"><div className="w-24 h-8 rounded-t-xl bg-[#351B1D] flex items-center justify-center text-[10px] uppercase font-bold tracking-widest text-[#E3000F]">Front</div></div>
                <div className="flex flex-col items-center gap-3">
                  {rowNumbers.map((rowNum) => {
                    const rowSeats = rows[rowNum].sort((a, b) => a.col - b.col);
                    const isBunkRow = rowSeats.some(s => s.type === "bunk-upper" || s.type === "bunk-lower");
                    return (
                      <div key={rowNum} className="flex items-center gap-4">
                        <span className={`text-[10px] w-8 text-right shrink-0 font-bold uppercase tracking-widest ${isBunkRow ? "text-amber-400" : "text-white/30"}`}>R{rowNum}</span>
                        <div className="flex gap-2 flex-wrap">
                          {rowSeats.map((seat) => (
                            <SeatButton 
                              key={seat.id} 
                              seat={seat} 
                              selected={selectedSeatIds.includes(seat.id)} 
                              onToggle={() => handleSeatToggle(seat)} 
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-center mt-6"><div className="w-32 h-8 rounded-b-xl bg-[#351B1D] flex items-center justify-center text-[10px] uppercase font-bold tracking-widest text-[#E3000F]">Rear</div></div>
              </div>
            </div>

            <motion.button 
              whileHover={selectedSeatIds.length === routeTotal ? { scale: 1.02 } : {}} 
              whileTap={selectedSeatIds.length === routeTotal ? { scale: 0.98 } : {}} 
              disabled={selectedSeatIds.length !== routeTotal}
              onClick={() => selectedSeatIds.length === routeTotal && setStep("passenger")}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${selectedSeatIds.length === routeTotal ? "bg-[#E3000F] text-[#0A1118] shadow-[0_0_20px_rgba(227, 0, 15,0.3)] hover:shadow-[0_0_30px_rgba(227, 0, 15,0.5)] cursor-pointer" : "bg-[#351B1D] text-white/30 cursor-not-allowed"}`}>
              {selectedSeatIds.length === routeTotal 
                ? `Confirm ${selectedSeatsList.map(s => s.label).join(", ")} & Details` 
                : `Select ${routeTotal - selectedSeatIds.length} more seat(s)`}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 w-full z-50 sm:hidden pb-safe px-3">
        <div className="max-w-md mx-auto bg-white/55 backdrop-blur-2xl border border-white/60 shadow-[0_-4px_24px_rgba(0,0,0,0.18),0_8px_32px_rgba(0,0,0,0.10)] rounded-[26px] px-2 py-2">
          <div className="flex items-center justify-between gap-1">
            <button onClick={() => navigate("/booking")} className="flex-1 flex flex-col items-center justify-center gap-1 min-h-12 group">
              <Home className="w-[22px] h-[22px] text-slate-600 group-hover:text-[#E3000F] transition-colors" strokeWidth={2} /><span className="text-[10px] font-bold tracking-[0.06em] uppercase text-slate-600">Home</span>
            </button>
            <button className="flex-1 flex flex-col items-center justify-center gap-1 bg-[#E3000F] text-white rounded-2xl min-h-12 shadow-[0_8px_20px_rgba(227,0,15,0.35)]">
              <ShipIcon className="w-6 h-6" fill="currentColor" strokeWidth={1.6} /><span className="text-[10px] font-bold tracking-[0.06em] uppercase">Bookings</span>
            </button>
            <button className="flex-1 flex flex-col items-center justify-center gap-1 min-h-12 group">
              <Calendar className="w-[22px] h-[22px] text-slate-600 group-hover:text-[#E3000F] transition-colors" strokeWidth={2} /><span className="text-[10px] font-bold tracking-[0.06em] uppercase text-slate-600">Schedule</span>
            </button>
            <button className="flex-1 flex flex-col items-center justify-center gap-1 min-h-12 group">
              <User className="w-[22px] h-[22px] text-slate-600 group-hover:text-[#E3000F] transition-colors" strokeWidth={2} /><span className="text-[10px] font-bold tracking-[0.06em] uppercase text-slate-600">Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatSelection;