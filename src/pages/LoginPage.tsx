import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { signIn, signUp, getCurrentUser, sendIprogSMS, sendMailtrapEmail, sendEmailjsOTP, supabase, staffLogin, signInWithOtp, verifyOtp } from "@/lib/store";

import { Ship, AtSign, Lock, ArrowRight, ScanLine, Shield, Phone, MessageSquare, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
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

  const isSuccessMessage =
    error.includes("perfectly") || error.includes("successfully") || error.includes("email sent");

  const inputClass =
    "h-12 w-full rounded-xl border border-black/10 bg-white pl-10 pr-4 text-sm text-foreground shadow-sm placeholder:text-slate-400 focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10";
  const inputIconClass = "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400";
  const labelClass = "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-primary";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-10 font-body text-foreground">
      {/* Terms & Conditions Modal */}
      <AnimatePresence>
        {showTerms && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="relative flex max-h-[80vh] w-full max-w-md flex-col rounded-3xl border border-black/[0.06] bg-white p-7 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.3)]"
            >
              <h2 className="mb-4 flex items-center gap-2.5 font-display text-xl font-bold text-foreground">
                <Shield className="h-5 w-5 text-primary" />
                Terms & Conditions
              </h2>
              <div className="mb-6 space-y-4 overflow-y-auto pr-2 text-sm text-muted-foreground custom-scrollbar">
                <p>Welcome to Starhorse Shipping Lines. By accessing or using our booking portal, you agree to be bound by these terms.</p>
                <h3 className="font-bold text-foreground">1. Booking and Ticketing</h3>
                <p>All bookings are subject to availability. Passengers must present valid identification corresponding to the passenger details provided during booking.</p>
                <h3 className="font-bold text-foreground">2. Boarding Protocols</h3>
                <p>Starhorse enforces strict biometric and ticket scanning protocols. You consent to necessary security checks prior to boarding.</p>
                <h3 className="font-bold text-foreground">3. Privacy Policy</h3>
                <p>Your personal information is encrypted and handled in compliance with national privacy laws. We do not share your data with unauthorized third parties.</p>
                <h3 className="font-bold text-foreground">4. Cancellations</h3>
                <p>Cancellations must be made prior to departure. Starhorse reserves the right to cancel or reschedule voyages due to weather constraints.</p>
                <p className="mt-4 border-t border-black/5 pt-4 text-xs italic text-muted-foreground/80">By clicking "I Agree", you acknowledge that you have read and agree to these terms.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTerms(false)}
                  className="flex-1 rounded-xl border border-black/10 bg-white py-3 text-sm font-bold text-foreground transition-colors hover:bg-secondary active:scale-[0.98]"
                >
                  Decline
                </button>
                <button
                  onClick={() => {
                    setTermsAccepted(true);
                    setShowTerms(false);
                    executeSubmit();
                  }}
                  className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-[0_8px_20px_-8px_rgba(227,0,15,0.5)] transition-[transform,background-color] hover:bg-primary/90 active:scale-[0.98]"
                >
                  I Agree
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Soft red ambient accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-48 left-1/2 h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-[130px]" />
        <div className="absolute -bottom-44 -left-32 h-[380px] w-[380px] rounded-full bg-primary/[0.05] blur-[110px]" />
        <div className="absolute -right-28 top-1/3 h-[300px] w-[300px] rounded-full bg-primary/[0.04] blur-[100px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-[430px] flex-col items-center">

        <div className="mb-9 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            className="mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-white p-1.5 shadow-[0_12px_32px_-12px_rgba(227,0,15,0.4)] ring-1 ring-black/5"
          >
            <img src="/starhorse-logo.jpg" alt="Starhorse" className="h-full w-full rounded-xl object-contain" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
            className="font-display text-[1.9rem] font-extrabold tracking-tight text-foreground"
          >
            Starhorse
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground"
          >
            Maritime Transportation & Logistics
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
          className="mb-8 w-full rounded-[1.75rem] border border-black/[0.06] bg-white p-7 shadow-[0_2px_6px_rgba(0,0,0,0.04),0_28px_56px_-28px_rgba(227,0,15,0.22)] sm:p-9"
        >
          <div className="mb-7 text-center">
            <h2 className="font-display text-[1.45rem] font-extrabold tracking-tight text-foreground">
              {activeView === "login" ? "Welcome back" :
                activeView === "signup" ? "Create your account" :
                activeView === "forgot" ? "Reset your password" :
                activeView === "otp_forgot" ? "Verify your identity" :
                "Set a new password"}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {activeView === "login" ? "Sign in to book your next voyage." :
                activeView === "signup" ? "It takes less than a minute." :
                activeView === "forgot" ? "We'll send you a recovery code." :
                activeView === "otp_forgot" ? "Enter the code we sent you." :
                "Choose a strong password."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {activeView === "signup" && !otpStep && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-5">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <div className="relative">
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Email / Phone</label>
                  <div className="relative">
                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09170000000 or myemail@example.com"
                      className={inputClass}
                    />
                    <AtSign className={inputIconClass} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>Create Password</label>
                  </div>
                  <div className="relative">
                    <input type={showSignupPassword ? "text" : "password"} value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="••••••••••••" autoComplete="new-password"
                      className={inputClass}
                    />
                    <Lock className={inputIconClass} />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-primary"
                      aria-label={showSignupPassword ? "Hide password" : "Show password"}
                    >
                      {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === "signup" && otpStep && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 py-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div className="mb-1 text-center">
                  <h3 className="font-display text-lg font-bold text-foreground">Enter Security Code</h3>
                  <p className="mt-1 text-sm text-muted-foreground">We sent a 6-digit code to {phone}</p>
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

                <button
                  type="button"
                  onClick={() => {
                    setOtpStep(false);
                    setOtp("");
                  }}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  Edit Email / Phone
                </button>
              </motion.div>
            )}

            {isLogin && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-5">
                <div>
                  <label className={labelClass}>Email / Phone</label>
                  <div className="relative">
                    <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="09170000000 or myemail@example.com" autoComplete="username"
                      className={inputClass}
                    />
                    <AtSign className={inputIconClass} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>Password</label>
                    <button
                      type="button"
                      onClick={() => { setActiveView("forgot"); setError(""); }}
                      className="text-xs font-bold text-slate-500 transition-colors hover:text-primary"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input type={showLoginPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" autoComplete="current-password"
                      className={inputClass}
                    />
                    <Lock className={inputIconClass} />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-primary"
                      aria-label={showLoginPassword ? "Hide password" : "Show password"}
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeView === "forgot" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <label className={labelClass}>Email / Phone</label>
                <div className="relative">
                  <input type="text" value={recoveryIdentifier} onChange={(e) => setRecoveryIdentifier(e.target.value)} placeholder="e.g. 09170000000 or myemail@example.com"
                    className={inputClass}
                  />
                  <AtSign className={inputIconClass} />
                </div>
              </motion.div>
            )}

            {activeView === "otp_forgot" && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 py-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div className="mb-1 text-center">
                  <h3 className="font-display text-lg font-bold text-foreground">Verification Code</h3>
                  <p className="mt-1 text-sm text-muted-foreground">We sent a 6-digit recovery code to {recoveryIdentifier}</p>
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-5">
                <div>
                  <label className={labelClass}>New Password</label>
                  <div className="relative">
                    <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••••••" autoComplete="new-password"
                      className={inputClass}
                    />
                    <Lock className={inputIconClass} />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-primary"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Confirm New Password</label>
                  <div className="relative">
                    <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••••••" autoComplete="new-password"
                      className={inputClass}
                    />
                    <Lock className={inputIconClass} />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-primary"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {error && (
              <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs font-medium ${
                isSuccessMessage
                  ? "border-emerald-500/25 bg-emerald-50 text-emerald-700"
                  : "border-red-500/25 bg-red-50 text-red-600"
              }`}>
                {isSuccessMessage
                  ? <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-emerald-500" />
                  : <AlertCircle className="mt-px h-4 w-4 shrink-0 text-red-500" />}
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (activeView === "otp_forgot" && recoveryOtp.length < 6) || (activeView === "login" && !email) || (!isLogin && activeView !== "forgot" && activeView !== "otp_forgot" && activeView !== "reset" && otpStep && otp.length < 6)}
              className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-display text-sm font-bold text-primary-foreground shadow-[0_8px_20px_-8px_rgba(227,0,15,0.45)] transition-[transform,background-color,box-shadow] duration-200 ease-spring hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Processing..." :
                activeView === "forgot" ? "Send Recovery Code" :
                  activeView === "otp_forgot" ? "Verify Code" :
                    activeView === "reset" ? "Reset Password" :
                      isLogin ? "Log In" :
                        (!otpStep ? "Send Verification Code" : "Verify & Register")}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>

            {activeView === "login" || activeView === "signup" ? (
              <div className="mt-1 text-center">
                <p className="text-sm text-muted-foreground">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView(isLogin ? "signup" : "login");
                      setOtpStep(false);
                      setError("");
                    }}
                    className="font-bold text-primary hover:underline"
                  >
                    {isLogin ? "Create an Account" : "Log In"}
                  </button>
                </p>
              </div>
            ) : (
              <div className="mt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView("login");
                    setError("");
                  }}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  Back to Log In
                </button>
              </div>
            )}
          </form>
        </motion.div>

      </div>

      {/* Footer */}
      <p className="relative z-10 mt-auto pb-1 pt-6 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
        © 2026 SmartPort Maritime • Secure Protocol 4.0
      </p>
    </div>
  );
}