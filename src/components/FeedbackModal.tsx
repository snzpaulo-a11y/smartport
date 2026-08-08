import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, CheckCircle2, ChevronRight, MessageSquare } from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, surveyData: any, comment: string) => void;
  passengerName: string;
}

const QUESTIONS = [
  { id: "ease", label: "How easy was the booking process?", options: ["Very Difficult", "Difficult", "Neutral", "Easy", "Very Easy"] },
  { id: "clarity", label: "Was the vessel information clear?", options: ["Not Clear", "Somewhat Clear", "Very Clear"] },
  { id: "recommend", label: "Would you recommend SmartPort to others?", options: ["No", "Maybe", "Yes"] }
];

export default function FeedbackModal({ isOpen, onClose, onSubmit, passengerName }: FeedbackModalProps) {
  const [step, setStep] = useState<"rating" | "survey" | "thanks">("rating");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [surveyData, setSurveyData] = useState<any>({});
  const [comment, setComment] = useState("");

  const handleNext = () => {
    if (step === "rating" && rating > 0) {
      setStep("survey");
    } else if (step === "survey") {
      setStep("thanks");
      onSubmit(rating, surveyData, comment);
      setTimeout(onClose, 2000);
    }
  };

  const handleRatingClick = (r: number) => {
    setRating(r);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-[#151A22] border border-white/10 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">How was your experience?</h2>
            <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {step === "rating" && (
              <motion.div
                key="rating"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <p className="text-white/60 text-sm mb-6">Hi {passengerName.split(' ')[0]}, please rate our service</p>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button
                        key={r}
                        onMouseEnter={() => setHoverRating(r)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => handleRatingClick(r)}
                        className="p-1 transition-transform hover:scale-110 active:scale-95"
                      >
                        <Star
                          className={`w-10 h-10 ${
                            r <= (hoverRating || rating)
                              ? "fill-amber-400 text-amber-400"
                              : "text-white/10 hover:text-white/20"
                          } transition-colors`}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#3F70FF]">
                    {rating === 5 ? "Excellent!" : rating === 4 ? "Great!" : rating === 3 ? "Good" : rating === 2 ? "Fair" : rating === 1 ? "Poor" : "Select a Rating"}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">Additional Comments</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Anything else you'd like to share?"
                    className="w-full bg-[#1A222C] border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-[#3F70FF]/50 min-h-[100px] resize-none"
                  />
                </div>

                <button
                  disabled={rating === 0}
                  onClick={handleNext}
                  className="w-full py-4 bg-[#3F70FF] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#5280FF] text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#3F70FF]/20"
                >
                  Continue to Survey <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {step === "survey" && (
              <motion.div
                key="survey"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-8">
                  {QUESTIONS.map((q) => (
                    <div key={q.id} className="space-y-3">
                      <p className="text-sm font-medium text-white">{q.label}</p>
                      <div className="flex flex-wrap gap-2">
                        {q.options.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => setSurveyData({ ...surveyData, [q.id]: opt })}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                              surveyData[q.id] === opt
                                ? "bg-[#3F70FF] text-white shadow-lg shadow-[#3F70FF]/20"
                                : "bg-[#1A222C] text-white/60 hover:text-white hover:bg-white/5 border border-white/5"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  className="w-full py-4 bg-[#3F70FF] hover:bg-[#5280FF] text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#3F70FF]/20"
                >
                  Complete Survey <CheckCircle2 className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {step === "thanks" && (
              <motion.div
                key="thanks"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 text-center space-y-4"
              >
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-bold text-white">Thank You!</h3>
                <p className="text-white/60">Your feedback helps us improve SmartPort.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
