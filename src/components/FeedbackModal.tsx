import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, CheckCircle2, ChevronRight, MessageSquare } from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, surveyData: Record<string, string>, comment: string) => void;
  passengerName: string;
}

const QUESTIONS = [
  // Functional Suitability
  { id: "q1", label: "The system accurately handles online ticket booking, route selection, and seat reservations in real time.", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  { id: "q2", label: "The booking confirmation and digital ticket are generated immediately and contain the correct trip details.", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  { id: "q3", label: "QR code generation and gate scan validation operate reliably during boarding.", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  // Performance Efficiency
  { id: "q4", label: "The website loads quickly when browsing vessel schedules, selecting seats, and completing payment.", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  { id: "q5", label: "QR code scanning and verification execute rapidly at the boarding area.", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  // Compatibility
  { id: "q6", label: "The web application performs consistently across different web browsers (Chrome, Edge, Safari).", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  { id: "q7", label: "The responsive interface adapts properly to various screen sizes (Desktops, Laptops, Tablets, Smartphones).", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  { id: "q8", label: "The admin properly confirms and processes my payment, ensuring my booking is verified before boarding.", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  // Usability
  { id: "q9", label: "The user interface is clean, intuitive, and easy to navigate.", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  { id: "q10", label: "The vessel seat selection map is easy to understand and operate.", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  { id: "q11", label: "On-screen instructions and validation messages properly guide me through errors.", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  // Reliability
  { id: "q12", label: "The system prevents double-booking, ensuring my selected seat is reserved exclusively for me.", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  { id: "q13", label: "The system handles errors gracefully (e.g., slow internet, wrong inputs) without crashing.", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  { id: "q14", label: "My booking summary and payment records are accurate and consistent.", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  // Security
  { id: "q15", label: "The login process and account credentials feel secure.", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  { id: "q16", label: "My personal information and booking details are kept private.", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  { id: "q17", label: "The boarding QR code is verified against my booking record to prevent ticket fraud or duplicates.", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] }
];

export default function FeedbackModal({ isOpen, onClose, onSubmit, passengerName }: FeedbackModalProps) {
  const [step, setStep] = useState<"rating" | "survey" | "thanks">("rating");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [surveyData, setSurveyData] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset the flow whenever the modal is (re)opened so stale answers never leak through.
  useEffect(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    if (isOpen) {
      setStep("rating");
      setCurrentQuestionIndex(0);
      setRating(0);
      setHoverRating(0);
      setSurveyData({});
      setComment("");
    }
  }, [isOpen]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const handleNext = () => {
    if (step === "rating" && rating > 0) {
      setStep("survey");
    } else if (step === "survey") {
      if (currentQuestionIndex < QUESTIONS.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        setStep("thanks");
        onSubmit(rating, surveyData, comment);
        closeTimer.current = setTimeout(onClose, 2000);
      }
    }
  };

  const handlePrev = () => {
    if (step === "survey") {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex((prev) => prev - 1);
      } else {
        setStep("rating");
      }
    }
  };

  const handleRatingClick = (r: number) => {
    setRating(r);
  };

  if (!isOpen) return null;

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const isQuestionAnswered = surveyData[currentQuestion.id] !== undefined;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-[480px] overflow-hidden text-black font-sans"
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-[22px] font-bold text-[#000000] tracking-tight">How was your experience?</h2>
            <button onClick={onClose} className="p-1.5 text-black hover:bg-black/5 rounded-full transition-colors">
              <X className="w-6 h-6 stroke-[2.5]" />
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
                  <p className="text-black/60 text-sm mb-6">Hi {passengerName.split(' ')[0]}, please rate our service</p>
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
                              : "fill-black/5 text-black/20 hover:fill-black/10"
                          } transition-colors`}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#3b71f7]">
                    {rating === 5 ? "Excellent!" : rating === 4 ? "Great!" : rating === 3 ? "Good" : rating === 2 ? "Fair" : rating === 1 ? "Poor" : "Select a Rating"}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-black/40 uppercase tracking-widest px-1">Additional Comments</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Anything else you'd like to share?"
                    className="w-full bg-black/5 border border-black/10 rounded-2xl p-4 text-sm text-black focus:outline-none focus:border-[#3b71f7]/50 min-h-[100px] resize-none"
                  />
                </div>

                <button
                  disabled={rating === 0}
                  onClick={handleNext}
                  className="w-full py-4 bg-[#3b71f7] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2a5df5] text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#3b71f7]/20"
                >
                  Continue to Survey <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {step === "survey" && (
              <motion.div
                key={`survey-q-${currentQuestionIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-6">
                  <div className="flex justify-between items-center text-xs font-bold text-black/40 uppercase tracking-wider">
                    <span>Question {currentQuestionIndex + 1} of {QUESTIONS.length}</span>
                    <span>{Math.round(((currentQuestionIndex) / QUESTIONS.length) * 100)}% Complete</span>
                  </div>
                  <div className="w-full bg-black/5 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#3b71f7] h-full transition-all duration-300" 
                      style={{ width: `${((currentQuestionIndex + 1) / QUESTIONS.length) * 100}%` }}
                    />
                  </div>
                  
                  <div className="space-y-4 min-h-[160px]">
                    <p className="text-[16px] font-semibold text-black leading-relaxed">{currentQuestion.label}</p>
                    <div className="flex flex-wrap gap-2.5">
                      {currentQuestion.options.map((opt) => {
                        const isSelected = surveyData[currentQuestion.id] === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => setSurveyData({ ...surveyData, [currentQuestion.id]: opt })}
                            className={`px-4 py-2.5 rounded-[18px] text-[13px] font-semibold transition-all border ${
                              isSelected
                                ? "bg-[#ef4444] text-white border-[#ef4444] shadow-md shadow-red-500/10"
                                : "bg-white text-black border-red-500 hover:bg-red-50/50"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handlePrev}
                    className="flex-1 py-4 border border-black/10 hover:bg-black/5 text-black rounded-[18px] font-bold flex items-center justify-center gap-2 transition-all text-base"
                  >
                    Previous
                  </button>
                  <button
                    disabled={!isQuestionAnswered}
                    onClick={handleNext}
                    className="flex-1 py-4 bg-[#3b71f7] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2b5df0] text-white rounded-[18px] font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 text-base"
                  >
                    {currentQuestionIndex === QUESTIONS.length - 1 ? (
                      <>Complete Survey <CheckCircle2 className="w-5 h-5" /></>
                    ) : (
                      <>Next <ChevronRight className="w-5 h-5" /></>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {step === "thanks" && (
              <motion.div
                key="thanks"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 text-center space-y-4"
              >
                <div className="w-20 h-20 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-bold text-black">Thank You!</h3>
                <p className="text-black/60">Your feedback helps us improve SmartPort.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
