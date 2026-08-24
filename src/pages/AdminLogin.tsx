import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, Shield, Loader2 } from "lucide-react";
import { staffLogin } from "@/lib/store";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Clear any existing session on mount to ensure clean login
  useEffect(() => {
    sessionStorage.removeItem("adminStaff");
    sessionStorage.removeItem("admin_type");
  }, []);

  const handleLogin = async () => {
    if (!email || !pass) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const staff = await staffLogin(email, pass);
      
      if (staff) {
        if (staff.role !== "admin" && staff.role !== "super_admin") {
          setError("Access denied: Insufficient permissions for dashboard");
          setLoading(false);
          return;
        }
        // Store staff info
        sessionStorage.setItem("adminStaff", JSON.stringify(staff));
        // Maintain compatibility with existing code that checks admin_type
        sessionStorage.setItem("admin_type", staff.shipType || "ferry");
        
        if (staff.role === "super_admin") {
          navigate("/super-admin");
        } else {
          navigate("/admin");
        }
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-8 w-full max-w-sm border border-white/10 shadow-2xl"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3 border border-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]">
            <Shield className="w-8 h-8 text-primary shadow-sm" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">Admin Portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Authorized access only</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium ml-1 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-medium"
                placeholder="admin@smartport.ph"
                disabled={loading}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium ml-1 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={pass}
                onChange={(e) => { setPass(e.target.value); setError(""); }}
                className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-medium pr-12"
                placeholder="••••••••"
                disabled={loading}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
              <button 
                onClick={() => setShowPass(!showPass)} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors p-1"
                disabled={loading}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }}
              className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs text-center font-medium"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 rounded-xl btn-ocean font-display font-bold text-sm tracking-wide shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
            {loading ? "Authenticating..." : "Login to Dashboard"}
          </motion.button>
        </div>

        <button 
          onClick={() => navigate("/")} 
          className="w-full mt-6 text-xs text-muted-foreground hover:text-white transition-colors font-medium flex items-center justify-center gap-2"
        >
          ← Return to Main Portal
        </button>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
