import { useNavigate } from "react-router-dom";
import { XCircle } from "lucide-react";
import { motion } from "framer-motion";

const PaymentFailed = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-2xl p-10 text-center max-w-sm w-full">
        <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <p className="font-display font-bold text-destructive text-xl mb-2">Payment Failed</p>
        <p className="text-muted-foreground text-sm mb-6">Your payment was not completed. No charge was made.</p>
        <button onClick={() => navigate(-2)} className="w-full py-3 rounded-xl btn-ocean font-display font-bold">
          Try Again
        </button>
      </motion.div>
    </div>
  );
};

export default PaymentFailed;