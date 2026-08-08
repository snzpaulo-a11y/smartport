import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getShips, Ship, getLocalDate, getShipStops, isStopDeparted, getCurrentUser } from "@/lib/store";
import { Ship as ShipIcon, Route, Calendar, Clock, ArrowRight, ChevronRight, Anchor, MapPin } from "lucide-react";
import PassengerHeader from "@/components/PassengerHeader";
import BottomNav from "@/components/BottomNav";

const SchedulesPage = () => {
  const navigate = useNavigate();
  const [ships, setShips] = useState<Ship[]>([]);
  const [loading, setLoading] = useState(true);
  const today = getLocalDate();

  useEffect(() => {
    getShips(true).then(data => {
      let filtered = data.filter(s => s.isActive);
      setShips(filtered);
      setLoading(false);
    });
  }, [navigate]);

  const isOperatingToday = (schedule?: string) => {
    if (!schedule) return true;
    const day = new Date().toLocaleDateString('en-US', { weekday: 'short' });
    return schedule.split(",").map(d => d.trim()).includes(day);
  };

  return (
    <div className="min-h-screen bg-[#0E151E] flex flex-col text-white font-body overflow-x-hidden">
      <PassengerHeader />

      <section className="py-20 px-4 sm:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E3000F]/10 border border-[#E3000F]/20 text-[9px] font-black uppercase tracking-widest text-[#E3000F] mb-6 w-fit">
              Sailing Schedules
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-4">Elite Fleet Connections</h2>
            <p className="text-[#8895A7] text-base font-medium max-w-xl leading-relaxed">
              Real-time travel updates across our premium maritime network. Confirm your sailing times and book your next journey.
            </p>
          </div>

          <div className="flex flex-col gap-10">
            {loading ? (
              <div className="py-20 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-[#E3000F] border-t-transparent rounded-full mx-auto" />
              </div>
            ) : ships.length > 0 ? (
              ships.map(ship => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={ship.id} 
                  className="bg-[#131B24] border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col group transition-all hover:border-[#E3000F]/20 shadow-xl"
                >
                  <div className="px-6 sm:px-10 py-10 flex flex-col">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
                      <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight break-words">{ship.route.replace("→", " \u2192 ")}</h3>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[#8895A7] mr-2">{ship.name}</span>
                        <span className="px-3 py-1.5 rounded-full bg-[#4D0A0F] text-[#E3000F] text-[10px] font-bold tracking-[0.2em] shrink-0 uppercase">
                          {ship.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-6 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 w-fit">
                      <Calendar className="w-3 h-3 text-[#E3000F] opacity-60" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#8895A7]">
                        Schedule: <span className="text-[#E3000F]">{ship.scheduleDays || "Mon-Sun"}</span>
                      </p>
                    </div>

                    <div className="flex flex-row justify-between mb-8 pb-8 border-b border-white/5">
                      <div className="text-left space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-[#8895A7] italic" />
                          <p className="text-[10px] font-bold tracking-widest text-[#8895A7] uppercase italic">Departure</p>
                        </div>
                        <p className="text-white font-extrabold text-xl sm:text-2xl">{ship.departure}</p>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="flex items-center gap-1.5 justify-end">
                          <p className="text-[10px] font-bold tracking-widest text-[#8895A7] uppercase italic">Estimated Arrival</p>
                        </div>
                        <p className="text-white font-extrabold text-xl sm:text-2xl">{ship.arrival}</p>
                      </div>
                    </div>

                    {(() => {
                      const stops = getShipStops(ship);
                      const operating = isOperatingToday(ship.scheduleDays);
                      const departed = isStopDeparted(stops[0], today);

                      if (ship.cancelled_dates?.includes(today)) {
                        return <button disabled className="w-full bg-red-500/10 border border-red-500/20 text-red-500 font-bold py-5 rounded-2xl text-sm cursor-not-allowed">Trip Cancelled Today</button>;
                      }
                      if (!operating) {
                        return <button onClick={() => navigate(`/leg-selector/${ship.id}`)} className="w-full bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold py-5 rounded-2xl hover:bg-amber-500/20 transition-all text-sm">Reserve</button>;
                      }
                      if (departed) {
                         return <button disabled className="w-full bg-white/5 border border-white/10 text-white/20 font-bold py-5 rounded-2xl text-sm cursor-not-allowed">Departed Today</button>;
                      }
                      return (
                        <button
                          onClick={() => {
                            sessionStorage.removeItem("current_booking_id");
                            sessionStorage.removeItem("booking_name");
                            sessionStorage.removeItem("booking_phone");
                            sessionStorage.removeItem("booking_email");
                            sessionStorage.removeItem("booking_id_url");
                            navigate(`/leg-selector/${ship.id}`);
                          }}
                          className="w-full bg-[#1A222C] hover:bg-[#222E3A] border border-white/5 hover:border-[#E3000F]/20 text-white font-bold py-5 rounded-2xl transition-all shadow-md text-sm"
                        >
                          Book Now
                        </button>
                      );
                    })()}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-20 text-center border border-white/5 rounded-[2.5rem] bg-white/[0.02]">
                <ShipIcon className="w-12 h-12 text-[#E3000F]/20 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-white mb-2">No Vessels Scheduled</h3>
                <p className="text-[#8895A7] text-sm">Please check back later for updated travel schedules.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-white/5 text-center px-6">
        <p className="text-[10px] font-bold text-[#8895A7] uppercase tracking-widest">© 2024 SmartPort Maritime. Safety first.</p>
      </footer>
      <BottomNav />
    </div>
  );
};

export default SchedulesPage;
