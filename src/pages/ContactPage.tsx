import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, Share2, Anchor, Mail, Phone, MapPin } from "lucide-react";
import { getCurrentUser } from "@/lib/store";
import PassengerHeader from "@/components/PassengerHeader";
import BottomNav from "@/components/BottomNav";

const ContactPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (!user) navigate("/");
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0E151E] flex flex-col text-white font-body overflow-x-hidden">
      <PassengerHeader />

      <section className="py-20 px-4 sm:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E3000F]/10 border border-[#E3000F]/20 text-[9px] font-black uppercase tracking-widest text-[#E3000F] mb-8">
                24/7 Support
              </div>
              <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tight mb-8 leading-[1.1]">Concierge Support at <br /> Every Horizon.</h1>
              <p className="text-[#8895A7] text-base leading-relaxed mb-12 max-w-md">
                Our support team is stationed at every port of call to ensure your maritime experience is flawless. Reach out for group reservations, transit assistance, or cargo inquiries.
              </p>
              
              <div className="space-y-8">
                <div className="flex items-center gap-5 group">
                  <div className="w-14 h-14 rounded-[1.25rem] bg-white/5 border border-white/10 flex items-center justify-center text-[#E3000F] group-hover:bg-[#E3000F] group-hover:text-black transition-all">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-[#8895A7] uppercase tracking-widest mb-1 opacity-60">Office HQ</p>
                    <p className="text-base font-bold text-white">Romblon Port Terminal, PH</p>
                  </div>
                </div>
                <div className="flex items-center gap-5 group">
                  <div className="w-14 h-14 rounded-[1.25rem] bg-white/5 border border-white/10 flex items-center justify-center text-[#E3000F] group-hover:bg-[#E3000F] group-hover:text-black transition-all">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-[#8895A7] uppercase tracking-widest mb-1 opacity-60">Hotline</p>
                    <p className="text-base font-bold text-white">+63 912 345 6789</p>
                  </div>
                </div>
                <div className="flex items-center gap-5 group">
                  <div className="w-14 h-14 rounded-[1.25rem] bg-white/5 border border-white/10 flex items-center justify-center text-[#E3000F] group-hover:bg-[#E3000F] group-hover:text-black transition-all">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-[#8895A7] uppercase tracking-widest mb-1 opacity-60">Email Support</p>
                    <p className="text-base font-bold text-white">support@smartport.ph</p>
                  </div>
                </div>
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#131B24] border border-white/5 p-10 sm:p-14 rounded-[4rem] relative shadow-2xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#E3000F]/5 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-2xl font-black mb-10 tracking-tight">Send a Message</h3>
                <div className="space-y-7">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-[#8895A7] uppercase tracking-widest ml-1">Full Name</label>
                    <input type="text" placeholder="Enter your name" className="w-full bg-[#0E151E] border border-white/5 rounded-2xl px-8 py-5 text-sm focus:outline-none focus:border-[#E3000F]/40 transition-colors placeholder:text-white/10" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-[#8895A7] uppercase tracking-widest ml-1">Email Address</label>
                    <input type="email" placeholder="name@example.com" className="w-full bg-[#0E151E] border border-white/5 rounded-2xl px-8 py-5 text-sm focus:outline-none focus:border-[#E3000F]/40 transition-colors placeholder:text-white/10" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-[#8895A7] uppercase tracking-widest ml-1">Your Message</label>
                    <textarea placeholder="How can we help you?" rows={4} className="w-full bg-[#0E151E] border border-white/5 rounded-2xl px-8 py-5 text-sm focus:outline-none focus:border-[#E3000F]/40 transition-colors resize-none placeholder:text-white/10" />
                  </div>
                  <button className="w-full bg-[#E3000F] text-[#0A1118] py-5 rounded-[1.5rem] font-black text-sm hover:bg-[#FF3B47] transition-all shadow-lg shadow-[#E3000F]/20 mt-6 uppercase tracking-widest">
                    Submit Inquiry
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer Partial */}
      <footer className="py-20 mt-auto bg-[#0A1118] border-t border-white/5 text-center px-6">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Anchor className="w-8 h-8 text-[#E3000F]" />
          <span className="font-display text-2xl font-black text-white">SmartPort</span>
        </div>
        <p className="text-[10px] font-bold text-[#8895A7] uppercase tracking-[0.3em] mb-10 opacity-40 max-w-xs mx-auto mx-auto leading-loose">
          Secure. Digital-First. <br /> Archipelago Transit Infrastructure.
        </p>
        <div className="flex justify-center gap-4">
          <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center hover:bg-[#131B24] transition-colors cursor-pointer text-[#8895A7] hover:text-[#E3000F]">
            <Globe className="w-5 h-5" />
          </div>
          <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center hover:bg-[#131B24] transition-colors cursor-pointer text-[#8895A7] hover:text-[#E3000F]">
            <Share2 className="w-5 h-5" />
          </div>
        </div>
      </footer>
      <BottomNav />
    </div>
  );
};

export default ContactPage;
