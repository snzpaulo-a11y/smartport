import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, CheckCircle2, ChevronRight, MessageSquare, ShieldCheck } from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, surveyData: Record<string, string>, comment: string) => void;
  passengerName: string;
}

const QUESTIONS = [
  // Functional Suitability
  { id: "q1", label: "Booking, ticketing, and QR validation work accurately.", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  // Performance Efficiency
  { id: "q2", label: "The system responds quickly (schedules, payments, tickets).", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  // Compatibility
  { id: "q3", label: "The system works well on different browsers and devices.", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  // Usability
  { id: "q4", label: "The interface and instructions are clear and easy to use.", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  // Reliability
  { id: "q5", label: "The system avoids double-booking and keeps accurate records.", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  // Security
  { id: "q6", label: "My personal and booking information is kept secure.", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] },
  // Portability
  { id: "q7", label: "The system is easy to access on any device, with no installation needed.", options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"] }
];

export default function FeedbackModal({ isOpen, onClose, onSubmit, passengerName }: FeedbackModalProps) {
  const [step, setStep] = useState<"consent" | "rating" | "survey" | "thanks">("consent");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [surveyData, setSurveyData] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset the flow whenever the modal is (re)opened so stale answers never leak through.
  useEffect(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    if (isOpen) {
      setStep("consent");
      setCurrentQuestionIndex(0);
      setRating(0);
      setHoverRating(0);
      setSurveyData({});
      setComment("");
      setConsentChecked(false);
    }
  }, [isOpen]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const handleNext = () => {
    if (step === "consent" && consentChecked) {
      setStep("rating");
    } else if (step === "rating" && rating > 0) {
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
    if (step === "rating") {
      setStep("consent");
    } else if (step === "survey") {
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
            <h2 className="text-[22px] font-bold text-[#000000] tracking-tight">
              {step === "consent" ? "Romblon SmartPort" : step === "rating" ? "How was your experience?" : "ISO 25010 Evaluation Survey"}
            </h2>
            <button onClick={onClose} className="p-1.5 text-black hover:bg-black/5 rounded-full transition-colors">
              <X className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {step === "consent" && (
              <motion.div
                key="consent"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="flex items-center gap-3 bg-[#3b71f7]/5 border border-[#3b71f7]/20 rounded-2xl p-4">
                  <ShieldCheck className="w-8 h-8 text-[#3b71f7] flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-black">Informed Consent Form</h3>
                    <p className="text-[10px] text-black/50 font-semibold uppercase tracking-wider">Data Privacy Act of 2012 (RA 10173)</p>
                  </div>
                </div>

                <div className="space-y-3 text-[13px] text-black/70 leading-relaxed max-h-[320px] overflow-y-auto pr-2">
                  <div>
                    <p className="font-bold text-black text-[13px] mb-1">Purpose of the Study:</p>
                    <p>This battery testing survey aims to evaluate the operational performance, system usability, and feature reliability of the <span className="font-semibold text-black">Romblon SmartPort</span> system. Your feedback as passengers is vital in testing end-to-end functionality including online booking, administrative ticket management, and QR code validation at port gates to ensure software quality under the ISO/IEC 25010 standards prior to full deployment.</p>
                  </div>

                  <div>
                    <p className="font-bold text-black text-[13px] mb-1">Voluntary Participation:</p>
                    <p>Your participation in this testing process and survey is entirely voluntary. You have the right to decline, pause testing, or withdraw your responses at any time without any negative consequences.</p>
                  </div>

                  <div>
                    <p className="font-bold text-black text-[13px] mb-1">Confidentiality & Data Privacy Compliance:</p>
                    <p>In compliance with the Data Privacy Act of 2012 (RA 10173), all information you provide will be kept confidential and used only for research purposes. No personally identifiable data will be collected or shared without your consent. As a data subject, you have the right to be informed, access, correct, object to processing, and request deletion of your data. If you have concerns, you may contact our Data Protection Officer at <span className="font-semibold text-black">dpo@rsu.edu.ph</span>.</p>
                  </div>

                  <div>
                    <p className="font-bold text-black text-[13px] mb-1">Duration:</p>
                    <p>The survey will take approximately 10-15 minutes to complete.</p>
                  </div>

                  <div className="border-t border-black/10 pt-3">
                    <p className="font-bold text-black text-[13px] mb-2">Consent Statement:</p>
                    <p>By proceeding with this survey, you confirm that you:</p>
                    <ul className="list-none space-y-1.5 mt-2">
                      <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#3b71f7] mt-0.5 flex-shrink-0" /> <span>Have read and understood the purpose of this study.</span></li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#3b71f7] mt-0.5 flex-shrink-0" /> <span>Voluntarily agree to participate.</span></li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#3b71f7] mt-0.5 flex-shrink-0" /> <span>Understand that your responses will be kept confidential.</span></li>
                    </ul>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer bg-black/[0.03] border border-black/10 rounded-xl p-4 transition-colors hover:bg-black/[0.06]">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded-md border-2 border-black/20 accent-[#3b71f7] cursor-pointer flex-shrink-0"
                  />
                  <span className="text-[13px] font-semibold text-black leading-snug">
                    I have read and understood the informed consent, and I voluntarily agree to participate in this survey.
                  </span>
                </label>

                <button
                  disabled={!consentChecked}
                  onClick={handleNext}
                  className="w-full py-4 bg-[#3b71f7] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2a5df5] text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#3b71f7]/20"
                >
                  I Agree — Begin Survey <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

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
                <button
                  onClick={handlePrev}
                  className="w-full py-3 border border-black/10 hover:bg-black/5 text-black/60 rounded-2xl font-semibold text-sm transition-all"
                >
                  Back to Consent
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
