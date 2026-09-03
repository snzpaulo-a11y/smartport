import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getShips, Ship, getLocalDate, getShipStops, isStopDeparted, getCurrentUser, isOperatingToday, isLegOperating, getStopScheduleDays, formatSchedule, SCHEDULE_DAYS } from "@/lib/store";
import { Ship as ShipIcon, Route, Calendar, Clock, ArrowRight, ChevronRight, Anchor, MapPin } from "lucide-react";
import PassengerHeader from "@/components/PassengerHeader";
import BottomNav from "@/components/BottomNav";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

const SchedulesPage = () => {
  const navigate = useNavigate();
  const [ships, setShips] = useState<Ship[]>([]);
  const [loading, setLoading] = useState(true);
  const today = getLocalDate();

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) {
        navigate("/");
        return;
      }
      getShips(true).then(data => {
        const filtered = data.filter(s => s.isActive);
        setShips(filtered);
        setLoading(false);
      });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0E151E] flex flex-col text-white font-body overflow-x-hidden pb-nav">
      <PassengerHeader />

      <section className="py-20 px-4 sm:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/15 text-[10px] font-black uppercase tracking-widest text-primary mb-6 w-fit">
              Sailing Schedules
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-slate-900">Elite Fleet Connections</h2>
            <p className="text-slate-500 text-base font-medium max-w-xl leading-relaxed">
              Real-time travel updates across our premium maritime network. Confirm your sailing times and book your next journey.
            </p>
          </div>

          <div className="flex flex-col gap-10">
            {loading ? (
              <PageSkeleton variant="nav" count={3} inline />
            ) : ships.length > 0 ? (
              ships.map(ship => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={ship.id} 
                  className="bg-white border border-black/5 rounded-[2.5rem] overflow-hidden flex flex-col group transition-all hover:border-primary/25 hover:shadow-[0_2px_8px_rgba(0,0,0,0.05),0_28px_56px_-28px_rgba(227,0,15,0.25)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_48px_-28px_rgba(0,0,0,0.18)]"
                >
                  <div className="px-6 sm:px-10 py-10 flex flex-col">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
                      <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight break-words">{ship.route.replace("→", " \u2192 ")}</h3>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 mr-2">{ship.name}</span>
                        <span className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/15 text-primary text-[10px] font-bold tracking-[0.2em] shrink-0 uppercase">
                          {ship.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-6 px-4 py-2 rounded-xl bg-secondary/50 border border-black/5 w-fit">
                      <Calendar className="w-3 h-3 text-primary opacity-70" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Schedule: <span className="text-primary">{formatSchedule(ship.scheduleDays)}</span>
                      </p>
                    </div>

                    <div className="flex flex-row justify-between mb-6 pb-6 border-b border-black/5">
                      <div className="text-left space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Departure</p>
                        </div>
                        <p className="text-slate-900 font-extrabold text-xl sm:text-2xl">{ship.departure}</p>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="flex items-center gap-1.5 justify-end">
                          <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Estimated Arrival</p>
                        </div>
                        <p className="text-slate-900 font-extrabold text-xl sm:text-2xl">{ship.arrival}</p>
                      </div>
                    </div>

                    <div className="mb-8 pb-6 border-b border-black/5 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stop Schedules</p>
                      {getShipStops(ship).map((stop, sIdx) => {
                        const days = getStopScheduleDays(ship, stop);
                        const label = days.length >= SCHEDULE_DAYS.length ? "Daily" : days.join(", ");
                        const operatingToday = isLegOperating(ship, stop.location, stop.location, today);
                        return (
                          <div key={sIdx} className="flex items-center justify-between gap-3 px-4 py-2 rounded-xl bg-secondary/50 border border-black/5">
                            <span className="text-xs font-bold text-slate-900">{stop.location}</span>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${operatingToday ? "text-primary" : "text-slate-400 opacity-60"}`}>{label}</span>
                          </div>
                        );
                      })}
                    </div>

                    {(() => {
                      const stops = getShipStops(ship);
                      // Full-leg check: the whole route A → … → Z must run today.
                      const operating = stops.length >= 2
                        ? isLegOperating(ship, stops[0].location, stops[stops.length - 1].location, today)
                        : isOperatingToday(ship.scheduleDays);
                      const departed = stops.length >= 1
                        ? isStopDeparted(stops[0], today)
                        : false;

                      if (ship.cancelled_dates?.includes(today)) {
                        return <button disabled className="w-full bg-red-500/10 border border-red-500/20 text-red-500 font-bold py-5 rounded-2xl text-sm cursor-not-allowed">Trip Cancelled Today</button>;
                      }
                      if (!operating) {
                        return <button onClick={() => navigate(`/leg-selector/${ship.id}`)} className="w-full bg-amber-500/10 border border-amber-500/20 text-amber-600 font-bold py-5 rounded-2xl hover:bg-amber-500/20 transition-all text-sm active:scale-[0.99]">Reserve</button>;
                      }
                      if (departed) {
                         return <button disabled className="w-full bg-secondary/50 border border-black/5 text-slate-400 font-bold py-5 rounded-2xl text-sm cursor-not-allowed">Departed Today</button>;
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
                          className="w-full bg-[#1A222C] hover:bg-[#222E3A] border border-black/10 hover:border-primary/25 text-white font-bold py-5 rounded-2xl transition-all shadow-md text-sm active:scale-[0.99]"
                        >
                          Book Now
                        </button>
                      );
                    })()}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-20 text-center border border-black/5 rounded-[2.5rem] bg-white">
                <ShipIcon className="w-12 h-12 text-primary/20 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Vessels Scheduled</h3>
                <p className="text-slate-500 text-sm">Please check back later for updated travel schedules.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-black/5 text-center px-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">© 2024 SmartPort Maritime. Safety first.</p>
      </footer>
      <BottomNav />
    </div>
  );
};

export default SchedulesPage;
