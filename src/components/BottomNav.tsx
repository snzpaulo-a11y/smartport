import { useNavigate, useLocation } from "react-router-dom";
import { Home, Ticket, Calendar, MessageSquare } from "lucide-react";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { name: "Home", path: "/booking", icon: Home },
    { name: "Tickets", path: "/my-tickets", icon: Ticket },
    { name: "Schedules", path: "/schedules", icon: Calendar },
    { name: "Contact", path: "/contact", icon: MessageSquare },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full z-[100] sm:hidden pb-safe px-3">
      <div className="max-w-md mx-auto bg-white/55 backdrop-blur-2xl border border-white/60 shadow-[0_-4px_24px_rgba(0,0,0,0.18),0_8px_32px_rgba(0,0,0,0.10)] rounded-[26px] px-2 py-2">
        <div className="flex items-center justify-between gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className="flex-1 flex flex-col items-center justify-center gap-1 min-h-12 group relative"
              >
                <div className={`relative flex items-center justify-center w-11 h-8 rounded-2xl transition-all duration-300 ${
                  isActive ? "bg-[#E3000F]/10 text-[#E3000F]" : "text-slate-600 group-hover:text-[#E3000F]"
                }`}>
                  <Icon className={`w-[22px] h-[22px] ${isActive ? "fill-[#E3000F]/15" : ""}`} strokeWidth={isActive ? 2.4 : 2} />
                </div>
                <span className={`text-[10px] font-bold tracking-[0.06em] uppercase transition-colors ${
                  isActive ? "text-[#E3000F]" : "text-slate-600"
                }`}>
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNav;
