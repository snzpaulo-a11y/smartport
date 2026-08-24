import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, getShips, Ship, signOut, getLocalDate, getShipStops, isStopDeparted } from "@/lib/store";
import { Anchor, ArrowRight, QrCode, Globe, Share2, LogOut, Ticket, Ship as ShipIcon, UserPlus, Route, MapPin, ChevronRight, Calendar, Clock, Shield } from "lucide-react";
import PassengerHeader from "@/components/PassengerHeader";
import BottomNav from "@/components/BottomNav";

const BookingHome = () => {
  const navigate = useNavigate();
  const [ships, setShips] = useState<Ship[]>([]);
  const [user, setUser] = useState<{ user_metadata?: { full_name?: string } } | null>(null);
  const [showIdModal, setShowIdModal] = useState(false);
  const today = getLocalDate();

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (u) {
        setUser(u);
      } else {
        navigate("/");
      }
    });
    getShips(true).then(data => {
      const filtered = data.filter(s => s.isActive);
      setShips(filtered);
    });

    if (sessionStorage.getItem("show_id_pending_modal") === "true") {
      setShowIdModal(true);
    }
  }, [navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const isOperatingToday = (schedule?: string) => {
    if (!schedule) return true;
    const day = new Date().toLocaleDateString('en-US', { weekday: 'short' });
    return schedule.split(",").map(d => d.trim()).includes(day);
  };

  return (
    <div className="min-h-screen bg-[#0E151E] flex flex-col text-white font-body overflow-x-hidden pb-nav">
      <PassengerHeader />

      {/* ── Top Header Section with Background Image ── */}
      <div className="relative w-full min-h-[75vh] flex flex-col -mt-[88px]">
        {/* Background Image / Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1559825481-12a05cc00344?q=80&w=2600&auto=format&fit=crop"
            alt="Ocean background"
            className="w-full h-[140%] object-cover object-top opacity-10 mix-blend-luminosity brightness-100"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white/80 to-white" />
        </div>

        {/* Hero Content (Centered) */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto px-6 text-center pt-32 pb-32">

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2E0E11] border border-[#4F1217] text-[#E3000F] text-[9px] font-bold tracking-[0.2em] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E3000F] animate-pulse shadow-[0_0_8px_#2BCEFF]" />
            NEXT GENERATION MARITIME TRAVEL
          </div>

          <h2 className="text-[#E3000F] font-display text-2xl md:text-3xl font-bold tracking-tight mb-4">
            Welcome to Booking Home, {user?.user_metadata?.full_name || 'Sanz'}!
          </h2>

          <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-8 drop-shadow-2xl">
            Navigate Romblon <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E3000F] to-[#3B82F6]">Without Friction.</span>
          </h1>

          <p className="text-[#8895A7] text-base md:text-lg font-medium leading-relaxed mb-12 max-w-2xl px-4">
            Experience the gold standard of ferry booking. Secure, digital-first ticketing for the modern traveler in the heart of the Philippines.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-20">
            <button
              onClick={() => navigate("/my-tickets")}
              className="bg-[#E3000F] text-[#0A1118] px-8 py-3.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#FF3B47] transition-all shadow-[0_0_20px_rgba(227, 0, 15,0.2)]"
            >
              My Tickets <ArrowRight className="w-4 h-4 ml-1" />
            </button>
            <button
              onClick={() => navigate("/schedules")}
              className="bg-[#1A222C]/80 backdrop-blur border border-white/10 text-white px-8 py-3.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#222E3A] transition-all"
            >
              View Schedules <QrCode className="w-4 h-4 ml-1" />
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 md:gap-16">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#E3000F] mb-2 drop-shadow-md">{ships.length || "12"}+</p>
              <p className="text-[9px] font-bold tracking-[0.15em] text-[#8895A7] uppercase">Active Routes</p>
            </div>
            <div className="text-center pb-1">
              <p className="text-2xl font-bold text-[#E3000F] mb-2 drop-shadow-md">24/7</p>
              <p className="text-[9px] font-bold tracking-[0.15em] text-[#8895A7] uppercase">Port Support</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#E3000F] mb-2 drop-shadow-md">Instant</p>
              <p className="text-[9px] font-bold tracking-[0.15em] text-[#8895A7] uppercase">Digital Boarding</p>
            </div>
          </div>
        </main>
      </div>

      {/* ── Active Fleet Preview ── */}
      <section className="bg-[#0E151E] pt-12 pb-24 px-4 sm:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-6 pb-6 border-b border-white/5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-[#8895A7] mb-4">
                Active Connections
              </div>
              <h2 className="font-display text-3xl font-bold tracking-tight mb-3">Elite Fleet Connections</h2>
              <p className="text-[#8895A7] text-sm font-medium max-w-sm leading-relaxed">
                Premium maritime operators ready for your next journey across the archipelago.
              </p>
            </div>
            <button 
              onClick={() => navigate("/schedules")}
              className="text-[#E3000F] text-[10px] font-bold tracking-[0.2em] uppercase hover:text-white transition-colors flex items-center gap-2 shrink-0 pb-1"
            >
              Go to Schedules <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-8">
            {ships.length > 0 ? (
              ships.slice(0, 3).map(ship => (
                <div key={ship.id} className="bg-[#131B24] border border-white/5 rounded-[2rem] overflow-hidden flex flex-col group transition-all hover:border-[#E3000F]/20 shadow-xl">
                  <div className="px-6 sm:px-10 py-8 flex flex-col">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                      <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight break-words">{ship.route.replace("→", " \u2192 ")}</h3>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[#8895A7]">{ship.name}</span>
                        <span className="px-3 py-1.5 rounded-full bg-[#4D0A0F] text-[#E3000F] text-[10px] font-bold tracking-[0.2em] uppercase">
                          {ship.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-row justify-between mb-8">
                      <div className="text-left">
                        <p className="text-[9px] font-bold tracking-widest text-[#8895A7] uppercase mb-1">Departure</p>
                        <p className="text-white font-extrabold text-xl">{ship.departure}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold tracking-widest text-[#8895A7] uppercase mb-1">Arrival</p>
                        <p className="text-white font-extrabold text-xl">{ship.arrival}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        // Clear old booking session to prevent ghost tickets
                        sessionStorage.removeItem("current_booking_id");
                        sessionStorage.removeItem("booking_name");
                        sessionStorage.removeItem("booking_phone");
                        sessionStorage.removeItem("booking_email");
                        sessionStorage.removeItem("booking_id_url");
                        navigate(`/leg-selector/${ship.id}`);
                      }}
                      className="w-full bg-[#1A222C] hover:bg-[#222E3A] border border-white/5 hover:border-[#E3000F]/20 text-white font-bold py-4 rounded-2xl transition-all shadow-md text-sm"
                    >
                      Book This Vessel
                    </button>
                  </div>
                </div>
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

      {/* ── Ready to Set Sail Section ── */}
      <section className="bg-[#0A1118] py-24 px-8 border-t border-white/5 text-center relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
           <img
            src="https://images.unsplash.com/photo-1516939884455-1445c8652f83?q=80&w=2500&auto=format&fit=crop"
            alt="Sea surface"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative z-10">
          <h3 className="text-3xl font-bold mb-6">Ready to Set Sail?</h3>
          <p className="text-[#8895A7] text-sm mb-10 max-w-sm mx-auto">Discover more routes and complete sailing schedules in our dedicated directory.</p>
          <button 
            onClick={() => navigate("/schedules")}
            className="bg-[#E3000F] text-[#0A1118] px-10 py-4 rounded-full font-black uppercase tracking-widest text-xs hover:bg-[#FF3B47] transition-all shadow-[0_0_20px_rgba(227, 0, 15,0.2)] flex items-center gap-3 mx-auto"
          >
            Check All Schedules <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#0A1118] py-20 px-8 relative z-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">

          <div className="flex items-center gap-2 mb-10">
            <Anchor className="w-7 h-7 text-[#E3000F]" />
            <span className="font-display text-2xl font-extrabold tracking-tight">SmartPort</span>
          </div>

          <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-[10px] font-bold tracking-[0.2em] text-[#8895A7] mb-12 uppercase">
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Help Center</a>
            <button onClick={() => navigate("/schedules")} className="hover:text-white transition-colors">Schedules</button>
          </div>

          <div className="w-16 h-px bg-[#1A222C] mb-8" />

          <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#8895A7]/60 mb-10">
            © 2024 SmartPort Maritime. All rights reserved.
          </p>

          <div className="flex gap-4">
            <button className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center hover:bg-[#131B24] transition-colors">
              <Globe className="w-4 h-4 text-[#8895A7]" />
            </button>
            <button className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center hover:bg-[#131B24] transition-colors">
              <Share2 className="w-4 h-4 text-[#8895A7]" />
            </button>
          </div>
        </div>
      </footer>

      {/* ── ID Verification Pending Modal ── */}
      {showIdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#131B24] border border-[#E3000F]/30 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(227, 0, 15,0.2)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E3000F]/10 rounded-full blur-2xl pointer-events-none -translate-y-10 translate-x-10" />

            <div className="w-16 h-16 rounded-full bg-[#E3000F]/10 border border-[#E3000F]/30 flex items-center justify-center mx-auto mb-4 relative">
              <div className="w-12 h-12 rounded-full border-2 border-[#E3000F]/20 border-t-[#E3000F] animate-spin absolute" />
              <Shield className="w-6 h-6 text-[#E3000F]" />
            </div>

            <h3 className="font-display font-bold text-white text-xl mb-2">ID Verification Submitted</h3>

            <p className="text-xs text-[#8895A7] leading-relaxed mb-6">
              Your discount ID card has been submitted for verification.<br/><br/>
              <span className="text-white font-semibold">Please wait for ID validation</span> by the Captain/Admin before paying. You can track your ticket status anytime in <span className="text-[#E3000F] font-bold">My Tickets</span>.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowIdModal(false);
                  sessionStorage.removeItem("show_id_pending_modal");
                  navigate("/my-tickets");
                }}
                className="w-full py-3.5 bg-[#E3000F] hover:bg-[#FF3B47] text-[#0A1118] font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(227, 0, 15,0.2)] flex items-center justify-center gap-2"
              >
                <Ticket className="w-4 h-4" /> Go to My Tickets
              </button>

              <button
                onClick={() => {
                  setShowIdModal(false);
                  sessionStorage.removeItem("show_id_pending_modal");
                }}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-[#8895A7] hover:text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-colors border border-white/5"
              >
                Dismiss & Stay Home
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default BookingHome;