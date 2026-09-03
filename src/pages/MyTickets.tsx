import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, getBookingsByUser, getShipById, Booking, deleteBooking, updateBookingToRegular, expireStalePendingBookings, getPaymentDeadline, getCounterDeadline } from "@/lib/store";
import { ArrowLeft, Ticket, Ship as ShipIcon, Calendar, MapPin, QrCode, CreditCard, Trash2, ShieldAlert, CheckCircle2, Shield, Clock, Wallet, AlertTriangle } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
  boarded: "bg-secondary/10 text-secondary border border-secondary/20",
  pending: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
  counter: "bg-[#B45309]/10 text-[#F59E0B] border border-[#B45309]/20",
  cancelled: "bg-red-500/10 text-red-500 border border-red-500/20",
  expired: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20",
};

const formatTimeLeft = (deadline: Date) => {
  const diff = deadline.getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h ${minutes}m left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
};

const getPriceForTicket = (ticket: Booking) => {
  const isPaid = ["paid", "boarded", "counter"].includes(ticket.status);
  const basePrice = ticket.legPrice || 0;
  // Once paid, legPrice already stores the final discounted amount — do not discount again.
  if (ticket.passengerType?.toLowerCase() === 'regular' || isPaid) return basePrice;
  const discounts: Record<string, number> = { student: 0.20, senior: 0.20, pwd: 0.20 };
  const rate = discounts[ticket.passengerType.toLowerCase()] || 0;
  return basePrice - Math.round(basePrice * rate);
};

const MyTickets = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<(Booking & { shipName?: string; shipRoute?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Awaited<ReturnType<typeof getCurrentUser>>>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const u = await getCurrentUser();
        setUser(u);
        if (!u) {
          setLoading(false);
          navigate("/");
          return;
        }

        console.log("[MyTickets] Loading for user:", u.id);
        await expireStalePendingBookings();
        const bookings = await getBookingsByUser(u.id);
        console.log("[MyTickets] Found bookings:", bookings.length);

        const enriched = await Promise.all(
          bookings.map(async (b) => {
            try {
              const ship = await getShipById(b.shipId);
              return { ...b, shipName: ship?.name, shipRoute: ship?.route };
            } catch (e) {
              console.warn("[MyTickets] Ship enrichment failed for:", b.shipId);
              return b;
            }
          })
        );
        setTickets(enriched);
      } catch (err) {
        console.error("[MyTickets] Load failed:", err);
        alert("Failed to load tickets: " + (err instanceof Error ? err.message : "Unknown error"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (
    <div className="max-w-lg mx-auto">
      <PageSkeleton variant="list" count={4} />
    </div>
  );

  return (
    <div className="min-h-screen px-4 py-6 max-w-lg mx-auto pb-nav">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 glass-card rounded-xl hover:bg-muted/50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">My Tickets</h1>
            <p className="text-xs text-muted-foreground">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button onClick={() => navigate("/booking")} className="p-2 text-muted-foreground hover:text-white transition-colors">
          <span className="text-[10px] font-black uppercase tracking-widest">Home</span>
        </button>
      </div>

      {(() => {
        if (!user) {
          return (
            <div className="text-center py-20 glass-card rounded-2xl">
              <Ticket className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-display font-semibold text-muted-foreground">Not logged in</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Please log in to see your tickets</p>
              <button onClick={() => navigate("/booking")}
                className="mt-4 px-6 py-2.5 btn-ocean rounded-xl font-display font-semibold text-sm">
                Go to Booking
              </button>
            </div>
          );
        }

        if (tickets.length === 0) {
          return (
            <div className="text-center py-20 glass-card rounded-2xl">
              <Ticket className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-display font-semibold text-muted-foreground">No tickets yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Your paid and pending tickets will appear here</p>
              <div className="mt-4 p-2 bg-muted/20 rounded text-[10px] text-muted-foreground font-mono">
                DEBUG: User ID: {user?.id}
              </div>
              <button onClick={() => navigate("/booking")}
                className="mt-4 px-6 py-2.5 btn-ocean rounded-xl font-display font-semibold text-sm">
                Book a Trip
              </button>
            </div>
          );
        }

        const pendingTickets = tickets.filter(t => t.status === 'pending');
        const counterTickets = tickets.filter(t => t.status === 'counter');
        const expiredTickets = tickets.filter(t => t.status === 'expired');
        const confirmedTickets = tickets.filter(t => t.status !== 'pending' && t.status !== 'expired' && t.status !== 'counter');

        // Group pending tickets by their creation timestamp (createdAt)
        const pendingGroups: Record<string, typeof pendingTickets> = {};
        pendingTickets.forEach(t => {
          const groupKey = t.createdAt || t.id;
          if (!pendingGroups[groupKey]) {
            pendingGroups[groupKey] = [];
          }
          pendingGroups[groupKey].push(t);
        });

        return (
          <div className="space-y-8">
            {/* PENDING TICKETS SECTION */}
            {pendingTickets.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  Action Required ({pendingTickets.length})
                </h2>
                <div className="space-y-3">
                  {Object.entries(pendingGroups).map(([groupKey, groupTickets], idx) => {
                    const isGroupCard = groupTickets.length > 1;
                    const firstTicket = groupTickets[0];
                    
                    if (!isGroupCard) {
                      const ticket = firstTicket;
                      const isPendingVerification = ticket.passengerType?.toLowerCase() !== 'regular' && ticket.idVerificationStatus !== 'verified';
                      const isRejectedVerification = ticket.idVerificationStatus === 'rejected';
                      const finalPrice = getPriceForTicket(ticket);

                      return (
                        <motion.div key={ticket.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                          className="glass-card rounded-2xl p-5 border border-amber-500/20">
                          
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <ShipIcon className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-display font-bold text-foreground">{ticket.shipName || "Ship"}</p>
                                <p className="text-[10px] text-muted-foreground">{ticket.shipRoute}</p>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                              <p className="font-display font-bold text-lg text-primary leading-none">
                                ₱{finalPrice}
                              </p>
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8895A7] mt-1">{ticket.passengerType}</span>
                            </div>
                          </div>

                          {/* Passenger Name Display */}
                          <div className="mb-4 text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                            <span>Passenger:</span>
                            <span className="text-foreground font-bold">{ticket.passengerName || "N/A"}</span>
                          </div>

                          <div className="bg-muted/30 rounded-xl p-3 mb-4 text-xs text-center border border-muted-foreground/10">
                            {ticket.idVerificationStatus === 'pending' && (
                              <p className="text-amber-500 font-semibold italic flex items-center justify-center gap-1.5">
                                <Shield className="w-3.5 h-3.5 animate-pulse" /> Identity verification in progress...
                              </p>
                            )}
                            {ticket.idVerificationStatus === 'rejected' && (
                              <div className="space-y-1">
                                <p className="text-rose-500 font-semibold flex items-center justify-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5" /> ID Verification Rejected
                                </p>
                                {ticket.idRejectedReason && (
                                  <p className="text-[10px] text-rose-400/70 italic">Reason: {ticket.idRejectedReason}</p>
                                )}
                                <p className="text-[10px] text-muted-foreground">Your discount has been removed. Proceed at regular fare.</p>
                              </div>
                            )}
                            {ticket.idVerificationStatus === 'verified' && (
                              <p className="text-emerald-500 font-semibold flex items-center justify-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" /> ID Verified! You can now pay.
                              </p>
                            )}
                            {ticket.idVerificationStatus === 'none' && (
                              ticket.passengerType?.toLowerCase() === 'regular' 
                                ? <p className="text-blue-500 font-semibold">Awaiting Payment.</p>
                                : <p className="text-amber-500 font-semibold">Action Required: Identity verification needed.</p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-2 flex items-center justify-center gap-1 font-mono">
                              {ticket.idVerificationStatus === 'pending'
                                ? 'Waiting for admin ID approval.'
                                : `${formatTimeLeft(getPaymentDeadline(ticket))} to pay`}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs mb-4 text-muted-foreground">
                            <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /><span>{ticket.tripDate ? new Date(ticket.tripDate).toLocaleDateString() : 'N/A'}</span></div>
                            <div className="flex items-center gap-1.5 justify-end"><Ticket className="w-3.5 h-3.5" /><span>Seat {ticket.seatLabel}</span></div>
                          </div>

                          <div className="flex flex-col gap-2 mt-4 border-t border-muted-foreground/10 pt-4">
                            <button 
                              onClick={() => {
                                navigate(`/payment/${ticket.shipId}/${ticket.seatId}`, {
                                  state: { 
                                    bookingId: ticket.id, name: ticket.passengerName, phone: ticket.phone, 
                                    passengerType: ticket.passengerType, price: finalPrice, seatLabel: ticket.seatLabel,
                                    basePrice: ticket.legPrice, deduction: Math.max(0, (ticket.legPrice || 0) - finalPrice),
                                    idVerificationStatus: ticket.idVerificationStatus,
                                    boardStop: ticket.boardStop, alightStop: ticket.alightStop, tripDate: ticket.tripDate, shipName: ticket.shipName
                                  }
                                });
                              }}
                              disabled={isPendingVerification}
                              className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                isPendingVerification
                                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50 grayscale"
                                  : isRejectedVerification
                                    ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20 active:scale-[0.98] hover:scale-[1.01]"
                                    : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98] hover:scale-[1.01]"
                              }`}
                            >
                              <CreditCard className="w-4 h-4" /> {isRejectedVerification ? "Pay Regular Fare" : "Continue to Payment"}
                            </button>
                          
                            <div className="grid grid-cols-2 gap-2">
                              <button 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (confirm("Are you sure you want to change to a Regular passenger? You will lose your discount and be required to pay the full fare.")) {
                                    try {
                                      const discounts: Record<string, number> = { student: 0.80, senior: 0.80, pwd: 0.80 };
                                      const rate = discounts[ticket.passengerType.toLowerCase()] || 1.0;
                                      const isPaid = ["paid", "boarded", "counter"].includes(ticket.status);
                                      const fullPrice = ticket.legPrice ? (isPaid ? Math.round(ticket.legPrice / rate) : ticket.legPrice) : 0; 
                                      await updateBookingToRegular(ticket.id, fullPrice);
                                      setTickets(prev => prev.map(t => 
                                        t.id === ticket.id 
                                          ? { ...t, passengerType: 'regular', legPrice: fullPrice, idVerificationStatus: 'none' } 
                                          : t
                                      ));
                                    } catch (err) {
                                      console.error("Update failed:", err);
                                      alert("Failed to update booking: " + (err instanceof Error ? err.message : "Unknown error"));
                                    }
                                  }
                                }}
                                className="py-2.5 bg-secondary/10 text-secondary hover:bg-secondary/20 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-colors"
                              >
                                Change to Regular
                              </button>
                              <button 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (confirm("Cancel this booking completely?")) {
                                    try {
                                      await deleteBooking(ticket.id);
                                      setTickets(prev => prev.filter(t => t.id !== ticket.id));
                                    } catch (err) {
                                      console.error("Cancel failed:", err);
                                      alert("Failed to cancel booking: " + (err instanceof Error ? err.message : "Unknown error"));
                                    }
                                  }
                                }}
                                className="py-2.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Cancel
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    } else {
                      // Render GROUP ticket card!
                      const readyTickets = groupTickets.filter(t => t.passengerType?.toLowerCase() === 'regular' || t.idVerificationStatus === 'verified');
                      const pendingOrRejectedTickets = groupTickets.filter(t => t.passengerType?.toLowerCase() !== 'regular' && t.idVerificationStatus !== 'verified');
                      const hasUnverifiedDiscount = pendingOrRejectedTickets.some(t => t.idVerificationStatus === 'pending');
                      const hasRejectedDiscount = pendingOrRejectedTickets.some(t => t.idVerificationStatus === 'rejected');
                      const totalGroupPrice = groupTickets.reduce((sum, t) => sum + getPriceForTicket(t), 0);
                      const groupBaseTotal = groupTickets.reduce((sum, t) => sum + (t.legPrice || 0), 0);
                      const hasGroupDiscount = groupBaseTotal > totalGroupPrice;
                      const payAmount = readyTickets.reduce((sum, t) => sum + getPriceForTicket(t), 0);
                      const isPaymentDisabled = readyTickets.length === 0;

                      return (
                        <motion.div key={groupKey} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                          className="glass-card rounded-2xl p-5 border border-amber-500/20">
                          
                          <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <ShipIcon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-display font-bold text-foreground">{firstTicket.shipName || "Ship"}</p>
                              <p className="text-[10px] text-muted-foreground">{firstTicket.shipRoute}</p>
                            </div>
                          </div>

                          {/* Group Members List */}
                          <div className="space-y-3 mb-4 border-t border-b border-muted-foreground/10 py-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#8895A7] mb-2">Group Passengers ({groupTickets.length})</p>
                            {groupTickets.map(ticket => {
                              const ticketPrice = getPriceForTicket(ticket);

                              return (
                                <div key={ticket.id} className="flex flex-col gap-2 p-3 bg-muted/20 rounded-xl border border-muted-foreground/5">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="text-xs font-bold text-foreground">{ticket.passengerName}</p>
                                      <p className="text-[9px] font-semibold text-muted-foreground uppercase mt-0.5">{ticket.passengerType} • Seat {ticket.seatLabel}</p>
                                    </div>
                                    <p className="text-xs font-bold text-primary">₱{ticketPrice}</p>
                                  </div>

                                  <div className="flex items-center justify-between gap-2 mt-1">
                                    <div className="text-[10px] font-semibold">
                                      {ticket.idVerificationStatus === 'pending' && <span className="text-amber-500 font-semibold italic flex items-center gap-1.5"><Shield className="w-3 h-3 animate-pulse" /> Verification in progress...</span>}
                                      {ticket.idVerificationStatus === 'rejected' && <span className="text-rose-500 font-bold">ID Rejected</span>}
                                      {ticket.idVerificationStatus === 'verified' && <span className="text-emerald-500 font-bold">ID Verified!</span>}
                                      {ticket.idVerificationStatus === 'none' && (
                                        ticket.passengerType?.toLowerCase() === 'regular' 
                                          ? <span className="text-blue-500 font-semibold">Awaiting Payment</span>
                                          : <span className="text-amber-500 font-semibold">Action Required</span>
                                      )}
                                    </div>
                                    
                                    <div className="flex gap-1.5">
                                      {ticket.passengerType?.toLowerCase() !== 'regular' && ticket.idVerificationStatus !== 'none' && (
                                        <button 
                                          onClick={async () => {
                                            if (confirm("Are you sure you want to change this passenger to a Regular passenger? You will lose their discount and be required to pay the full fare.")) {
                                              try {
                                                const discounts: Record<string, number> = { student: 0.80, senior: 0.80, pwd: 0.80 };
                                                const rate = discounts[ticket.passengerType.toLowerCase()] || 1.0;
                                                const isPaid = ["paid", "boarded", "counter"].includes(ticket.status);
                                                const fullPrice = ticket.legPrice ? (isPaid ? Math.round(ticket.legPrice / rate) : ticket.legPrice) : 0; 
                                                await updateBookingToRegular(ticket.id, fullPrice);
                                                setTickets(prev => prev.map(t => 
                                                  t.id === ticket.id 
                                                    ? { ...t, passengerType: 'regular', legPrice: fullPrice, idVerificationStatus: 'none' } 
                                                    : t
                                                ));
                                              } catch (err) {
                                                alert("Failed to update booking: " + (err instanceof Error ? err.message : "Unknown error"));
                                              }
                                            }
                                          }}
                                          className="px-2 py-1 bg-secondary/10 text-secondary hover:bg-secondary/20 rounded-lg text-[9px] font-bold uppercase transition-colors"
                                        >
                                          Regular
                                        </button>
                                      )}
                                      <button 
                                        onClick={async () => {
                                          if (confirm("Cancel this booking?")) {
                                            try {
                                              await deleteBooking(ticket.id);
                                              setTickets(prev => prev.filter(t => t.id !== ticket.id));
                                            } catch (err) {
                                              alert("Failed to cancel booking: " + (err instanceof Error ? err.message : "Unknown error"));
                                            }
                                          }
                                        }}
                                        className="px-2 py-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-lg text-[9px] font-bold uppercase transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex justify-between items-center text-xs text-muted-foreground mb-4">
                            <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /><span>{firstTicket.tripDate ? new Date(firstTicket.tripDate).toLocaleDateString() : 'N/A'}</span></div>
                            <div className="text-right flex flex-col items-end">
                              {hasGroupDiscount ? (
                                <>
                                  <span className="text-[10px] text-muted-foreground line-through">₱{groupBaseTotal}</span>
                                  <span className="text-[10px] text-emerald-500">-{`₱${(groupBaseTotal - totalGroupPrice).toLocaleString()} discount`}</span>
                                  <span className="text-xs font-bold text-foreground">₱{totalGroupPrice}</span>
                                </>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">Total Group Fare: ₱{totalGroupPrice}</span>
                              )}
                              {readyTickets.length < groupTickets.length && (
                                <span className="font-bold text-emerald-500 mt-0.5">Approved to Pay: ₱{payAmount}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 mt-4">
                            <button 
                              onClick={() => {
                                if (readyTickets.length === 0) return;
                                const firstReady = readyTickets[0];
                                navigate(`/payment/${firstReady.shipId}/${firstReady.seatId}`, {
                                  state: { 
                                    bookingId: firstReady.id,
                                    isGroup: true,
                                    passengers: readyTickets.map(t => ({
                                      bookingId: t.id, name: t.passengerName, phone: t.phone, email: t.email,
                                      type: t.passengerType, price: getPriceForTicket(t), basePrice: t.legPrice, deduction: 0,
                                      idImageUrl: t.idImageUrl, idVerificationStatus: t.idVerificationStatus, seatId: t.seatId, seatLabel: t.seatLabel
                                    })),
                                    shipName: firstReady.shipName,
                                    boardStop: firstReady.boardStop,
                                    alightStop: firstReady.alightStop,
                                    tripDate: firstReady.tripDate
                                  }
                                });
                              }}
                              disabled={isPaymentDisabled}
                              className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                isPaymentDisabled
                                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50 grayscale"
                                  : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98] hover:scale-[1.01]"
                              }`}
                            >
                              <CreditCard className="w-4 h-4" /> 
                              {readyTickets.length > 0 
                                ? (readyTickets.length === groupTickets.length 
                                    ? `Continue to Payment (₱${payAmount})` 
                                    : `Pay Approved Tickets (₱${payAmount})`)
                                : hasRejectedDiscount 
                                ? "ID Rejected (Please Resolve)" 
                                : "Awaiting ID Approvals"}
                            </button>
                          </div>
                        </motion.div>
                      );
                    }
                  })}
                </div>
              </div>
            )}

            {/* COUNTER TICKETS SECTION */}
            {counterTickets.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[#F59E0B]" />
                  Reserved at Counter ({counterTickets.length})
                </h2>
                <div className="space-y-3">
                  {counterTickets.map((ticket, i) => (
                    <motion.div key={ticket.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="glass-card rounded-2xl p-5 border border-[#B45309]/20">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#B45309]/10 flex items-center justify-center shrink-0">
                            <ShipIcon className="w-5 h-5 text-[#F59E0B]" />
                          </div>
                          <div>
                            <p className="font-display font-bold text-foreground">{ticket.shipName || "Ship"}</p>
                            <p className="text-[10px] text-muted-foreground">{ticket.shipRoute}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-tight ${STATUS_STYLE[ticket.status] || "bg-muted text-muted-foreground"}`}>
                            {ticket.status}
                          </span>
                        </div>
                      </div>

                      <div className="mb-3 text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                        <span>Passenger:</span>
                        <span className="text-foreground font-bold">{ticket.passengerName || "N/A"}</span>
                      </div>

                      <div className="bg-muted/30 rounded-xl p-3 mb-4 text-xs text-center border border-muted-foreground/10">
                        <p className="text-[#F59E0B] font-semibold flex items-center justify-center gap-1.5">
                          <Wallet className="w-3.5 h-3.5" /> Reserved — pay at the counter
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-2 flex items-center justify-center gap-1 font-mono">
                          <Clock className="w-3 h-3" /> Pay by {getCounterDeadline(ticket).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center justify-center gap-1 font-mono">
                          <Clock className="w-3 h-3" /> {formatTimeLeft(getCounterDeadline(ticket))} to pay
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
                        <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /><span>{ticket.tripDate ? new Date(ticket.tripDate).toLocaleDateString() : 'N/A'}</span></div>
                        <div className="flex items-center gap-1.5 justify-end"><Ticket className="w-3.5 h-3.5" /><span>Seat {ticket.seatLabel}</span></div>
                      </div>

                      <div className="flex flex-col gap-2 border-t border-muted-foreground/10 pt-4">
                        <button
                          onClick={() => navigate(`/ticket/${ticket.id}`)}
                          className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all bg-[#B45309] text-white shadow-lg shadow-[#B45309]/20 active:scale-[0.98] hover:scale-[1.01]"
                        >
                          <Ticket className="w-4 h-4" /> View Reservation
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm("Cancel this reservation and release the seat?")) {
                              try {
                                await deleteBooking(ticket.id);
                                setTickets(prev => prev.filter(t => t.id !== ticket.id));
                              } catch (err) {
                                alert("Failed to cancel booking: " + (err instanceof Error ? err.message : "Unknown error"));
                              }
                            }
                          }}
                          className="py-2.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Cancel Reservation
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* EXPIRED TICKETS SECTION */}
            {expiredTickets.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  Expired ({expiredTickets.length})
                </h2>
                <div className="space-y-3">
                  {expiredTickets.map((ticket, i) => (
                    <motion.div key={ticket.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      className="glass-card rounded-2xl p-5 border border-zinc-500/20">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-zinc-500/10 flex items-center justify-center shrink-0">
                            <ShipIcon className="w-5 h-5 text-zinc-400" />
                          </div>
                          <div>
                            <p className="font-display font-bold text-foreground">{ticket.shipName || "Ship"}</p>
                            <p className="text-[10px] text-muted-foreground">{ticket.shipRoute}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-tight ${STATUS_STYLE[ticket.status] || "bg-muted text-muted-foreground"}`}>
                            {ticket.status}
                          </span>
                        </div>
                      </div>

                      <div className="mb-3 text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                        <span>Passenger:</span>
                        <span className="text-foreground font-bold">{ticket.passengerName || "N/A"}</span>
                      </div>

                      <div className="bg-muted/30 rounded-xl p-3 mb-4 text-xs text-center border border-muted-foreground/10">
                        {ticket.idVerificationStatus === 'rejected' ? (
                          <p className="text-zinc-400 font-semibold">
                            ID verification was not completed in time — your seat was released and the booking expired.
                          </p>
                        ) : (
                          <p className="text-zinc-400 font-semibold">
                            Payment was not completed in time — your seat was released and the booking expired.
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
                        <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /><span>{ticket.tripDate ? new Date(ticket.tripDate).toLocaleDateString() : 'N/A'}</span></div>
                        <div className="flex items-center gap-1.5 justify-end"><Ticket className="w-3.5 h-3.5" /><span>Seat {ticket.seatLabel}</span></div>
                      </div>

                      <button
                        onClick={() => navigate("/booking")}
                        className="w-full py-3 rounded-xl btn-ocean font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <Ticket className="w-4 h-4" /> Book Again
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* CONFIRMED TICKETS SECTION */}
            {confirmedTickets.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Confirmed Tickets ({confirmedTickets.length})
                </h2>
                <div className="space-y-3">
                  {confirmedTickets.map((ticket, i) => (
                    <motion.div key={ticket.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      onClick={() => navigate(`/ticket/${ticket.id}`)}
                      className="glass-card rounded-2xl p-5 cursor-pointer hover:bg-muted/10 transition-all active:scale-[0.98]">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <ShipIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-display font-bold text-foreground">{ticket.shipName || "Ship"}</p>
                            <p className="text-xs text-muted-foreground">{ticket.shipRoute}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-tight ${STATUS_STYLE[ticket.status] || "bg-muted text-muted-foreground"}`}>
                            {ticket.status}
                          </span>
                        </div>
                      </div>

                      {/* Passenger Name Display */}
                      <div className="mb-3 text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                        <span>Passenger:</span>
                        <span className="text-foreground font-bold">{ticket.passengerName || "N/A"}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {ticket.tripDate && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{new Date(ticket.tripDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</span>
                          </div>
                        )}
                        {(ticket.boardStop || ticket.alightStop) && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate">{ticket.boardStop} → {ticket.alightStop}</span>
                          </div>
                        )}
                        {ticket.seatLabel && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Ticket className="w-3.5 h-3.5" />
                            <span>Seat {ticket.seatLabel}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <QrCode className="w-3.5 h-3.5" />
                          <span className="font-mono">{ticket.qrCode}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <BottomNav />
    </div>
  );
};

export default MyTickets;