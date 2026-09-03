import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
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
    <div className="fixed inset-x-0 bottom-0 z-[100] px-4 pb-safe sm:hidden">
      <nav className="mx-auto max-w-md rounded-[28px] border border-black/[0.06] bg-white/85 px-3 py-2 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.16),0_8px_28px_-12px_rgba(0,0,0,0.10)] backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                aria-current={isActive ? "page" : undefined}
                className="flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 py-1"
              >
                <span
                  className={cn(
                    "relative flex h-7 w-12 items-center justify-center rounded-2xl transition-colors duration-200",
                    isActive ? "text-white" : "text-slate-400",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="bottom-nav-active"
                      className="absolute inset-0 rounded-2xl bg-primary shadow-[0_4px_14px_rgba(227,0,15,0.35)]"
                      transition={{ type: "spring", stiffness: 480, damping: 36 }}
                    />
                  )}
                  <Icon
                    className={cn("relative", isActive ? "h-[18px] w-[18px]" : "h-[20px] w-[20px]")}
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide transition-colors",
                    isActive ? "text-primary" : "text-slate-400",
                  )}
                >
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default BottomNav;