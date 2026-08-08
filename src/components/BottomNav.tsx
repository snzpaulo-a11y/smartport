import { motion } from "framer-motion";
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
    <div className="fixed bottom-0 left-0 w-full bg-[#131B24]/90 backdrop-blur-2xl border-t border-white/5 z-[100] sm:hidden pb-safe">
      <div className="max-w-md mx-auto flex items-center justify-around py-4 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1.5 transition-all w-16 group"
            >
              <div className={`relative p-2 rounded-2xl transition-all duration-300 ${
                isActive ? "bg-primary/10 text-primary shadow-[0_0_15px_rgba(227, 0, 15,0.15)]" : "text-[#8895A7] group-hover:text-white"
              }`}>
                <Icon className={`w-6 h-6 ${isActive ? "fill-primary/20" : ""}`} />
                {isActive && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </div>
              <span className={`text-[8px] font-bold tracking-[0.1em] uppercase transition-colors ${
                isActive ? "text-primary" : "text-[#8895A7]"
              }`}>
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
