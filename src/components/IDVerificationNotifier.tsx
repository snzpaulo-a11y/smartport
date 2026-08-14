import { useEffect } from "react";
import { supabase, expireStalePendingBookings } from "@/lib/store";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

export const IDVerificationNotifier = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Release seats for unpaid bookings that outlived their payment window.
    expireStalePendingBookings();
    const sweepInterval = setInterval(() => expireStalePendingBookings(), 60000);
    return () => clearInterval(sweepInterval);
  }, []);

  useEffect(() => {
    // 1. Request Browser Notification Permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          console.log("Push notifications enabled for SmartPort ID Verification!");
        }
      });
    }

    // 2. Subscribe to Realtime updates on the bookings table
    const channel = supabase
      .channel("global-id-verification-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
        },
        (payload) => {
          const newRecord = payload.new;
          const oldRecord = payload.old;

          // Check if id_verification_status changed
          if (
            !newRecord ||
            newRecord.id_verification_status === oldRecord?.id_verification_status
          ) {
            return;
          }

          const bookingId = newRecord.id;

          // Only notify when this booking belongs to the current user (or the
          // current session). Other passengers' PII must never reach this device.
          void supabase.auth.getUser().then(({ data: auth }) => {
            const currentUid = auth?.user?.id || null;
            const bookingOwnerId = newRecord.user_id || null;
            const isOwner = Boolean(currentUid) && bookingOwnerId === currentUid;
            const isSessionBooking =
              sessionStorage.getItem("current_booking_id") === bookingId;
            if (!isOwner && !isSessionBooking) return;

            const status = newRecord.id_verification_status;
            const passengerName = newRecord.passenger_name || "Passenger";
            const shipId = newRecord.ship_id;
            const seatId = newRecord.seat_id;

            if (status === "verified") {
              const title = "ID Verified!";
              const body = `Great news ${passengerName}! Your discount ID has been approved by the Admin. You can now complete your payment.`;

              // Trigger Native Push Notification if permitted
              if ("Notification" in window && Notification.permission === "granted") {
                try {
                  new Notification(title, {
                    body,
                    icon: "/favicon.ico",
                    tag: `id-verified-${bookingId}`,
                  });
                } catch (e) {
                  console.warn("Could not trigger browser push notification:", e);
                }
              }

              // Display In-App Toast
              toast.custom(
                (t) => (
                  <div className="bg-[#131B24] border border-green-500/40 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 text-white max-w-sm w-full">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-green-400">{title}</h4>
                        <p className="text-xs text-[#8895A7] mt-0.5">{body}</p>
                      </div>
                    </div>
                    {shipId && seatId && (
                      <button
                        onClick={() => {
                          toast.dismiss(t);
                          navigate(`/payment/${shipId}/${seatId}`, {
                            state: {
                              bookingId,
                              name: newRecord.passenger_name,
                              phone: newRecord.phone,
                              email: newRecord.email,
                              passengerType: newRecord.passenger_type,
                              price: newRecord.leg_price,
                              idVerificationStatus: "verified",
                              idVerified: true,
                            },
                          });
                        }}
                        className="w-full py-2.5 bg-green-500 hover:bg-green-400 text-black font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" /> Proceed to Payment
                      </button>
                    )}
                  </div>
                ),
                { duration: 10000 }
              );
            } else if (status === "rejected") {
              const reason = newRecord.id_rejected_reason || "ID document unreadable or invalid";
              const title = "ID Verification Rejected";
              const body = `Hi ${passengerName}, your discount ID request was rejected: ${reason}`;

              // Trigger Native Push Notification if permitted
              if ("Notification" in window && Notification.permission === "granted") {
                try {
                  new Notification(title, {
                    body,
                    icon: "/favicon.ico",
                    tag: `id-rejected-${bookingId}`,
                  });
                } catch (e) {
                  console.warn("Could not trigger browser push notification:", e);
                }
              }

              // Display In-App Toast
              toast.custom(
                (t) => (
                  <div className="bg-[#131B24] border border-red-500/40 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 text-white max-w-sm w-full">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                        <XCircle className="w-6 h-6 text-red-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-red-400">{title}</h4>
                        <p className="text-xs text-[#8895A7] mt-0.5">{body}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        toast.dismiss(t);
                        navigate("/my-tickets");
                      }}
                      className="w-full py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-colors"
                    >
                      View Ticket Status
                    </button>
                  </div>
                ),
                { duration: 10000 }
              );
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  return null;
};
