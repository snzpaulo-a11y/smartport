import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getShipById, getShipStops, calcLegPrice, Stop, isStopDeparted, getLocalDate, getNextLocalDate } from "@/lib/store";
import { ArrowLeft, MapPin, ChevronRight, Loader2, Calendar, Clock, ChevronDown, Check, Anchor } from "lucide-react";

const LegSelector = () => {
  const { shipId } = useParams<{ shipId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { accommodationType, tripDate: _initDate } = (location.state || {}) as {
    accommodationType?: "seat" | "bunk";
    tripDate?: string;
  };

  const [tripDate, setTripDate] = useState(_initDate || getLocalDate());
  const [stops, setStops] = useState<Stop[]>([]);
  const [ship, setShip] = useState<any>(null);

  const cleanStr = (s: string) => {
    if (!s) return "";
    const words = s.split(" ");
    return words.filter((w, i) => w !== words[i - 1]).join(" ");
  };

  const [boardStop, setBoardStop] = useState((location.state as any)?.boardStop || "");
  const [alightStop, setAlightStop] = useState((location.state as any)?.alightStop || "");
  const [loading, setLoading] = useState(true);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [reserveDate, setReserveDate] = useState(getNextLocalDate());
  
  // Group passenger counters
  const [pwdCount, setPwdCount] = useState(0);
  const [seniorCount, setSeniorCount] = useState(0);
  const [adultCount, setAdultCount] = useState(1);
  const [studentCount, setStudentCount] = useState(0);

  const getDayName = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString('en-US', { weekday: 'short' });
  };

  const isDateOnSchedule = (dateStr: string, schedule?: string) => {
    if (!schedule) return true;
    const day = getDayName(dateStr);
    return schedule.split(",").map(d => d.trim()).includes(day);
  };

  const isOperatingToday = (schedule?: string) => {
    if (!schedule) return true;
    const day = new Date().toLocaleDateString('en-US', { weekday: 'short' });
    return schedule.split(",").map(d => d.trim()).includes(day);
  };

  useEffect(() => {
    if (!shipId) return;
    getShipById(shipId).then((ship) => {
      if (!ship) { setLoading(false); return; }
      setShip(ship);
      const s = getShipStops(ship);
      setStops(s);

      // Default selection if not passed in state
      if (!boardStop) {
        const firstAvailable = s.slice(0, -1).find(st => !isStopDeparted(st, tripDate));
        if (firstAvailable) setBoardStop(firstAvailable.location);
      }
      if (!alightStop && s.length > 1) {
        setAlightStop(s[s.length - 1].location);
      }
      setLoading(false);
    });
  }, [shipId, tripDate]);

  const validAlightStops = stops.filter((s) => {
    const bIdx = stops.findIndex((x) => x.location === boardStop);
    const sIdx = stops.findIndex((x) => x.location === s.location);
    return sIdx > bIdx;
  });

  const price = calcLegPrice(stops, boardStop, alightStop);

  // Generate all possible legs (boarding to alight combinations)
  const availableLegs: Array<{ board: string; alight: string; label: string; price: number; isDeparted: boolean }> = [];
  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      const board = stops[i].location;
      const alight = stops[j].location;
      const legPrice = calcLegPrice(stops, board, alight);
      const isDeparted = isStopDeparted(stops[i], tripDate);
      availableLegs.push({
        board,
        alight,
        label: `${cleanStr(board)} → ${cleanStr(alight)}`,
        price: legPrice,
        isDeparted
      });
    }
  }

  const selectedBoardData = stops.find(s => s.location === boardStop);
  const isBoardDeparted = selectedBoardData ? isStopDeparted(selectedBoardData, tripDate) : false;

  const handleContinue = (type: "book" | "reserve" = "book", selectedDate?: string) => {
    let finalBoard = boardStop;
    let finalAlight = alightStop;
    let finalPrice = price;
    const finalDate = selectedDate || tripDate;

    if (!finalBoard || !finalAlight) {
      if (stops.length >= 2) {
        finalBoard = stops[0].location;
        finalAlight = stops[stops.length-1].location;
        finalPrice = calcLegPrice(stops, finalBoard, finalAlight);
      }
    }

    const totalPassengers = pwdCount + seniorCount + adultCount + studentCount;
    if (totalPassengers === 0) {
      alert("Please select at least 1 passenger ticket.");
      return;
    }

    const passengerGroups: string[] = [];
    for (let i = 0; i < pwdCount; i++) passengerGroups.push("pwd");
    for (let i = 0; i < seniorCount; i++) passengerGroups.push("senior");
    for (let i = 0; i < adultCount; i++) passengerGroups.push("regular");
    for (let i = 0; i < studentCount; i++) passengerGroups.push("student");

    navigate(`/accommodation/${shipId}`, {
      state: { 
        accommodationType, 
        tripDate: finalDate, 
        boardStop: finalBoard, 
        alightStop: finalAlight, 
        legPrice: finalPrice, 
        bookingType: type,
        pwdCount,
        seniorCount,
        adultCount,
        studentCount,
        totalPassengers,
        passengerGroups
      },
    });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 glass-card rounded-xl hover:bg-muted/50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Choose Your Route</h1>
          <p className="text-xs text-muted-foreground">{ship?.name}</p>
        </div>
      </div>

      {/* Interactive Date Picker */}
      <div className="glass-card rounded-xl p-3 mb-5 flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span className="font-bold uppercase tracking-wider">Travel Date</span>
        </div>
        <input 
          type="date" 
          value={tripDate}
          min={getLocalDate()}
          onChange={(e) => setTripDate(e.target.value)}
          className="bg-transparent border-none text-white font-bold text-sm focus:outline-none cursor-pointer flex-1 text-right"
        />
      </div>

      {/* Route map */}
      <div className="glass-card rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Live Fleet Route</p>
          {stops.length > 2 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
              <Anchor className="w-3 h-3 text-primary" />
              <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Inter-Island Route</span>
            </div>
          )}
        </div>
        <div className="relative">
          {stops.map((stop, i) => {
            const departed = isStopDeparted(stop, tripDate);
            return (
              <button
                key={i}
                onClick={() => {
                  if (!boardStop || boardStop === stop.location) {
                    setBoardStop(stop.location);
                    setAlightStop("");
                  } else {
                    const bIdx = stops.findIndex(s => s.location === boardStop);
                    if (i > bIdx) setAlightStop(stop.location);
                    else {
                      setBoardStop(stop.location);
                      setAlightStop("");
                    }
                  }
                }}
                className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all border outline-none text-left ${
                  boardStop === stop.location ? "bg-secondary/10 border-secondary/30 ring-1 ring-secondary/20" :
                  alightStop === stop.location ? "bg-destructive/10 border-destructive/30 ring-1 ring-destructive/20" :
                  departed ? "bg-white/[0.02] border-white/5 opacity-80" :
                  "hover:bg-white/5 border-transparent cursor-pointer"
                }`}
              >
                <div className="flex flex-col items-center shrink-0">
                  <div className={`w-3 h-3 rounded-full border-2 mt-1 ${
                    departed ? "bg-muted border-muted" :
                    boardStop === stop.location ? "bg-secondary border-secondary scale-125" :
                    alightStop === stop.location ? "bg-destructive border-destructive scale-125" :
                    i === 0 ? "bg-blue-400 border-blue-400" :
                    i === stops.length - 1 ? "bg-destructive/50 border-destructive/50" :
                    "bg-primary border-primary"
                  }`} />
                  {i < stops.length - 1 && <div className={`w-0.5 h-8 mt-1.5 ${departed ? "bg-muted/30" : "bg-border/40"}`} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold text-sm ${
                      departed ? "text-muted-foreground" :
                      boardStop === stop.location ? "text-secondary" :
                      alightStop === stop.location ? "text-destructive" :
                      "text-white"
                    }`}>
                      {cleanStr(stop.location)}
                    </p>
                    {departed && (
                      <span className="text-[8px] font-bold uppercase tracking-tighter bg-white/5 px-1.5 py-0.5 rounded text-white/40">Departed</span>
                    )}
                    {(boardStop === stop.location || alightStop === stop.location) && (
                      <Check className="w-3 h-3 text-secondary animate-in zoom-in" />
                    )}
                  </div>
                  <p className="text-[11px] text-[#8895A7] mt-0.5">
                    {stop.departure && `Departs ${stop.departure}`}
                    {stop.departure && stop.arrival && " · "}
                    {stop.arrival && `Arrives ${stop.arrival}`}
                  </p>
                </div>
                {stop.price > 0 && i > 0 && (
                  <span className={`text-xs font-bold shrink-0 mt-1 ${departed ? "text-muted-foreground/60" : "text-primary"}`}>₱{stop.price}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Combined Route Selector */}
      <div className="glass-card rounded-2xl p-5 mb-5">
        <label className="text-[10px] font-bold text-[#8895A7] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-secondary" /> Voyage Route
        </label>
        <div className="relative group/select">
          <select 
            value={boardStop && alightStop ? `${boardStop}-${alightStop}` : ""} 
            onChange={(e) => {
              const [b, a] = e.target.value.split("-");
              setBoardStop(b);
              setAlightStop(a);
            }}
            className="w-full bg-[#351B1D] border border-white/10 rounded-xl px-5 py-4 text-white font-bold appearance-none focus:outline-none focus:border-secondary/50 transition-all cursor-pointer text-sm shadow-lg"
          >
            <option value="" disabled>Select Voyage Route</option>
            {availableLegs.map((leg) => (
              <option key={`${leg.board}-${leg.alight}`} value={`${leg.board}-${leg.alight}`}>
                {leg.label} {leg.isDeparted ? "(Departed)" : `· ₱${leg.price}`}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none transition-transform group-hover/select:scale-110" />
        </div>
      </div>

      {/* Passenger Selection Counters */}
      <div className="glass-card rounded-2xl p-5 mb-5 space-y-4">
        <label className="text-[10px] font-bold text-[#8895A7] uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
          Passenger Tickets
        </label>
        
        {/* Pwd Counter */}
        <div className="flex items-center justify-between bg-[#351B1D] p-3.5 rounded-xl border border-white/5">
          <span className="font-bold text-sm text-white">PWD</span>
          <div className="flex items-center gap-4">
            <button 
              type="button" 
              onClick={() => setPwdCount(Math.max(0, pwdCount - 1))}
              className="w-8 h-8 rounded-lg bg-[#222E3A] border border-white/10 flex items-center justify-center font-bold text-white hover:bg-white/10 transition-colors"
            >
              -
            </button>
            <span className="font-bold text-base text-white w-4 text-center">{pwdCount}</span>
            <button 
              type="button" 
              onClick={() => setPwdCount(pwdCount + 1)}
              className="w-8 h-8 rounded-lg bg-[#E3000F]/20 border border-[#E3000F]/40 flex items-center justify-center font-bold text-[#E3000F] hover:bg-[#E3000F]/30 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Senior Citizen Counter */}
        <div className="flex items-center justify-between bg-[#351B1D] p-3.5 rounded-xl border border-white/5">
          <span className="font-bold text-sm text-white">Senior Citizen</span>
          <div className="flex items-center gap-4">
            <button 
              type="button" 
              onClick={() => setSeniorCount(Math.max(0, seniorCount - 1))}
              className="w-8 h-8 rounded-lg bg-[#222E3A] border border-white/10 flex items-center justify-center font-bold text-white hover:bg-white/10 transition-colors"
            >
              -
            </button>
            <span className="font-bold text-base text-white w-4 text-center">{seniorCount}</span>
            <button 
              type="button" 
              onClick={() => setSeniorCount(seniorCount + 1)}
              className="w-8 h-8 rounded-lg bg-[#E3000F]/20 border border-[#E3000F]/40 flex items-center justify-center font-bold text-[#E3000F] hover:bg-[#E3000F]/30 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Adult Counter */}
        <div className="flex items-center justify-between bg-[#351B1D] p-3.5 rounded-xl border border-white/5">
          <span className="font-bold text-sm text-white">Adult (Regular)</span>
          <div className="flex items-center gap-4">
            <button 
              type="button" 
              onClick={() => setAdultCount(Math.max(0, adultCount - 1))}
              className="w-8 h-8 rounded-lg bg-[#222E3A] border border-white/10 flex items-center justify-center font-bold text-white hover:bg-white/10 transition-colors"
            >
              -
            </button>
            <span className="font-bold text-base text-white w-4 text-center">{adultCount}</span>
            <button 
              type="button" 
              onClick={() => setAdultCount(adultCount + 1)}
              className="w-8 h-8 rounded-lg bg-[#E3000F]/20 border border-[#E3000F]/40 flex items-center justify-center font-bold text-[#E3000F] hover:bg-[#E3000F]/30 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Student Counter */}
        <div className="flex items-center justify-between bg-[#351B1D] p-3.5 rounded-xl border border-white/5">
          <span className="font-bold text-sm text-white">Student</span>
          <div className="flex items-center gap-4">
            <button 
              type="button" 
              onClick={() => setStudentCount(Math.max(0, studentCount - 1))}
              className="w-8 h-8 rounded-lg bg-[#222E3A] border border-white/10 flex items-center justify-center font-bold text-white hover:bg-white/10 transition-colors"
            >
              -
            </button>
            <span className="font-bold text-base text-white w-4 text-center">{studentCount}</span>
            <button 
              type="button" 
              onClick={() => setStudentCount(studentCount + 1)}
              className="w-8 h-8 rounded-lg bg-[#E3000F]/20 border border-[#E3000F]/40 flex items-center justify-center font-bold text-[#E3000F] hover:bg-[#E3000F]/30 transition-colors"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Summary bar */}
      {boardStop && alightStop && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-4 mb-4 border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-foreground">{cleanStr(boardStop)}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-foreground">{cleanStr(alightStop)}</span>
            </div>
            <span className="font-display font-bold text-primary text-xl">₱{price.toLocaleString()}</span>
          </div>
        </motion.div>
      )}

      {(() => {
        const operating = isOperatingToday(ship?.scheduleDays);
        const departed = isBoardDeparted;
        const isToday = tripDate === getLocalDate();

        return (
          <div className="flex gap-4">
            {/* Primary Action: Book for Today (if valid) */}
            {isToday ? (
              <>
                {!operating ? (
                  <button
                    disabled
                    className="flex-1 py-4 bg-white/5 border-2 border-white/5 text-white/30 font-extrabold rounded-2xl transition-all text-lg cursor-not-allowed"
                  >
                    Off-Schedule
                  </button>
                ) : departed ? (
                  <button
                    disabled
                    className="flex-1 py-4 bg-white/5 border-2 border-white/5 text-white/30 font-extrabold rounded-2xl transition-all text-lg cursor-not-allowed"
                  >
                    Departed Today
                  </button>
                ) : (
                  <button
                    onClick={() => handleContinue("book")}
                    disabled={!boardStop || !alightStop}
                    className="flex-1 py-4 bg-[#E3000F] hover:bg-[#20A6CC] disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed text-black font-extrabold rounded-2xl transition-all shadow-lg shadow-[#E3000F]/10 text-lg"
                  >
                    Book Now
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => handleContinue("book")}
                disabled={!boardStop || !alightStop}
                className="flex-1 py-4 bg-[#E3000F] hover:bg-[#20A6CC] disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed text-black font-extrabold rounded-2xl transition-all shadow-lg shadow-[#E3000F]/10 text-lg"
              >
                Book Now
              </button>
            )}

            {/* Secondary Action: Reserve for Future */}
            <button
              onClick={() => setIsReserveModalOpen(true)}
              className="flex-1 py-4 bg-transparent border-2 border-white/10 hover:border-white/20 hover:bg-white/5 text-white font-extrabold rounded-2xl transition-all text-lg"
            >
              Reserve
            </button>
          </div>
        );
      })()}

      {/* Reservation Date Modal */}
      <AnimatePresence>
        {isReserveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsReserveModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm glass-card rounded-3xl p-8 border border-white/10 shadow-2xl"
            >
              <h3 className="font-display font-bold text-xl text-white mb-2 text-center">Reserve Your Trip</h3>
              <p className="text-[#8895A7] text-xs text-center mb-8">Reservations are limited to 1 week from today.</p>
              
              <div className="space-y-6">
                <div className="bg-[#351B1D] border border-white/10 rounded-2xl p-4">
                  <label className="text-[10px] font-bold text-[#8895A7] uppercase tracking-widest mb-3 block">Selected Date</label>
                  <input 
                    type="date" 
                    value={reserveDate}
                    min={getNextLocalDate()}
                    max={(() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 7);
                      return d.toISOString().split('T')[0];
                    })()}
                    onChange={(e) => setReserveDate(e.target.value)}
                    className={`w-full bg-transparent border-none text-white font-black text-xl focus:outline-none cursor-pointer ${!isDateOnSchedule(reserveDate, ship?.scheduleDays) ? 'text-red-400' : ''}`}
                  />
                </div>

                {/* Schedule Validation Message */}
                {(() => {
                  const schedule = ship?.scheduleDays;
                  const dayName = getDayName(reserveDate);
                  const valid = isDateOnSchedule(reserveDate, schedule);
                  
                  if (!valid) {
                    return (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                        <p className="text-[10px] font-bold text-red-400 leading-relaxed">
                          This vessel does not operate on {dayName}. Please select a valid sailing day ({schedule}).
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="px-1">
                      <p className="text-[9px] font-bold text-[#8895A7] uppercase tracking-widest opacity-60">
                         Operational Days: <span className="text-secondary">{schedule || "Daily"}</span>
                      </p>
                    </div>
                  );
                })()}

                <div className="flex flex-col gap-3">
                  <button
                    disabled={!isDateOnSchedule(reserveDate, ship?.scheduleDays)}
                    onClick={() => {
                      setIsReserveModalOpen(false);
                      handleContinue("reserve", reserveDate);
                    }}
                    className="w-full py-4 bg-[#E3000F] disabled:bg-white/5 disabled:text-white/20 disabled:shadow-none text-black font-black rounded-2xl shadow-lg shadow-[#E3000F]/20 transition-all font-display"
                  >
                    Confirm & Proceed
                  </button>
                  <button
                    onClick={() => setIsReserveModalOpen(false)}
                    className="w-full py-4 bg-white/5 text-white font-bold rounded-2xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LegSelector;