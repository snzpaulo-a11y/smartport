import { Anchor, LogOut, LifeBuoy } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
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
    <header className="sticky top-0 z-50 w-full border-b border-black/[0.06] bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:h-[68px] sm:px-8">
        <div className="flex items-center gap-2.5" onClick={() => navigate("/booking")} role="link" tabIndex={0}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white p-0.5 shadow-[0_2px_10px_-2px_rgba(227,0,15,0.35)] ring-1 ring-black/5">
            <img src="/starhorse-logo.jpg" alt="Starhorse" className="h-full w-full rounded-lg object-contain" />
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight text-foreground transition-colors sm:text-[1.35rem]">
            Starhorse
            <span className="text-primary">.</span>
          </span>
        </div>

        <nav className="hidden items-center gap-9 lg:flex">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={cn(
                  "relative py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.name}
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-0.5 mx-auto h-[2.5px] w-6 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate("/contact")}
            className="hidden h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:flex"
            title="Support"
            aria-label="Support"
          >
            <LifeBuoy className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={handleLogout}
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
            title="Sign Out"
            aria-label="Sign out"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default PassengerHeader;