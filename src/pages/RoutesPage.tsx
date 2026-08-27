import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Route, MapPin, Anchor } from "lucide-react";
import { getCurrentUser, getShips, Ship, getShipStops } from "@/lib/store";
import PassengerHeader from "@/components/PassengerHeader";
import BottomNav from "@/components/BottomNav";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

const RoutesPage = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<{ from: string; to: string; time: string; feature: string; desc: string; shipName: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser();
      if (!user) {
        navigate("/");
        return;
      }

      const allShips = await getShips(true);
      const displayShips = allShips.filter(s => s.isActive);

      const formattedRoutes = displayShips.map(ship => {
        const stops = getShipStops(ship);
        const routeParts = (ship.route || "").split("→");
        return {
          from: stops[0]?.location || routeParts[0]?.trim() || "Port A",
          to: stops[stops.length-1]?.location || routeParts[routeParts.length - 1]?.trim() || "Port B",
          time: ship.departure && ship.arrival ? `${ship.departure} → ${ship.arrival}` : "In Progress",
          feature: ship.type === "ferry" ? "Fast Craft" : "Pumpboat",
          desc: `${ship.name} provides daily crossings on the ${ship.route || "inter-island"} navigation matrix.`,
          shipName: ship.name
        };
      });

      setRoutes(formattedRoutes);
      setLoading(false);
    };

    init();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0E151E] flex flex-col text-white font-body overflow-x-hidden pb-nav">
      <PassengerHeader />

      <section className="py-20 px-4 sm:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E3000F]/10 border border-[#E3000F]/20 text-[9px] font-black uppercase tracking-widest text-[#E3000F] mb-6">
              Maritime Logistics
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-6">Inter-Island Transit</h2>
            <p className="text-[#8895A7] text-base max-w-xl mx-auto leading-relaxed">
              Our comprehensive network of maritime routes ensures that you stay connected to every strategic port in the archipelago.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              <div className="col-span-full">
                <PageSkeleton variant="grid" count={6} inline />
              </div>
            ) : routes.length > 0 ? (
              routes.map((route, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={idx} 
                  className="group relative bg-[#131B24] border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col transition-all hover:border-[#E3000F]/30 hover:shadow-2xl hover:shadow-[#E3000F]/5"
                >
                  <div className="p-8 sm:p-10 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-8">
                      <div className="p-3 rounded-2xl bg-[#E3000F]/5 border border-[#E3000F]/10 text-[#E3000F]">
                        <Route className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black text-[#8895A7] uppercase tracking-[0.2em]">{route.feature}</span>
                    </div>

                    <div className="space-y-6 mb-8">
                      <div className="flex items-start gap-4">
                        <div className="mt-1.5"><MapPin className="w-4 h-4 text-[#E3000F] opacity-60" /></div>
                        <div>
                          <p className="text-[9px] font-black text-[#8895A7] uppercase tracking-widest mb-1">Departure Port</p>
                          <h4 className="text-xl font-bold text-white tracking-tight">{route.from}</h4>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="mt-1.5"><Anchor className="w-4 h-4 text-[#E3000F] opacity-60" /></div>
                        <div>
                          <p className="text-[9px] font-black text-[#8895A7] uppercase tracking-widest mb-1">Arrival Port</p>
                          <h4 className="text-xl font-bold text-white tracking-tight">{route.to}</h4>
                        </div>
                      </div>
                    </div>

                    <p className="text-[#8895A7] text-sm leading-relaxed mb-10 opacity-60">
                      {route.desc}
                    </p>

                    <div className="mt-auto pt-8 border-t border-white/5 flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-[9px] font-black text-[#8895A7] uppercase tracking-widest mb-1">Vessel</p>
                        <p className="text-xs font-bold text-white">{route.shipName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-[#8895A7] uppercase tracking-widest mb-1">Status</p>
                        <p className="text-xs font-bold text-[#E3000F]">Operational</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center glass-card rounded-[2.5rem]">
                <Anchor className="w-12 h-12 text-[#E3000F]/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white">No active routes found</h3>
                <p className="text-[#8895A7] text-sm italic">Please check back later</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-white/5 text-center mt-auto">
        <p className="text-[10px] font-bold text-[#8895A7] uppercase tracking-widest opacity-40">Connecting the islands. Safely.</p>
      </footer>
      <BottomNav />
    </div>
  );
};

export default RoutesPage;
