import { Anchor, LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "@/lib/store";

const PassengerHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const navItems = [
    { name: "Home", path: "/booking" },
    { name: "Schedules", path: "/schedules" },
    { name: "Routes", path: "/routes" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <header className="relative z-50 flex items-center justify-between px-8 py-6 w-full max-w-7xl mx-auto">
      <div 
        className="flex items-center gap-2 cursor-pointer" 
        onClick={() => navigate("/booking")}
      >
        <div className="w-9 h-9 rounded-xl bg-white shadow-[0_0_20px_rgba(227,0,15,0.2)] flex items-center justify-center p-0.5">
          <img src="/starhorse-logo.jpg" alt="Starhorse" className="w-full h-full rounded-lg object-contain" />
        </div>
        <span className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-slate-800 hover:text-[#E3000F] transition-colors">Starhorse</span>
      </div>

      <nav className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-10 text-[11px] font-bold tracking-widest uppercase mt-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`relative pb-1 transition-all ${
                isActive ? "text-[#E3000F] font-black" : "text-white/70 hover:text-white font-bold"
              }`}
            >
              {item.name}
              {isActive && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#E3000F] rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-4">
        <button 
          onClick={handleLogout} 
          className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-[#E3000F] hover:border-[#E3000F]/30 hover:bg-[#E3000F]/5 transition-all"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default PassengerHeader;
