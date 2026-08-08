import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { staffLogin } from "@/lib/store";
import { Scan, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

const ScanLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) { setError("Please enter email and password."); return; }
    setLoading(true); setError("");
    const staff = await staffLogin(email, password);
    if (!staff) {
      setError("Invalid credentials. Please try again.");
      setLoading(false); return;
    }
    // Save staff info to sessionStorage for scanner history and validation
    sessionStorage.setItem("scanStaff", JSON.stringify({ 
      id: staff.id, 
      name: staff.name, 
      email: staff.email, 
      shipId: staff.shipIds?.[0] || null, 
      shipType: staff.shipType,
      role: staff.role
    }));
    navigate("/scanner");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-3">
            <Scan className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Scanner Login</h1>
          <p className="text-sm text-muted-foreground mt-1">Staff access only</p>
        </div>

        <div className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Staff email" onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <div className="relative">
            <input type={showPass ? "text" : "password"} value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 pr-12" />
            <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <button onClick={handleLogin} disabled={loading}
            className="w-full py-3.5 rounded-xl btn-ocean font-display font-bold flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
            {loading ? "Logging in..." : "Login to Scanner"}
          </button>

          <div className="mt-4 pt-3 border-t border-border/40 text-center">
            <button type="button" onClick={() => navigate("/")} className="text-xs text-primary font-medium hover:underline flex items-center justify-center gap-1 mx-auto">
              ← Go to Passenger Portal
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ScanLogin;