import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Camera, Upload, X, ShieldCheck, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { uploadIDImage } from "@/lib/store";

interface IdentityCenterProps {
  bookingId: string;
  onUploadComplete: (url: string) => Promise<void> | void;
  onClose: () => void;
  passengerType: string;
}

export default function IdentityCenter({ bookingId, onUploadComplete, onClose, passengerType }: IdentityCenterProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"choice" | "camera" | "uploading" | "success">("choice");
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      setStep("camera");
    } catch (err) {
      setError("Unable to access camera. Please upload a file instead.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    
    stopCamera();
    setStep("uploading");

    try {
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), "image/jpeg", 0.8));
      const url = await uploadIDImage(bookingId, blob);
      await onUploadComplete(url);
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Upload failed. Please try again.");
      setStep("choice");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStep("uploading");
    try {
      const url = await uploadIDImage(bookingId, file);
      await onUploadComplete(url);
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Upload failed. Please try again.");
      setStep("choice");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0A1118]/95 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg glass-card rounded-[2.5rem] p-8 border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Background Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#E3000F]/10 rounded-full blur-[100px] pointer-events-none" />
        
        <button onClick={() => { stopCamera(); onClose(); }} className="absolute top-6 right-6 p-2 text-white/40 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[#E3000F]/10 flex items-center justify-center text-[#E3000F]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Identity Center</h2>
              <p className="text-[#8895A7] text-sm font-medium uppercase tracking-widest text-[10px]">Verification for {passengerType}</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === "choice" && (
              <motion.div 
                key="choice"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-500/90 leading-relaxed font-medium">
                      Please ensure your {passengerType} ID is clearly visible. Our team will manually review your document to confirm eligibility.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={startCamera}
                    className="flex flex-col items-center justify-center gap-4 p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#E3000F]/10 flex items-center justify-center text-[#E3000F] group-hover:scale-110 transition-transform">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-white">Take Photo</span>
                  </button>

                  <label className="flex flex-col items-center justify-center gap-4 p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-white">Upload File</span>
                  </label>
                </div>

                {error && <p className="text-rose-500 text-xs text-center font-bold mt-4 animate-pulse">{error}</p>}
              </motion.div>
            )}

            {step === "camera" && (
              <motion.div 
                key="camera"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-black border-2 border-[#E3000F]/30">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-x-8 inset-y-12 border-2 border-dashed border-white/20 rounded-2xl pointer-events-none flex items-center justify-center">
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Align ID Within Frame</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => { stopCamera(); setStep("choice"); }} className="flex-1 py-4 text-white font-bold text-xs uppercase tracking-widest bg-white/5 rounded-2xl border border-white/10">
                    Cancel
                  </button>
                  <button onClick={capturePhoto} className="flex-[2] py-4 bg-[#E3000F] text-[#0A1118] rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[#E3000F]/20">
                    Capture & Verify
                  </button>
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </motion.div>
            )}

            {step === "uploading" && (
              <motion.div 
                key="uploading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-20 flex flex-col items-center justify-center text-center"
              >
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-white/5 border-t-[#E3000F] animate-spin" />
                  <Loader2 className="w-8 h-8 text-[#E3000F] absolute inset-0 m-auto animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-white mt-8 mb-2 tracking-tight">Encrypting & Uploading</h3>
                <p className="text-[#8895A7] text-sm">Your secure identity transmission is in progress...</p>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 flex flex-col items-center justify-center text-center"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 mb-8 border border-emerald-500/30">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">ID Submitted Successfully</h3>
                <p className="text-[#8895A7] text-sm max-w-sm mx-auto leading-relaxed">
                  Your identity document has been securely sent for manual review. 
                  <span className="block mt-2 text-primary font-bold">Please wait for an email confirmation once our team has verified your eligibility.</span>
                </p>
                <div className="flex flex-col gap-3 mt-10 w-full">
                  <button 
                    onClick={() => {
                      onClose();
                      navigate("/my-tickets");
                    }}
                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                  >
                    View My Tickets
                  </button>
                  <button 
                    onClick={() => {
                      onClose();
                      navigate("/booking");
                    }}
                    className="w-full py-4 bg-white/5 text-white rounded-2xl font-black text-xs uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
