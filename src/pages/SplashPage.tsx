import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { signIn, signUp, getCurrentUser, getShips, Ship } from "@/lib/store";
import { Anchor, User, ArrowRight, UserPlus, QrCode, ArrowUpRight, EyeOff, Eye, Loader2, Mail, ScanLine, Globe, Share2 } from "lucide-react";

const SplashPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"home" | "login" | "signup">("home");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verifySent, setVerifySent] = useState(false);
  const [ships, setShips] = useState<Ship[]>([]);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) navigate("/booking");
    });
    getShips().then(data => setShips(data.filter(s => s.isActive)));
  }, [navigate]);

  const handleLogin = async () => {
    if (!email || !password) { setError("Please fill in all fields"); return; }
    setLoading(true); setError("");
    try {
      await signIn(email, password);
      navigate("/booking");
    } catch (err: any) {
      setError(err.message ?? "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!name || !email || !password) { setError("Please fill in all fields"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError("");
    try {
      await signUp(email, password, name);
      setVerifySent(true);
    } catch (err: any) {
      setError(err.message ?? "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  if (mode !== "home") {
    // Keep the login/signup flow similar to previous but styled better, 
    // or we can use a centered modal over the home layout.
    // For simplicity, a centered modal over the background.
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070D14] relative px-4">
        {/* Ambient background glow */}
        <div className="absolute top-[20%] left-[30%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
        
        <AnimatePresence mode="wait">
          {mode === "login" && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="max-w-sm w-full relative z-10 p-8 glass-card rounded-[2rem] border border-white/10"
            >
              <button onClick={() => { setMode("home"); setError(""); }} className="text-sm text-white/60 mb-6 hover:text-white transition-colors flex items-center gap-1 font-medium">
                ← Back
              </button>
              <h2 className="font-display text-3xl font-extrabold text-white mb-2 tracking-tight">Welcome back</h2>
              <p className="text-sm text-white/60 mb-8">Log in to your SmartPort account</p>

              <div className="space-y-4">
                <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-medium" />
                <div className="relative">
                  <input type={showPass ? "text" : "password"} placeholder="Password" value={password}
                    onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-medium pr-12" />
                  <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors">
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {error && <p className="text-sm text-red-400 font-medium">{error}</p>}
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleLogin} disabled={loading}
                  className="w-full py-4 rounded-xl bg-[#E3000F] text-[#0A1118] font-bold text-lg flex items-center justify-center gap-2 mt-2 shadow-[0_0_20px_rgba(227, 0, 15,0.3)] hover:shadow-[0_0_30px_rgba(227, 0, 15,0.5)] transition-all">
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Logging in...</> : "Log In"}
                </motion.button>
              </div>
            </motion.div>
          )}

          {mode === "signup" && !verifySent && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="max-w-sm w-full relative z-10 p-8 glass-card rounded-[2rem] border border-white/10"
            >
              <button onClick={() => { setMode("home"); setError(""); }} className="text-sm text-white/60 mb-6 hover:text-white transition-colors flex items-center gap-1 font-medium">
                ← Back
              </button>
              <h2 className="font-display text-3xl font-extrabold text-white mb-2 tracking-tight">Create account</h2>
              <p className="text-sm text-white/60 mb-8">Join SmartPort and book your first trip</p>

              <div className="space-y-4">
                <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50 transition-all" />
                <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50 transition-all" />
                <div className="relative">
                  <input type={showPass ? "text" : "password"} placeholder="Password (min 6 characters)" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50 transition-all pr-12" />
                  <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors">
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {error && <p className="text-sm text-red-400 font-medium">{error}</p>}
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSignUp} disabled={loading}
                  className="w-full py-4 rounded-xl bg-[#E3000F] text-[#0A1118] font-bold text-lg flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(227, 0, 15,0.3)] transition-all">
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Creating...</> : "Create Account"}
                </motion.button>
              </div>
            </motion.div>
          )}

          {verifySent && (
            <motion.div key="verify" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="max-w-sm w-full text-center relative z-10 p-8 glass-card rounded-[2rem] border border-white/10">
              <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-secondary/20 flex items-center justify-center border border-secondary/30">
                <Mail className="w-10 h-10 text-secondary" />
              </div>
              <h2 className="font-display text-2xl font-extrabold text-white mb-2">Check your email</h2>
              <p className="text-sm text-white/60 mb-2">We sent a verification link to</p>
              <p className="font-bold text-white mb-6 bg-white/5 rounded-lg py-2">{email}</p>
              <button onClick={() => { setMode("login"); setVerifySent(false); setError(""); }}
                className="w-full py-4 rounded-xl bg-[#E3000F] text-[#0A1118] font-bold text-lg">
                Go to Login
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // mode === "home" matching the precise mockup
  return (
    <div className="min-h-screen bg-[#0E151E] flex flex-col text-white font-body overflow-x-hidden">
      
      {/* ── Top Header Section with Background Image ── */}
      <div className="relative w-full min-h-[75vh] flex flex-col">
        {/* Background Image / Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1559825481-12a05cc00344?q=80&w=2600&auto=format&fit=crop" 
            alt="Ocean background"
            className="w-full h-full object-cover opacity-10 mix-blend-luminosity brightness-100"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
        </div>

        {/* Header Nav */}
        <header className="relative z-20 flex items-center justify-between px-8 py-6 max-w-7xl w-full mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white shadow-[0_0_20px_rgba(227,0,15,0.2)] flex items-center justify-center p-0.5">
              <img src="/starhorse-logo.jpg" alt="Starhorse" className="w-full h-full rounded-lg object-contain" />
            </div>
            <span className="font-display text-2xl font-extrabold tracking-tight text-slate-800">Starhorse</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#" className="text-[#E3000F] relative">
              Home
              <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-[#E3000F] rounded-full" />
            </a>
            <a href="#" className="text-white/70 hover:text-white transition-colors">Schedules</a>
            <a href="#" className="text-white/70 hover:text-white transition-colors">Routes</a>
            <a href="#" className="text-white/70 hover:text-white transition-colors">Contact</a>
          </nav>

          <button className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors">
            <User className="w-5 h-5 text-white/80" />
          </button>
        </header>

        {/* Hero Content */}
        <main className="relative z-10 flex-1 flex items-center max-w-7xl w-full mx-auto px-8 pb-16 pt-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
            
            {/* Left side */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2E0E11] border border-[#4F1217] text-[#E3000F] text-[10px] font-bold tracking-widest mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E3000F] animate-pulse" />
                NEXT GENERATION MARITIME TRAVEL
              </div>

              <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
                Navigate Romblon <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E3000F] to-[#3B82F6]">Without Friction.</span>
              </h1>

              <p className="text-white/70 text-lg md:text-xl font-medium leading-relaxed mb-10 max-w-md">
                Experience the gold standard of ferry booking. Secure, digital-first ticketing for the modern traveler in the heart of the Philippines.
              </p>

              <div className="flex flex-wrap items-center gap-4 mb-14">
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setMode("login")}
                  className="bg-[#E3000F] text-[#0A1118] px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#FF3B47] transition-colors"
                >
                  Log In <ArrowRight className="w-5 h-5" />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setMode("signup")}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 transition-colors"
                >
                  Create Account <UserPlus className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-12">
                <div>
                  <p className="text-2xl font-bold text-[#E3000F] mb-1">12+</p>
                  <p className="text-[10px] font-bold tracking-widest text-white/50 uppercase">Active Routes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#E3000F] mb-1">24/7</p>
                  <p className="text-[10px] font-bold tracking-widest text-white/50 uppercase">Port Support</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#E3000F] mb-1">Instant</p>
                  <p className="text-[10px] font-bold tracking-widest text-white/50 uppercase">Digital Boarding</p>
                </div>
              </div>
            </div>

            {/* Right side - Floating Card */}
            <div className="hidden lg:block relative">
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="ml-auto w-full max-w-[400px] bg-[#351B1D]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all cursor-pointer group"
                onClick={() => navigate("/scan-login")}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#E3000F]/20 flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-[#E3000F]" />
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Scan Tickets</h3>
                <p className="text-sm text-white/60 leading-relaxed font-medium">
                  Instant check-in for registered passengers. Skip the queue and board with a single scan.
                </p>
              </motion.div>
            </div>

          </div>
        </main>
      </div>

      {/* ── Bottom Section ── */}
      <section className="bg-[#101720] border-t border-white/5 pb-20 pt-20 px-8">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <h2 className="font-display text-4xl font-bold tracking-tight mb-3">Elite Fleet Connections</h2>
              <p className="text-white/60 text-sm font-medium max-w-sm leading-relaxed">
                We partner with premium maritime operators to ensure your journey across the Romblon archipelago is safe and sophisticated.
              </p>
            </div>
            <button className="text-[#E3000F] font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all" onClick={() => navigate("/booking")}>
              View All Schedules <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Card - Schedule Preview */}
            <div className="flex flex-col gap-8">
              {ships.slice(0, 3).map(ship => (
                <div key={ship.id} className="bg-[#351B1D] border border-white/5 rounded-[2rem] p-4 flex flex-col group overflow-hidden relative">
                  <div className="relative w-full h-[220px] rounded-[1.5rem] overflow-hidden mb-6">
                    <img 
                      src={ship.image || "https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=2000&auto=format&fit=crop"} 
                      alt={ship.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#351B1D] to-transparent opacity-80" />
                  </div>
                  
                  <div className="px-4 pb-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-6">
                      <h3 className="text-xl font-bold text-white">{ship.route}</h3>
                      <span className="px-2 py-1 rounded bg-[#4D0A0F] text-[#E3000F] text-[10px] font-extrabold tracking-wider">{ship.type.toUpperCase()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between mb-8 text-sm">
                      <div className="text-white/50 space-y-2">
                        <p className="font-medium italic text-xs">Departure</p>
                        <p className="text-white font-bold text-lg">{ship.departure}</p>
                      </div>
                      <div className="text-right text-white/50 space-y-2">
                        <p className="font-medium italic text-xs">Estimated Arrival</p>
                        <p className="text-white font-bold text-lg">{ship.arrival}</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => navigate("/booking")}
                      className="mt-auto w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors border border-white/10"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              ))}

              {ships.length === 0 && (
                <div className="bg-[#351B1D] border border-white/5 rounded-[2rem] p-4 flex flex-col group overflow-hidden relative">
                  <div className="relative w-full h-[220px] rounded-[1.5rem] overflow-hidden mb-6">
                    <img 
                      src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=2000&auto=format&fit=crop" 
                      alt="Ferry Interior" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#351B1D] to-transparent opacity-80" />
                  </div>
                  
                  <div className="px-4 pb-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-6">
                      <h3 className="text-xl font-bold text-white">Odiongan → Batangas</h3>
                      <span className="px-2 py-1 rounded bg-[#4D0A0F] text-[#E3000F] text-[10px] font-extrabold tracking-wider">FAST CRAFT</span>
                    </div>
                    
                    <div className="flex items-center justify-between mb-8 text-sm">
                      <div className="text-white/50 space-y-2">
                        <p className="font-medium italic text-xs">Departure</p>
                        <p className="text-white font-bold text-lg">08:00 AM</p>
                      </div>
                      <div className="text-right text-white/50 space-y-2">
                        <p className="font-medium italic text-xs">Estimated Arrival</p>
                        <p className="text-white font-bold text-lg">12:30 PM</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => navigate("/booking")}
                      className="mt-auto w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors border border-white/10"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Card - Travel Spotlight */}
            <div className="bg-[#351B1D] border border-white/5 rounded-[2rem] p-10 flex flex-col relative overflow-hidden group">
              {/* Subtle background glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#E3000F]/5 rounded-full blur-[80px]" />
              
              <h4 className="text-[#E3000F] text-xs font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
                Travel Spotlight
              </h4>
              
              <h3 className="text-2xl font-bold text-white mb-4">Weekly Executive Pass</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-auto pb-10 max-w-sm">
                The frequent sailor's choice. Unlimited priority boarding between Romblon proper and Sibuyan Island for 7 days.
              </p>

              <div className="mt-8 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tighter">₱4,500</span>
                <span className="text-white/40 text-xs font-bold uppercase tracking-wider">/ Month</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#0A1118] border-t border-white/5 py-12 px-8">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          <div className="flex items-center gap-2 mb-8">
            <Anchor className="w-6 h-6 text-[#E3000F]" />
            <span className="font-display text-xl font-bold tracking-tight">SmartPort</span>
          </div>

          <div className="flex flex-wrap justify-center gap-6 md:gap-8 text-xs font-bold tracking-wide text-white/50 mb-10 uppercase">
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Help Center</a>
            <a href="#" className="hover:text-white transition-colors">Schedules</a>
          </div>

          <div className="w-24 h-px bg-white/10 mb-8" />

          <p className="text-xs text-white/40 mb-8">
            © 2024 SmartPort Maritime. All rights reserved.
          </p>

          <div className="flex gap-4">
            <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
              <Globe className="w-4 h-4 text-white/60" />
            </button>
            <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
              <Share2 className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SplashPage;