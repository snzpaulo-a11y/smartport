import { useState, useRef, useEffect } from "react";
import { X, Camera, Upload, CheckCircle, Shield, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (file: Blob) => void;
}

export default function BiometricScanner({ isOpen, onClose, onSuccess }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<"choose" | "camera" | "verifying" | "result">("choose");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [streamAction, setStreamAction] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setStep("choose");
      setCapturedImage(null);
      setError("");
      return;
    }
  }, [isOpen]);

  const stopCamera = () => {
    if (streamAction) {
      streamAction.getTracks().forEach((track) => track.stop());
      setStreamAction(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    setError("");
    setStep("camera");
    
    if (!window.isSecureContext || !navigator.mediaDevices) {
      setError("Secure connection (HTTPS) required for camera.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStreamAction(stream);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Camera access denied. Please check site permissions.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || error) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setCapturedImage(dataUrl);
      canvas.toBlob((blob) => {
        if (blob) setImageBlob(blob);
      }, "image/jpeg", 0.9);
      stopCamera();
      verifyImage();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImageBlob(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImage(event.target?.result as string);
      verifyImage();
    };
    reader.readAsDataURL(file);
  };

  const verifyImage = () => {
    setStep("verifying");
    // Simulate a quick verification process
    setTimeout(() => {
      setStep("result");
    }, 1500);
  };

  const handleFinish = () => {
    if (imageBlob) onSuccess(imageBlob);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-[#0A1118]/95 backdrop-blur-xl flex flex-col font-sans">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 bg-black/50 border-b border-white/5">
          <h2 className="text-white font-display font-bold uppercase tracking-widest text-sm flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Identity Verification
          </h2>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-xl text-white hover:bg-white/10 transition-colors border border-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative flex flex-col items-center justify-center p-4">
          
          {step === "choose" && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-sm text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-primary/20">
                <FileText className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Verify Your ID</h3>
              <p className="text-muted-foreground text-sm mb-8 px-4">
                Please provide a clear photo of your ID card to claim your discount.
              </p>
              
              <div className="grid grid-cols-1 gap-4">
                <button onClick={startCamera} className="group relative w-full py-5 bg-[#131B24] hover:bg-primary text-white hover:text-black rounded-2xl border border-white/5 transition-all flex flex-col items-center gap-2 overflow-hidden">
                  <Camera className="w-6 h-6" />
                  <span className="font-bold text-xs uppercase tracking-widest">Use Camera</span>
                   <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                
                <button onClick={() => fileInputRef.current?.click()} className="group relative w-full py-5 bg-[#131B24] hover:bg-[#351B1D] text-white rounded-2xl border border-white/5 transition-all flex flex-col items-center gap-2 overflow-hidden">
                  <Upload className="w-6 h-6 text-primary" />
                  <span className="font-bold text-xs uppercase tracking-widest">Upload from Gallery</span>
                </button>
              </div>
            </motion.div>
          )}

          {step === "camera" && (
            <div className="w-full max-w-sm flex flex-col items-center">
              <div className="w-full aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-black border-2 border-primary/30 relative shadow-2xl">
                {error ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <p className="text-red-500 font-bold mb-4">{error}</p>
                    <button onClick={onClose} className="px-6 py-2 bg-white/10 rounded-xl text-xs">Go Back</button>
                  </div>
                ) : (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <div className="absolute inset-0 border-[3px] border-primary/40 border-dashed m-10 rounded-2xl pointer-events-none" />
                  </>
                )}
              </div>
              
              {!error && (
                <button onClick={capturePhoto} className="mt-10 w-20 h-20 rounded-full bg-primary border-[6px] border-primary/30 flex items-center justify-center shadow-[0_0_40px_rgba(227, 0, 15,0.4)] active:scale-95 transition-all">
                  <Camera className="w-8 h-8 text-[#0A1118]" />
                </button>
              )}
            </div>
          )}

          {step === "verifying" && (
            <div className="text-center flex flex-col items-center">
              <div className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
              <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-widest">Processing Image</h3>
              <p className="text-muted-foreground text-sm">Verifying document clarity...</p>
            </div>
          )}

          {step === "result" && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm bg-[#131B24] p-8 rounded-[2.5rem] border border-white/5 text-center shadow-2xl">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">ID Received</h3>
              <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                Your identity document has been captured. The discount will now be applied to your booking.
              </p>
              <button onClick={handleFinish} className="btn-ocean w-full py-4 text-black font-bold text-lg">
                Finish Verification
              </button>
            </motion.div>
          )}

        </div>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </AnimatePresence>
  );
}
