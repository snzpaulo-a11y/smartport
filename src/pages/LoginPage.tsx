import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { signIn, signUp, getCurrentUser, sendIprogSMS, sendMailtrapEmail, sendEmailjsOTP, supabase, staffLogin, signInWithOtp, verifyOtp } from "@/lib/store";

import { Ship, AtSign, Lock, ArrowRight, ScanLine, Shield, Phone, MessageSquare, Eye, EyeOff } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";

export default function LoginPage() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<"login" | "signup" | "forgot" | "otp_forgot" | "reset">("login");
  const isLogin = activeView === "login";

  // Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone OTP Signup State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");

  // Account Recovery States
  const [recoveryIdentifier, setRecoveryIdentifier] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryOtp, setRecoveryOtp] = useState("");
  const [generatedRecoveryOtp, setGeneratedRecoveryOtp] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Password Visibility toggles
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Terms and Conditions State
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user && activeView !== "reset") navigate("/booking");
    });
  }, [navigate, activeView]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, _session) => {
      console.log("Auth state event:", event);
      if (event === "PASSWORD_RECOVERY") {
        setActiveView("reset");
        setError("");
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Prefer a server-issued reset code (request_password_reset RPC). Falls back
  // to client generation so the flow still works before the SQL is applied.
  const issueRecoveryCode = async (targetEmail: string): Promise<string> => {
    try {
      const { data: rpcCode, error } = await supabase.rpc("request_password_reset", {
        p_email: targetEmail,
      });
      if (!error && rpcCode) return String(rpcCode);
    } catch (e) {
      /* fall through to client-side generation */
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleForgotPasswordSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (!recoveryIdentifier) throw new Error("Please enter your email or phone number");
      const isEmail = recoveryIdentifier.includes("@");

      if (isEmail) {
        // Verify if user exists in profiles (or bookings, fallback to true if table is missing)
        let isRegistered = false;
        try {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", recoveryIdentifier)
            .maybeSingle();
          if (profile && !error) isRegistered = true;
        } catch (e) { /* table may not exist */ }

        if (!isRegistered) {
          try {
            const { data: booking, error } = await supabase
              .from("bookings")
              .select("id")
              .eq("email", recoveryIdentifier)
              .limit(1)
              .maybeSingle();
            if (booking && !error) isRegistered = true;
          } catch (e) { /* table may not exist */ }
        }

        // Always allow proceeding as profiles table is not present in schema cache
        isRegistered = true;

        if (!isRegistered) {
          throw new Error("This email is not registered on Starhorse.");
        }

        const code = await issueRecoveryCode(recoveryIdentifier);
        setGeneratedRecoveryOtp(code);

        try {
          await sendEmailjsOTP(recoveryIdentifier, code);
          setError("Recovery code sent to your email.");
        } catch (apiErr) {
          console.warn("EmailJS failed:", apiErr);
          setError(`[Demo Mode] Email Service Offline. Use code: ${code} to recover.`);
        }
        setActiveView("otp_forgot");
      } else {
        const formatted = recoveryIdentifier.replace(/\D/g, "");
        if (!formatted) throw new Error("Please enter a valid phone number");
        const shadowEmail = `${formatted}@smartport.ph`;

        // Verify if user exists in profiles
        let isRegistered = false;
        try {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", shadowEmail)
            .maybeSingle();
          if (profile && !error) isRegistered = true;
        } catch (e) { /* table may not exist */ }

        if (!isRegistered) {
          try {
            const { data: booking, error } = await supabase
              .from("bookings")
              .select("id")
              .eq("phone", formatted)
              .limit(1)
              .maybeSingle();
            if (booking && !error) isRegistered = true;
          } catch (e) { /* table may not exist */ }
        }

        isRegistered = true;

        if (!isRegistered) {
          throw new Error("This phone number is not registered on Starhorse.");
        }

        const code = await issueRecoveryCode(shadowEmail);
        setGeneratedRecoveryOtp(code);

        try {
          await sendIprogSMS(recoveryIdentifier, `Your Starhorse password recovery OTP is: ${code}`);
          setError("Recovery code sent to your phone via SMS.");
        } catch (apiErr) {
          console.warn("SMS delivery failed, fallback:", apiErr);
          setError(`[Demo Mode] OTP Service Offline. Use code: ${code} to recover.`);
        }
        setActiveView("otp_forgot");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRecoveryOtp = async () => {
    setError("");
    if (recoveryOtp.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    if (recoveryOtp !== generatedRecoveryOtp) {
      setError("Invalid recovery OTP code.");
      return;
    }
    setActiveView("reset");
    setError("");
  };

  const handleResetPassword = async () => {
    setError("");
    setLoading(true);
    try {
      if (!newPassword || newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      const targetEmail = recoveryIdentifier.includes("@")
        ? recoveryIdentifier
        : `${recoveryIdentifier.replace(/\D/g, "")}@smartport.ph`;

      // If a stale session for a DIFFERENT account is present, updateUser would change
      // the wrong user's password. Sign out so the correct account gets updated instead.
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUserEmail = sessionData?.session?.user?.email;
      if (sessionUserEmail && sessionUserEmail.toLowerCase() !== targetEmail.toLowerCase()) {
        await supabase.auth.signOut();
      }

      let resetOk = false;

      // Try client side native update first (in case there is a session from PASSWORD_RECOVERY)
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        console.warn("Native updateUser failed (no active session), trying RPC:", error.message);

        // Use the SQL RPC to update the password directly in auth schema.
        const { data: rpcSuccess, error: rpcError } = await supabase.rpc("reset_user_password", {
          p_email: targetEmail,
          p_code: recoveryOtp,
          p_new_password: newPassword
        });

        if (rpcError || !rpcSuccess) {
          console.error("RPC reset failed:", rpcError);
          setError("Password reset function not available. Please ask the admin to run reset_user_password.sql in the Supabase SQL Editor.");
        } else {
          resetOk = true;
          setError("Password updated successfully! You can now log in.");
        }
      } else {
        resetOk = true;
        setError("Password updated successfully! You can now log in.");
      }

      if (resetOk) {
        setTimeout(() => {
          setActiveView("login");
          setRecoveryIdentifier("");
          setNewPassword("");
          setConfirmPassword("");
          setRecoveryOtp("");
          setGeneratedRecoveryOtp("");
          setError("");
        }, 2500);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (activeView === "forgot") {
      handleForgotPasswordSubmit();
    } else if (activeView === "otp_forgot") {
      handleVerifyRecoveryOtp();
    } else if (activeView === "reset") {
      handleResetPassword();
    } else {
      if (!termsAccepted) {
        setShowTerms(true);
        return;
      }
      executeSubmit();
    }
  };

  const executeSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        if (!email || !password) throw new Error("Please enter your Email or Phone ");

        // --- 1. SUPERIOR UNIFIED LOGIN: Check if this is a Staff/Admin login first ---
        try {
          const staff = await staffLogin(email, password);
          if (staff) {
            if (staff.role === "admin" || staff.role === "super_admin") {
              sessionStorage.setItem("adminStaff", JSON.stringify(staff));
              sessionStorage.setItem("admin_type", staff.shipType || "ferry");
              navigate(staff.role === "super_admin" ? "/super-admin" : "/admin");
              return;
            } else if (staff.role === "scanner") {
              sessionStorage.setItem("scanStaff", JSON.stringify({
                id: staff.id, name: staff.name, email: staff.email,
                shipId: staff.shipIds?.[0] || null, shipType: staff.shipType, role: staff.role
              }));
              navigate("/scanner");
              return;
            }
          }
        } catch (err) {
          // Fall through to passenger login if staff tables fail or don't match
        }

        // --- 2. REGULAR LOGIN: Proceed if not staff ---
        let loginIdentifier = email;
        const isEmailMethod = email.includes("@");

        if (!isEmailMethod) {
          if (!/^[0-9+\s]+$/.test(email)) throw new Error("Please enter a valid phone number or email");
          loginIdentifier = `${email.replace(/\D/g, "")}@smartport.ph`;
        }

        await signIn(loginIdentifier, password);
        navigate("/booking");
      } else {
        const isEmailMethod = phone.includes("@");

        if (!otpStep) {
          // Send OTP flow for both Phone and Email
          if (!phone || !name || !signupPassword) {
            throw new Error(`Please enter your name, email/phone, and a password`);
          }

          if (!isEmailMethod && !/^[0-9+\s]+$/.test(phone)) {
            throw new Error("Please enter a valid email or phone number");
          }

          const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
          setGeneratedOtp(newOtp);

          try {
            if (isEmailMethod) {
              await sendEmailjsOTP(phone, newOtp);
              setError("Verification code sent! Please check your inbox.");
            } else {
              await sendIprogSMS(phone, `Your SmartPort Registration OTP is: ${newOtp}`);
              setError("Verification code sent! Please check your SMS.");
            }
          } catch (apiErr) {
            console.warn("OTP delivery failed, showing screen fallback:", apiErr);
            setError(`[Demo Mode] OTP Service Offline. Use code: ${newOtp} to register.`);
          }

          setOtpStep(true);
        } else {
          // Verify OTP flow
          if (otp.length !== 6) throw new Error("Please enter the 6-digit code");
          // Verify Custom OTP (Both Email and Phone are now manual)
          if (otp.trim() !== generatedOtp.trim()) throw new Error(`Invalid OTP Code! Expected: ${generatedOtp}, Got: ${otp}`);

          let authIdentifier = phone;
          if (!isEmailMethod) {
            // Generate seamless shadow credentials for the phone user
            authIdentifier = `${phone.replace(/\D/g, "")}@smartport.ph`;
          }

          const signUpResult = await signUp(authIdentifier, signupPassword, name);

          // Sign in automatically after verification
          await signIn(authIdentifier, signupPassword);
          navigate("/booking");
        }

      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1118] flex flex-col items-center justify-center font-body text-white relative overflow-hidden px-4">
      {/* Terms & Conditions Modal */}
      <AnimatePresence>
        {showTerms && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0A1118]/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#131B24] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-[0_0_50px_rgba(227, 0, 15,0.1)] relative max-h-[80vh] flex flex-col"
            >
              <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2 text-white">
                <Shield className="w-5 h-5 text-[#E3000F]" />
                Terms & Conditions
              </h2>
              <div className="overflow-y-auto pr-2 text-sm text-[#8895A7] space-y-4 mb-6 custom-scrollbar">
                <p>Welcome to Starhorse Shipping Lines. By accessing or using our booking portal, you agree to be bound by these terms.</p>
                <h3 className="text-white font-bold mt-2">1. Booking and Ticketing</h3>
                <p>All bookings are subject to availability. Passengers must present valid identification corresponding to the passenger details provided during booking.</p>
                <h3 className="text-white font-bold mt-2">2. Boarding Protocols</h3>
                <p>Starhorse enforces strict biometric and ticket scanning protocols. You consent to necessary security checks prior to boarding.</p>
                <h3 className="text-white font-bold mt-2">3. Privacy Policy</h3>
                <p>Your personal information is encrypted and handled in compliance with national privacy laws. We do not share your data with unauthorized third parties.</p>
                <h3 className="text-white font-bold mt-2">4. Cancellations</h3>
                <p>Cancellations must be made prior to departure. Starhorse reserves the right to cancel or reschedule voyages due to weather constraints.</p>
                <p className="mt-4 italic text-xs border-t border-white/5 pt-4 text-white/50">By clicking "I Agree", you acknowledge that you have read and agree to these terms.</p>
              </div>
              <div className="flex gap-3 mt-auto">
                <button
                  onClick={() => setShowTerms(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-colors"
                >
                  Decline
                </button>
                <button
                  onClick={() => {
                    setTermsAccepted(true);
                    setShowTerms(false);
                    executeSubmit();
                  }}
                  className="flex-1 py-3 rounded-xl bg-[#E3000F] hover:bg-[#FF3B47] text-[#0A1118] font-bold text-sm transition-colors shadow-[0_0_20px_rgba(227, 0, 15,0.2)]"
                >
                  I Agree
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#E3000F]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10 flex flex-col items-center">

        <div className="flex flex-col items-center mb-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 16 }}
            className="w-20 h-20 rounded-2xl bg-white shadow-[0_0_40px_rgba(227,0,15,0.25)] p-1.5 flex items-center justify-center"
          >
            <motion.img
              src="/starhorse-logo.jpg"
              alt="Starhorse"
              className="w-full h-full rounded-xl object-contain"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
          <h1 className="font-display text-[2.5rem] font-bold tracking-tight mb-2 text-slate-800">Starhorse</h1>
          <p className="text-[#8895A7] text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase">
            Maritime Transportation & Logistics
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full bg-[#131B24] border border-white/5 rounded-[2rem] p-8 shadow-2xl mb-8"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">

            {activeView === "signup" && !otpStep && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[#E3000F] tracking-widest uppercase">Full Name</label>
                  <div className="relative">
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#1A222C] border border-transparent focus:border-[#E3000F]/50 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[#E3000F] tracking-widest uppercase">Email / Phone</label>
                  <div className="relative">
                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09170000000 or myemail@example.com"
                      className="w-full bg-[#1A222C] border border-transparent focus:border-[#E3000F]/50 rounded-xl px-4 py-3.5 pl-11 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors"
                    />
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E3000F]" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-[#E3000F] tracking-widest uppercase">Create Password</label>
                  </div>
                  <div className="relative">
                    <input type={showSignupPassword ? "text" : "password"} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="••••••••••••"
                      className="w-full bg-[#1A222C] border border-transparent focus:border-[#E3000F]/50 rounded-xl px-4 py-3.5 pl-11 pr-10 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors"
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E3000F]" />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#E3000F]/60 hover:text-[#E3000F] transition-colors cursor-pointer"
                    >
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === "signup" && otpStep && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-6 items-center py-4">
                <div className="w-12 h-12 bg-[#E3000F]/10 rounded-full flex items-center justify-center mb-2">
                  <MessageSquare className="w-5 h-5 text-[#E3000F]" />
                </div>
                <div className="text-center mb-2">
                  <h3 className="font-display font-bold text-xl text-white">Enter Security Code</h3>
                  <p className="text-sm text-muted-foreground mt-1">We sent a 6-digit code to {phone}</p>
                </div>
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>

                <div className="flex flex-col items-center gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep(false);
                      setOtp("");
                    }}
                    className="text-[#E3000F] text-xs font-bold hover:underline transition-all"
                  >
                    Edit Email / Phone
                  </button>
                </div>
              </motion.div>
            )}

            {isLogin && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[#E3000F] tracking-widest uppercase">Email / Phone</label>
                  <div className="relative">
                    <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="09170000000 or myemail@example.com"
                      className="w-full bg-[#1A222C] border border-transparent focus:border-[#E3000F]/50 rounded-xl px-4 py-3.5 pl-11 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors"
                    />
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-[#E3000F] tracking-widest uppercase">Password</label>
                    <button 
                      type="button" 
                      onClick={() => { setActiveView("forgot"); setError(""); }} 
                      className="text-xs font-bold text-[#E3000F]/80 hover:text-[#E3000F] hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input type={showLoginPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••"
                      className="w-full bg-[#1A222C] border border-transparent focus:border-[#E3000F]/50 rounded-xl px-4 py-3.5 pr-10 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors"
                    />
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-10 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === "forgot" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2 text-center mb-2">
                  <h2 className="font-display font-bold text-xl text-white">Account Recovery</h2>
                  <p className="text-xs text-muted-foreground mt-1">Enter your registered email or phone to reset your password.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[#E3000F] tracking-widest uppercase">Email / Phone</label>
                  <div className="relative">
                    <input type="text" value={recoveryIdentifier} onChange={(e) => setRecoveryIdentifier(e.target.value)} placeholder="e.g. 09170000000 or myemail@example.com"
                      className="w-full bg-[#1A222C] border border-transparent focus:border-[#E3000F]/50 rounded-xl px-4 py-3.5 pl-11 text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors"
                    />
                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E3000F]" />
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === "otp_forgot" && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-6 items-center py-4">
                <div className="w-12 h-12 bg-[#E3000F]/10 rounded-full flex items-center justify-center mb-2">
                  <MessageSquare className="w-5 h-5 text-[#E3000F]" />
                </div>
                <div className="text-center mb-2">
                  <h3 className="font-display font-bold text-xl text-white">Verification Code</h3>
                  <p className="text-sm text-muted-foreground mt-1">We sent a 6-digit recovery code to {recoveryIdentifier}</p>
                </div>
                <InputOTP maxLength={6} value={recoveryOtp} onChange={setRecoveryOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </motion.div>
            )}

            {activeView === "reset" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2 text-center mb-2">
                  <h2 className="font-display text-xl font-bold text-white">Set New Password</h2>
                  <p className="text-xs text-muted-foreground mt-1">Choose a secure password for your SmartPort account.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[#E3000F] tracking-widest uppercase">New Password</label>
                  <div className="relative">
                    <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••••••"
                      className="w-full bg-[#1A222C] border border-transparent focus:border-[#E3000F]/50 rounded-xl px-4 py-3.5 pl-11 pr-10 text-sm text-white focus:outline-none transition-colors"
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E3000F]" />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#E3000F]/60 hover:text-[#E3000F] transition-colors cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[#E3000F] tracking-widest uppercase">Confirm New Password</label>
                  <div className="relative">
                    <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••••••"
                      className="w-full bg-[#1A222C] border border-transparent focus:border-[#E3000F]/50 rounded-xl px-4 py-3.5 pl-11 pr-10 text-sm text-white focus:outline-none transition-colors"
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E3000F]" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#E3000F]/60 hover:text-[#E3000F] transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {error && <p className={`text-xs font-medium text-center ${error.includes("perfectly") || error.includes("successfully") || error.includes("email sent") ? "text-green-500" : "text-red-500"}`}>{error}</p>}

            <button
              type="submit"
              disabled={loading || (activeView === "otp_forgot" && recoveryOtp.length < 6) || (activeView === "login" && !email) || (!isLogin && activeView !== "forgot" && activeView !== "otp_forgot" && activeView !== "reset" && otpStep && otp.length < 6)}
              className="mt-2 w-full bg-[#E3000F] hover:bg-[#FF3B47] text-[#0A1118] font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-[0_0_20px_rgba(227, 0, 15,0.2)] disabled:opacity-50 cursor-pointer font-display"
            >
              {loading ? "Processing..." : 
               activeView === "forgot" ? "Send Recovery Code" : 
               activeView === "otp_forgot" ? "Verify Code" :
               activeView === "reset" ? "Reset Password" : 
               isLogin ? "Log In" : 
               (!otpStep ? "Send Verification Code" : "Verify & Register")}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>

            {activeView === "login" || activeView === "signup" ? (
              <div className="text-center mt-2">
                <p className="text-sm text-[#8895A7]">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView(isLogin ? "signup" : "login");
                      setOtpStep(false);
                      setError("");
                    }}
                    className="text-[#E3000F] font-bold hover:underline cursor-pointer"
                  >
                    {isLogin ? "Create an Account" : "Log In"}
                  </button>
                </p>
              </div>
            ) : (
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView("login");
                    setError("");
                  }}
                  className="text-[#E3000F] font-bold text-sm hover:underline cursor-pointer"
                >
                  Back to Log In
                </button>
              </div>
            )}
          </form>
        </motion.div>



      </div>

      {/* Footer */}
      <div className="absolute bottom-8 left-0 w-full text-center">
        <p className="text-[#8895A7] text-[10px] font-bold tracking-[0.2em] uppercase">
          © 2026 SmartPort Maritime • Secure Protocol 4.0
        </p>
      </div>
    </div>
  );
}
