import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getShipById, Ship } from "@/lib/store";
import { ArrowLeft, Armchair, BedDouble, ChevronRight, MapPin, Calendar } from "lucide-react";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

const AccommodationPage = () => {
  const { shipId } = useParams<{ shipId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { tripDate: _tripDate, reservationDate, boardStop, alightStop, legPrice } = (location.state || {}) as {
    tripDate?: string;
    reservationDate?: string;
    boardStop?: string;
    alightStop?: string;
    legPrice?: number;
    bookingType?: "book" | "reserve";
  };

  // Support both tripDate and legacy reservationDate, default to today
  const tripDate = _tripDate || reservationDate || new Date().toISOString().split('T')[0];

  const [ship, setShip] = useState<Ship | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<"seat" | "bunk" | null>(null);

  useEffect(() => {
    if (!shipId) return;
    getShipById(shipId).then((s) => {
      setShip(s);
      setLoading(false);
    });
  }, [shipId]);

  if (loading) return (
    <div className="max-w-md mx-auto">
      <PageSkeleton variant="details" />
    </div>
  );
  if (!ship) return <div className="p-8 text-center text-foreground">Ship not found</div>;

  const handleContinue = () => {
    navigate(`/seat-selection/${shipId}`, {
      state: { 
        ...location.state,
        accommodationType: selected 
      },
    });
  };

  return (
    <div className="min-h-screen px-4 py-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 glass-card rounded-xl hover:bg-muted/50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Choose Accommodation</h1>
          <p className="text-xs text-muted-foreground">{ship.name} · {ship.route}</p>
        </div>
      </div>

      {(tripDate || boardStop) && (
        <div className="glass-card rounded-xl p-3 mb-5 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {tripDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>{new Date(tripDate).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" })}</span>
            </div>
          )}
          {boardStop && alightStop && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>{boardStop} → {alightStop}</span>
            </div>
          )}
          {legPrice && (
            <div className="ml-auto font-bold text-primary">₱{legPrice.toLocaleString()}</div>
          )}
        </div>
      )}

      <p className="text-sm text-muted-foreground mb-5">Select your preferred accommodation type for this trip.</p>

      <div className="space-y-4 mb-8">
        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          onClick={() => setSelected("seat")}
          className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${selected === "seat" ? "border-primary bg-primary/10" : "border-border glass-card"}`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${selected === "seat" ? "bg-primary/20" : "bg-muted/50"}`}>
              <Armchair className={`w-8 h-8 ${selected === "seat" ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className={`font-display font-bold text-lg ${selected === "seat" ? "text-primary" : "text-foreground"}`}>Seat</p>
                {selected === "seat" && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Standard passenger seat. Ideal for short to medium trips.</p>
            </div>
          </div>
        </motion.button>

        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          onClick={() => setSelected("bunk")}
          className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${selected === "bunk" ? "border-primary bg-primary/10" : "border-border glass-card"}`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${selected === "bunk" ? "bg-primary/20" : "bg-muted/50"}`}>
              <BedDouble className={`w-8 h-8 ${selected === "bunk" ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className={`font-display font-bold text-lg ${selected === "bunk" ? "text-primary" : "text-foreground"}`}>Bunk Bed</p>
                {selected === "bunk" && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Sleeping bunk accommodation. Best for overnight or long trips.</p>
            </div>
          </div>
        </motion.button>
      </div>

      <motion.button
        whileHover={{ scale: selected ? 1.02 : 1 }}
        whileTap={{ scale: selected ? 0.98 : 1 }}
        disabled={!selected}
        onClick={handleContinue}
        className="w-full py-4 rounded-2xl btn-ocean font-display font-bold text-lg flex items-center justify-center gap-2 transition-all"
        style={{ opacity: selected ? 1 : 0.4, cursor: selected ? "pointer" : "not-allowed" }}
      >
        Select Your Seat <ChevronRight className="w-5 h-5" />
      </motion.button>
    </div>
  );
};

export default AccommodationPage;