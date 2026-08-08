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
        <div className="w-8 h-8 rounded-lg bg-[#E3000F] flex items-center justify-center text-white p-1">
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="50,5 95,50 50,95 5,50" fill="#FFFFFF" />
            <path d="M48,22 C53,22 62,25 65,30 C60,32 58,35 56,38 C60,37 62,38 63,41 C64,43 61,46 62,49 C59,48 57,48 55,47 C57,51 57,54 55,57 C53,59 50,58 48,56 C46,55 45,52 45,49 C42,50 40,51 38,50 C36,49 35,46 36,43 C37,39 39,36 42,35 C40,32 41,29 43,26 C45,23 46,22 48,22 Z" fill="#E3000F" />
            <path d="M45,49 C42,55 35,62 25,65 C32,68 37,70 42,72 C35,74 28,76 20,77 C28,80 36,81 44,82 C38,84 32,86 25,87 C38,89 48,85 53,80 C58,75 58,68 56,57 Z" fill="#E3000F" />
          </svg>
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
