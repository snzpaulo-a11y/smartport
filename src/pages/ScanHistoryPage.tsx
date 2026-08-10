import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getBookingsByShipAndDate, getLocalDate, Booking } from "@/lib/store";
import { ArrowLeft, Loader2, Users, CheckCircle, Clock, Search } from "lucide-react";

const typeColor: Record<string, string> = {
  regular: "bg-primary/20 text-primary",
  student: "bg-secondary/20 text-secondary",
  senior: "bg-amber-500/20 text-amber-500",
  pwd: "bg-violet-500/20 text-violet-500",
};

const ScanHistoryPage = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Get current staff and assigned ship from sessionStorage
  const staffInfo = JSON.parse(sessionStorage.getItem("scanStaff") || "{}");
  const assignedShipId = staffInfo?.shipId;
  const staffName = staffInfo?.name || "Staff";
  const today = getLocalDate();

  useEffect(() => {
    loadManifest();
  }, [assignedShipId]);

  const loadManifest = async () => {
    if (!assignedShipId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getBookingsByShipAndDate(assignedShipId, today);
      setBookings(data);
    } catch (e) {
      console.error("Failed to load manifest:", e);
    }
    setLoading(false);
  };

  const filteredBookings = bookings.filter(b => 
    b.passengerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.seatLabel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const scannedCount = bookings.filter(b => b.status === "boarded").length;
  const pendingCount = bookings.length - scannedCount;

  return (
    <div className="min-h-screen px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 glass-card rounded-xl hover:bg-muted/50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Vessel Manifest</h1>
            <p className="text-xs text-muted-foreground">{today} · {bookings.length} Passengers</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {bookings.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="glass-card rounded-xl p-4 text-center border-l-4 border-l-emerald-500">
            <p className="font-display font-bold text-emerald-500 text-2xl">{scannedCount}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Scanned</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center border-l-4 border-l-primary/50">
            <p className="font-display font-bold text-foreground text-2xl">{pendingCount}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pending</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search passenger or seat..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/30 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-2xl">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-display font-semibold text-muted-foreground">No bookings for today</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Passengers for {today} will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((b, i) => (
            <motion.div 
              key={b.id} 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.02 }}
              className={`glass-card rounded-xl p-4 border transition-all ${
                b.status === "boarded" 
                  ? "border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.05)]" 
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 p-1 rounded-full ${
                    b.status === "boarded" ? "bg-emerald-500/20 text-emerald-500" : "bg-muted/50 text-muted-foreground"
                  }`}>
                    {b.status === "boarded" ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className={`font-bold font-display ${b.status === "boarded" ? "text-emerald-500" : "text-foreground"}`}>
                      {b.passengerName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground uppercase tracking-widest">
                        Seat {b.seatLabel}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest ${typeColor[b.passengerType] || "bg-primary/20 text-primary"}`}>
                        {b.passengerType}
                      </span>
                    </div>
                  </div>
                </div>
                {b.status === "boarded" && (
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg uppercase tracking-widest border border-emerald-500/20">
                    Scanned
                  </span>
                )}
              </div>
            </motion.div>
          ))}
          {filteredBookings.length === 0 && searchQuery && (
            <p className="text-center py-10 text-muted-foreground text-sm">No passengers found matching "{searchQuery}"</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ScanHistoryPage;