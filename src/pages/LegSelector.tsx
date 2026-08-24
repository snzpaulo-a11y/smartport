import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getShipById, getShipStops, calcLegPrice, Stop, Ship, isStopDeparted, getLocalDate, getNextLocalDate, isDayOnSchedule, isOperatingToday, isLegOperating, getLegScheduleDays, getScheduleDays } from "@/lib/store";
import { ArrowLeft, MapPin, ChevronRight, ChevronLeft, Loader2, Calendar, Clock, ChevronDown, Check, Anchor, X } from "lucide-react";

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

// Monday-first month grid: leading nulls, then day numbers.
function buildCalendarMonth(year: number, month: number): (number | null)[] {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function fmtLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
  const [ship, setShip] = useState<Ship | null>(null);

  const cleanStr = (s: string) => {
    if (!s) return "";
    const words = s.split(" ");
    return words.filter((w, i) => w !== words[i - 1]).join(" ");
  };

  const [boardStop, setBoardStop] = useState((location.state as { boardStop?: string } | null)?.boardStop || "");
  const [alightStop, setAlightStop] = useState((location.state as { alightStop?: string } | null)?.alightStop || "");
  const [loading, setLoading] = useState(true);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [reserveDate, setReserveDate] = useState(getNextLocalDate());
  const [calView, setCalView] = useState<{ y: number; m: number } | null>(null);
  
  // Group passenger counters
  const [pwdCount, setPwdCount] = useState(0);
  const [seniorCount, setSeniorCount] = useState(0);
  const [adultCount, setAdultCount] = useState(1);
  const [studentCount, setStudentCount] = useState(0);

  const getDayName = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString('en-US', { weekday: 'short' });
  };

  const isDateOnSchedule = (dateStr: string, schedule?: string) => {
    return isDayOnSchedule(getDayName(dateStr), schedule);
  };

  useEffect(() => {
    if (!shipId) return;
    getShipById(shipId).then((ship) => {
      if (!ship) { setLoading(false); return; }
      setShip(ship);
      const s = getShipStops(ship);
      setStops(s);

      // Default selection if not passed in state — voyages always depart from the origin port
      if (!boardStop && s.length > 0) {
        setBoardStop(s[0].location);
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

  // All bookable legs are origin → destination (passengers only board at the origin port)
  const availableLegs: Array<{ board: string; alight: string; label: string; price: number; isDeparted: boolean }> = [];
  const originStop = stops[0];
  if (originStop) {
    for (let j = 1; j < stops.length; j++) {
      const board = originStop.location;
      const alight = stops[j].location;
      const legPrice = calcLegPrice(stops, board, alight);
      const isDeparted = isStopDeparted(originStop, tripDate);
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

  // Reservation date validity for the selected (or default full-route) leg
  const reserveValid = (() => {
    if (!ship) return true;
    const effBoard = boardStop || stops[0]?.location;
    const effAlight = alightStop || stops[stops.length - 1]?.location;
    if (!effBoard || !effAlight) return true;
    return isLegOperating(ship, effBoard, effAlight, reserveDate);
  })();

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
          <p className="text-xs text-foreground font-bold uppercase tracking-wider">Live Fleet Route</p>
          {stops.length > 2 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
              <Anchor className="w-3 h-3 text-primary" />
              <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Inter-Island Route</span>
            </div>
          )}
        </div>
        <div className="relative">
          {stops.map((stop, i) => {
            const isOrigin = i === 0;
            const isBoard = boardStop === stop.location;
            const isAlight = alightStop === stop.location;
            return (
              <button
                key={i}
                onClick={() => {
                  // Boarding is only allowed at the origin port
                  const origin = stops[0]?.location;
                  if (!origin) return;
                  setBoardStop(origin);
                  setAlightStop(stop.location === origin ? "" : stop.location);
                }}
                className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all border outline-none text-left ${
                  isBoard ? "bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20" :
                  isAlight ? "bg-red-500/10 border-red-500/30 ring-1 ring-red-500/20" :
                  "hover:bg-black/5 border-transparent cursor-pointer"
                }`}
              >
                <div className="flex flex-col items-center shrink-0">
                  <div className={`w-3 h-3 rounded-full border-2 mt-1 ${
                    isBoard ? "bg-amber-500 border-amber-500 scale-125" :
                    isAlight ? "bg-red-500 border-red-500 scale-125" :
                    isOrigin ? "bg-blue-500 border-blue-500" :
                    i === stops.length - 1 ? "bg-red-500/60 border-red-500/60" :
                    "bg-primary border-primary"
                  }`} />
                  {i < stops.length - 1 && <div className="w-0.5 h-8 mt-1.5 bg-black/10" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold text-sm ${
                      isBoard ? "text-amber-600" :
                      isAlight ? "text-destructive" :
                      "text-foreground"
                    }`}>
                      {cleanStr(stop.location)}
                    </p>
                    {isOrigin && (
                      <span className="text-[8px] font-bold uppercase tracking-tighter bg-blue-500/10 text-blue-600 border border-blue-500/20 px-1.5 py-0.5 rounded">Boarding Point</span>
                    )}
                    {(isBoard || isAlight) && (
                      <Check className={`w-3 h-3 ${isBoard ? "text-amber-600" : "text-destructive"} animate-in zoom-in`} />
                    )}
                  </div>
                  <p className="text-[11px] text-[#8895A7] mt-0.5">
                    {stop.departure && `Departs ${stop.departure}`}
                    {stop.departure && stop.arrival && " · "}
                    {stop.arrival && `Arrives ${stop.arrival}`}
                  </p>
                </div>
                {stop.price > 0 && i > 0 && (
                  <span className="text-xs font-bold shrink-0 mt-1 text-primary">₱{stop.price}</span>
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
                {leg.label} · ₱{leg.price}
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
        const operating = boardStop && alightStop && ship
          ? isLegOperating(ship, boardStop, alightStop, tripDate)
          : isOperatingToday(ship?.scheduleDays);
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
            ) : !operating ? (
              <button
                disabled
                className="flex-1 py-4 bg-white/5 border-2 border-white/5 text-white/30 font-extrabold rounded-2xl transition-all text-lg cursor-not-allowed"
              >
                Off-Schedule
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

            {/* Secondary Action: Reserve for Future */}
            <button
              onClick={() => { setCalView(null); setIsReserveModalOpen(true); }}
              className="flex-1 py-4 bg-transparent border-2 border-black/10 hover:border-black/20 hover:bg-black/5 text-foreground font-extrabold rounded-2xl transition-all text-lg"
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
              className="relative w-full max-w-sm glass-card rounded-3xl p-7 border border-black/10 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-1">
                <div>
                  <h3 className="font-display font-bold text-xl text-foreground">Reserve Your Trip</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {cleanStr(boardStop)} → {cleanStr(alightStop)} · pick a sailing date
                  </p>
                </div>
                <button onClick={() => setIsReserveModalOpen(false)} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-black/5 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Calendar Grid */}
              {(() => {
                const today = getLocalDate();
                const effBoard = boardStop || stops[0]?.location;
                const effAlight = alightStop || stops[stops.length - 1]?.location;

                const view = calView ?? {
                  y: Number(reserveDate.slice(0, 4)),
                  m: Number(reserveDate.slice(5, 7)) - 1,
                };
                const now = new Date();
                const canPrev = view.y > now.getFullYear() || (view.y === now.getFullYear() && view.m > now.getMonth());
                const maxView = new Date(now.getFullYear(), now.getMonth() + 12, 1);
                const canNext = view.y < maxView.getFullYear() || (view.y === maxView.getFullYear() && view.m < maxView.getMonth());
                const monthTitle = new Date(view.y, view.m, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
                const cells = buildCalendarMonth(view.y, view.m);

                const isEnabled = (dateStr: string) => {
                  if (dateStr < today) return false;
                  return ship && effBoard && effAlight
                    ? isLegOperating(ship, effBoard, effAlight, dateStr)
                    : isDayOnSchedule(getDayName(dateStr), ship?.scheduleDays);
                };

                const selectedLabel = new Date(`${reserveDate}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

                return (
                  <div className="mt-6 mb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sailing Calendar</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCalView({ y: view.y, m: view.m - 1 })}
                          disabled={!canPrev}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-bold text-foreground min-w-[110px] text-center">{monthTitle}</span>
                        <button
                          onClick={() => setCalView({ y: view.y, m: view.m + 1 })}
                          disabled={!canNext}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {WEEKDAY_LABELS.map((w, i) => (
                        <div key={i} className="h-6 flex items-center justify-center text-[9px] font-bold text-muted-foreground uppercase">{w}</div>
                      ))}
                      {cells.map((dayNum, i) => {
                        if (dayNum === null) return <div key={`blank-${i}`} />;
                        const dateStr = fmtLocal(new Date(view.y, view.m, dayNum));
                        const enabled = isEnabled(dateStr);
                        const selected = dateStr === reserveDate;
                        const isToday = dateStr === today;
                        return (
                          <button
                            key={dateStr}
                            disabled={!enabled}
                            onClick={() => setReserveDate(dateStr)}
                            className={`h-10 rounded-xl text-sm font-bold transition-all ${
                              selected
                                ? "bg-primary text-white shadow-lg shadow-primary/25 scale-105"
                                : enabled
                                  ? "text-foreground hover:bg-primary/10 cursor-pointer"
                                  : "text-muted-foreground/40 cursor-not-allowed"
                            } ${isToday && !selected ? "ring-1 ring-primary/50" : ""}`}
                          >
                            {dayNum}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-center gap-1.5 mt-3 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" /> Selected
                      <span className="text-primary normal-case tracking-normal text-[10px]">{selectedLabel}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Legend */}
              <div className="flex items-center justify-between mb-5 px-1">
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" /> Available
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                  <span className="w-2.5 h-2.5 rounded-full bg-black/10 inline-block" /> No Sailing / Past
                </div>
              </div>

              {/* Schedule Validation Message */}
              {(() => {
                const effBoard = boardStop || stops[0]?.location;
                const effAlight = alightStop || stops[stops.length - 1]?.location;
                const legDays = ship && effBoard && effAlight ? getLegScheduleDays(ship, effBoard, effAlight) : getScheduleDays(ship?.scheduleDays);
                const scheduleLabel = legDays.length >= 7 ? "Daily" : legDays.join(", ");
                const dayName = getDayName(reserveDate);

                if (!reserveValid) {
                  return (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                      <p className="text-[10px] font-bold text-red-500 leading-relaxed">
                        {dayName} has no sailing. Pick an operational day ({scheduleLabel}).
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <p className="text-[10px] font-bold text-emerald-600 leading-relaxed">
                      {dayName} is available. This leg sails on {scheduleLabel}.
                    </p>
                  </div>
                );
              })()}

              <div className="flex flex-col gap-3 mt-5">
                <button
                  disabled={!reserveValid}
                  onClick={() => {
                    setIsReserveModalOpen(false);
                    handleContinue("reserve", reserveDate);
                  }}
                  className="w-full py-4 bg-[#E3000F] text-white disabled:bg-black/10 disabled:text-muted-foreground disabled:shadow-none font-black rounded-2xl shadow-lg shadow-[#E3000F]/20 transition-all font-display flex items-center justify-center gap-2"
                >
                  Confirm & Proceed <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsReserveModalOpen(false)}
                  className="w-full py-3 bg-black/5 text-foreground font-bold rounded-2xl"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LegSelector;