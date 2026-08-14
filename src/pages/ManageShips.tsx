import { useState, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase, cancelShipDate, generateSeatsForShip } from "@/lib/store";
import {
  ArrowLeft, Plus, Pencil, Trash2, X, Save, Loader2, AlertTriangle,
  Ship as ShipIcon, Sailboat, ChevronRight, ChevronDown, Power, ShieldAlert
} from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface Stop { location: string; arrival: string; departure: string; price: number; }
interface FormData {
  name: string; type: "ferry" | "pumpboat"; stops: Stop[];
  scheduleDays: string[]; isActive: boolean; price: number;
  seatRows: number; seatCols: number; bunkRows: number; bunkCols: number;
}

const inputCls = "w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm";
const labelCls = "text-xs text-muted-foreground mb-1.5 block font-medium";

const StopInput = memo(({ stop, index, total, onChange, onRemove }: {
  stop: Stop; index: number; total: number;
  onChange: (i: number, patch: Partial<Stop>) => void;
  onRemove: (i: number) => void;
}) => (
  <div className="border border-border rounded-xl p-3 space-y-2">
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-bold text-primary">
        {index === 0 ? "🟢 Origin" : index === total - 1 ? "🔴 Destination" : `🔵 Stop ${index + 1}`}
      </span>
      {index > 0 && index < total - 1 && (
        <button onClick={() => onRemove(index)} className="text-destructive/60 hover:text-destructive text-xs">Remove</button>
      )}
    </div>
    <input value={stop.location} onChange={(e) => onChange(index, { location: e.target.value })}
      placeholder={index === 0 ? "Origin (e.g. Romblon)" : "Stop location"} className={inputCls} />
    <div className="grid grid-cols-2 gap-2">
      {index > 0 && (
        <div><label className={labelCls}>Arrival Time</label>
          <input value={stop.arrival} onChange={(e) => onChange(index, { arrival: e.target.value })} placeholder="10:00 AM" className={inputCls} /></div>
      )}
      {index < total - 1 && (
        <div><label className={labelCls}>Departure Time</label>
          <input value={stop.departure} onChange={(e) => onChange(index, { departure: e.target.value })} placeholder="08:00 AM" className={inputCls} /></div>
      )}
    </div>
    {index > 0 && (
      <div><label className={labelCls}>Price from Origin (₱)</label>
        <input type="number" value={stop.price} onChange={(e) => onChange(index, { price: Number(e.target.value) })} placeholder="850" className={inputCls} /></div>
    )}
  </div>
));

const Section = memo(({ id, title, expanded, onToggle, children }: {
  id: string; title: string; expanded: boolean; onToggle: (id: string) => void; children: React.ReactNode;
}) => (
  <div className="border border-border rounded-xl overflow-hidden">
    <button onClick={() => onToggle(id)} className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/30 transition-colors">
      <span className="font-display font-semibold text-foreground text-sm">{title}</span>
      {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
    </button>
    {expanded && <div className="p-4 space-y-3">{children}</div>}
  </div>
));

const ManageShips = () => {
  const navigate = useNavigate();

  // Role-based access
  const adminStaff = JSON.parse(sessionStorage.getItem("adminStaff") || "{}");
  const adminRole: string = adminStaff.role || "admin";
  const allowedType: "ferry" | "pumpboat" | "all" =
    adminRole === "super_admin" ? "all" : adminRole === "ferry_admin" ? "ferry" : "pumpboat";

  const defaultType: "ferry" | "pumpboat" = allowedType === "pumpboat" ? "pumpboat" : "ferry";

  const emptyForm: FormData = {
    name: "", type: defaultType,
    stops: [{ location: "", arrival: "", departure: "", price: 0 }, { location: "", arrival: "", departure: "", price: 0 }],
    scheduleDays: ["Mon", "Wed", "Fri", "Sun"], isActive: true, price: 0,
    seatRows: 8, seatCols: 4, bunkRows: 2, bunkCols: 4,
  };

  const [ships, setShips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingShip, setEditingShip] = useState<any | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [expandedSection, setExpandedSection] = useState("basic");

  const [cancellingShip, setCancellingShip] = useState<any | null>(null);
  const [cancelDate, setCancelDate] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchShips = async () => {
    setLoading(true);
    let query = supabase.from("ships").select("*").order("name");
    
    // Filter by type if applicable
    if (allowedType !== "all") {
      query = (query as any).eq("type", allowedType);
    }

    // STRICT FILTERING: If not super_admin, only show assigned ships
    if (adminRole !== "super_admin") {
      const assignedIds = adminStaff.ship_id ? adminStaff.ship_id.split(",").map((id: string) => id.trim()) : [];
      if (assignedIds.length > 0) {
        query = (query as any).in("id", assignedIds);
      } else {
        // If no ships assigned, show nothing for safer security
        setShips([]);
        setLoading(false);
        return;
      }
    }

    const { data } = await query;
    setShips(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchShips(); }, []);

  const toggleSection = useCallback((id: string) => setExpandedSection((p) => p === id ? "" : id), []);
  const handleStopChange = useCallback((i: number, patch: Partial<Stop>) =>
    setForm((f) => ({ ...f, stops: f.stops.map((s, idx) => idx === i ? { ...s, ...patch } : s) })), []);
  const handleRemoveStop = useCallback((i: number) =>
    setForm((f) => ({ ...f, stops: f.stops.filter((_, idx) => idx !== i) })), []);
  const handleAddStop = useCallback(() =>
    setForm((f) => ({ ...f, stops: [...f.stops.slice(0, -1), { location: "", arrival: "", departure: "", price: 0 }, f.stops[f.stops.length - 1]] })), []);
  const toggleDay = useCallback((day: string) =>
    setForm((f) => ({ ...f, scheduleDays: f.scheduleDays.includes(day) ? f.scheduleDays.filter((d) => d !== day) : [...f.scheduleDays, day] })), []);

  const openAdd = () => { setEditingShip(null); setForm(emptyForm); setError(""); setExpandedSection("basic"); setShowModal(true); };
  const openEdit = (ship: any) => {
    setEditingShip(ship);
    let stops: Stop[] = [];
    try { stops = ship.stops ? JSON.parse(ship.stops) : []; } catch {}
    if (stops.length < 2) stops = [
      { location: ship.route?.split("→")[0]?.trim() || "", arrival: "", departure: ship.departure, price: 0 },
      { location: ship.route?.split("→").pop()?.trim() || "", arrival: ship.arrival, departure: "", price: ship.price },
    ];
    // Rebuild the layout controls from the ship's real capacity so saving an
    // edit never silently resets the seat/bunk layout to defaults.
    const totalBunks = Number(ship.total_bunks) || 0;
    const seatTotal = Math.max(0, (Number(ship.total_seats) || 0) - totalBunks);
    setForm({ name: ship.name, type: ship.type, stops, scheduleDays: ship.schedule_days?.split(",") || ["Mon","Wed","Fri","Sun"], isActive: ship.is_active ?? true, price: ship.price, seatRows: seatTotal > 0 ? Math.ceil(seatTotal / 4) : 8, seatCols: 4, bunkRows: totalBunks > 0 ? Math.ceil(totalBunks / 4) : 2, bunkCols: 4 });
    setError(""); setExpandedSection("basic"); setShowModal(true);
  };

  const buildRoute = () => form.stops.map((s) => s.location).filter(Boolean).join(" → ");
  const totalSeats = form.seatRows * form.seatCols;
  const totalBunks = form.bunkRows * form.bunkCols;

  const handleSave = async () => {
    const firstStop = form.stops[0], lastStop = form.stops[form.stops.length - 1];
    if (!form.name || !firstStop.location || !lastStop.location) { setError("Fill in ship name, origin and destination."); return; }
    if (form.scheduleDays.length === 0) { setError("Select at least one schedule day."); return; }
    setSaving(true); setError("");
    const shipData = {
      name: form.name, type: form.type, route: buildRoute(),
      departure: firstStop.departure || "", arrival: lastStop.arrival || "",
      price: Number(lastStop.price || form.price), total_seats: totalSeats + totalBunks,
      image: form.type === "ferry" ? "🚢" : "⛵", schedule_days: form.scheduleDays.join(","),
      is_active: form.isActive, stops: JSON.stringify(form.stops), date: new Date().toISOString().split("T")[0],
      is_confirmed: editingShip ? editingShip.is_confirmed : adminRole === "super_admin",
    };
    if (editingShip) {
      // Editing metadata must not reset the existing seat layout — keep the
      // ship's real capacity on the record.
      const { error: err } = await supabase.from("ships").update({
        ...shipData,
        total_seats: editingShip.total_seats,
        total_bunks: editingShip.total_bunks,
      }).eq("id", editingShip.id);
      if (err) { setError("Failed to update."); setSaving(false); return; }
    } else {
      const newId = `ship-${Date.now()}`;
      const { error: err } = await supabase.from("ships").insert({ id: newId, ...shipData });
      if (err) { setError("Failed to add ship."); setSaving(false); return; }
      await generateSeatsForShip(newId, totalSeats, totalBunks);
    }
    setSaving(false); setShowModal(false); fetchShips();
  };

  const handleDelete = async (ship: any) => {
    if (!confirm(`Delete "${ship.name}"?`)) return;
    setDeletingId(ship.id);
    await supabase.from("ships").delete().eq("id", ship.id);
    setDeletingId(null); fetchShips();
  };

  const toggleActive = async (ship: any) => {
    await supabase.from("ships").update({ is_active: !ship.is_active }).eq("id", ship.id);
    fetchShips();
  };

  const openCancelModal = (ship: any) => {
    setCancellingShip(ship);
    setCancelDate(new Date().toISOString().split("T")[0]);
    setCancelReason("");
  };

  const handleCancelTrip = async () => {
    if (!cancellingShip || !cancelDate) return;
    setIsCancelling(true);
    await cancelShipDate(cancellingShip.id, cancelDate, cancelReason);
    setIsCancelling(false);
    setCancellingShip(null);
    fetchShips();
    alert("Trip date cancelled and passengers notified.");
  };

  const ferries = ships.filter((s) => s.type === "ferry");
  const pumpboats = ships.filter((s) => s.type === "pumpboat");
  const pageTitle = allowedType === "all" ? "All Ships" : allowedType === "ferry" ? "🚢 Manage Ferries" : "⛵ Manage Pumpboats";

  return (
    <div className="min-h-screen px-4 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="p-2 glass-card rounded-xl hover:bg-muted/50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{pageTitle}</h1>
            <p className="text-sm text-muted-foreground">{ships.length} vessels</p>
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={openAdd}
          className="btn-ocean px-4 py-2.5 rounded-xl font-display font-semibold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add {allowedType === "pumpboat" ? "Pumpboat" : "Ferry"}
        </motion.button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : (
        <>
          {(allowedType === "all" || allowedType === "ferry") && ferries.length > 0 && (
            <div className="mb-8">
              <h2 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2"><ShipIcon className="w-4 h-4 text-primary" /> Ferries</h2>
              <div className="space-y-3">{ferries.map((s, i) => <ShipRow key={s.id} ship={s} index={i} onEdit={openEdit} onDelete={handleDelete} onToggleActive={toggleActive} deletingId={deletingId} onCancelTrip={openCancelModal} />)}</div>
            </div>
          )}
          {(allowedType === "all" || allowedType === "pumpboat") && pumpboats.length > 0 && (
            <div>
              <h2 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2"><Sailboat className="w-4 h-4 text-secondary" /> Pumpboats</h2>
              <div className="space-y-3">{pumpboats.map((s, i) => <ShipRow key={s.id} ship={s} index={i} onEdit={openEdit} onDelete={handleDelete} onToggleActive={toggleActive} deletingId={deletingId} onCancelTrip={openCancelModal} />)}</div>
            </div>
          )}
          {ships.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <ShipIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No {allowedType === "pumpboat" ? "pumpboats" : "ferries"} yet.</p>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card rounded-2xl p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-bold text-foreground text-xl">{editingShip ? "Edit Ship" : "Add New Ship"}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-muted/50 rounded-xl"><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-3">

                <Section id="basic" title="🚢 Basic Info" expanded={expandedSection === "basic"} onToggle={toggleSection}>
                  {/* Vessel type - only show if super_admin */}
                  {allowedType === "all" ? (
                    <div>
                      <label className={labelCls}>Vessel Type</label>
                      <div className="flex gap-2">
                        {(["ferry", "pumpboat"] as const).map((t) => (
                          <button key={t} onClick={() => setForm((f) => ({ ...f, type: t }))}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border capitalize transition-all ${form.type === t ? "bg-primary/20 text-primary border-primary/50" : "bg-muted/30 text-muted-foreground border-border"}`}>
                            {t === "ferry" ? "🚢" : "⛵"} {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-xl">
                      <span className="text-lg">{allowedType === "ferry" ? "🚢" : "⛵"}</span>
                      <span className="text-sm font-medium text-foreground capitalize">{allowedType} (fixed by your role)</span>
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Ship Name</label>
                    <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. MV Starhorse" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Base Price (₱)</label>
                    <input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} placeholder="850" className={inputCls} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border">
                    <div><p className="text-sm font-medium text-foreground">Ship Status</p><p className="text-xs text-muted-foreground">Turn off if stranded</p></div>
                    <button onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${form.isActive ? "bg-secondary/20 text-secondary" : "bg-muted/50 text-muted-foreground"}`}>
                      <Power className="w-4 h-4" />{form.isActive ? "Active" : "Inactive"}
                    </button>
                  </div>
                </Section>

                <Section id="route" title="📍 Route & Stops" expanded={expandedSection === "route"} onToggle={toggleSection}>
                  {form.stops.map((stop, i) => <StopInput key={i} stop={stop} index={i} total={form.stops.length} onChange={handleStopChange} onRemove={handleRemoveStop} />)}
                  {buildRoute() && (
                    <div className="flex items-center gap-1 flex-wrap px-3 py-2 rounded-lg bg-muted/20 text-sm text-foreground font-medium">
                      {form.stops.filter((s) => s.location).map((s, i, arr) => (
                        <span key={i} className="flex items-center gap-1"><span>{s.location}</span>{i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}</span>
                      ))}
                    </div>
                  )}
                  <button onClick={handleAddStop} className="w-full py-2.5 rounded-xl border border-dashed border-border text-muted-foreground text-sm hover:border-primary/50 hover:text-foreground flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Add Stop
                  </button>
                </Section>

                <Section id="schedule" title="📅 Schedule" expanded={expandedSection === "schedule"} onToggle={toggleSection}>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS.map((day) => (
                      <button key={day} onClick={() => toggleDay(day)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${form.scheduleDays.includes(day) ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 text-muted-foreground/40 border-border/30"}`}>
                        {day}
                      </button>
                    ))}
                  </div>
                  {form.scheduleDays.length > 0 && (
                    <p className="text-xs text-primary">Active: {form.scheduleDays.map((d) => DAY_FULL[DAYS.indexOf(d)]).join(", ")}</p>
                  )}
                </Section>

                <Section id="seats" title="💺 Seats" expanded={expandedSection === "seats"} onToggle={toggleSection}>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Rows</label><input type="number" min={1} max={30} value={form.seatRows} onChange={(e) => setForm((f) => ({ ...f, seatRows: Number(e.target.value) }))} className={inputCls} /></div>
                    <div><label className={labelCls}>Columns</label><input type="number" min={1} max={8} value={form.seatCols} onChange={(e) => setForm((f) => ({ ...f, seatCols: Number(e.target.value) }))} className={inputCls} /></div>
                  </div>
                  <div className="bg-muted/20 rounded-lg p-3 text-center">
                    <div className="flex flex-col items-center gap-1 max-h-24 overflow-y-auto">
                      {Array.from({ length: Math.min(form.seatRows, 5) }).map((_, r) => (
                        <div key={r} className="flex gap-1">{Array.from({ length: form.seatCols }).map((_, c) => (
                          <div key={c} className="w-7 h-7 rounded bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold flex items-center justify-center">
                            {String.fromCharCode(65 + c)}{r + 1}
                          </div>
                        ))}</div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Total: <span className="text-foreground font-bold">{totalSeats}</span></p>
                  </div>
                </Section>

                <Section id="bunks" title="🛏️ Bunk Beds" expanded={expandedSection === "bunks"} onToggle={toggleSection}>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Bunk Rows</label><input type="number" min={0} max={20} value={form.bunkRows} onChange={(e) => setForm((f) => ({ ...f, bunkRows: Number(e.target.value) }))} className={inputCls} /></div>
                    <div><label className={labelCls}>Bunk Cols</label><input type="number" min={0} max={8} value={form.bunkCols} onChange={(e) => setForm((f) => ({ ...f, bunkCols: Number(e.target.value) }))} className={inputCls} /></div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-1">Total: <span className="text-foreground font-bold">{totalBunks}</span></p>
                </Section>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-xs space-y-1">
                  <p className="font-bold text-foreground mb-1">Summary</p>
                  <div className="flex justify-between text-muted-foreground"><span>Route</span><span className="text-foreground">{buildRoute() || "Not set"}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Schedule</span><span className="text-foreground">{form.scheduleDays.join(", ")}</span></div>
                  <div className="flex justify-between font-bold border-t border-border/50 pt-1"><span>Total Capacity</span><span className="text-primary">{totalSeats + totalBunks}</span></div>
                </div>

                {error && <p className="text-destructive text-sm text-center">{error}</p>}
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={saving}
                  className="w-full py-3.5 rounded-xl btn-ocean font-display font-bold flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {saving ? "Saving..." : editingShip ? "Save Changes" : "Add Ship"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cancellingShip && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
            onClick={(e) => e.target === e.currentTarget && setCancellingShip(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="glass-card rounded-2xl p-6 w-full max-w-sm">
              <h2 className="font-display text-xl font-bold mb-4 text-destructive flex gap-2 items-center"><AlertTriangle className="w-5 h-5"/>Cancel Trip Date</h2>
              <p className="text-sm text-foreground mb-4">You are cancelling a specific trip for <span className="font-bold">{cancellingShip.name}</span>. This will notify passengers and block new bookings.</p>
              
              <label className={labelCls}>Select Date</label>
              <input type="date" value={cancelDate} onChange={e => setCancelDate(e.target.value)} className={inputCls + " mb-4"} />
              
              <label className={labelCls}>Reason for Cancellation</label>
              <input type="text" placeholder="e.g. Typhoon Warning" value={cancelReason} onChange={e => setCancelReason(e.target.value)} className={inputCls + " mb-6"} />

              <div className="flex gap-3">
                <button onClick={() => setCancellingShip(null)} disabled={isCancelling} className="flex-1 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted/50 transition-colors">Abort</button>
                <button onClick={handleCancelTrip} disabled={isCancelling || !cancelDate} className="flex-1 py-2.5 rounded-xl bg-destructive hover:bg-destructive/80 text-white font-bold transition-colors flex justify-center items-center gap-2">
                  {isCancelling ? <Loader2 className="w-4 h-4 animate-spin"/> : null}
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ShipRow = memo(({ ship, index, onEdit, onDelete, onToggleActive, deletingId, onCancelTrip }: any) => {
  const days = ship.schedule_days?.split(",") || [];
  const allDays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className={`glass-card rounded-2xl p-4 ${ship.is_active === false ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            {ship.type === "ferry" ? <ShipIcon className="w-6 h-6 text-primary" /> : <Sailboat className="w-6 h-6 text-secondary" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-display font-bold text-foreground">{ship.name}</p>
              <div className="flex gap-1.5 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${ship.is_active !== false ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500"}`}>
                  {ship.is_active !== false ? "Active" : "Inactive"}
                </span>
                {ship.is_confirmed === false && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-500 flex items-center gap-1 uppercase tracking-wider border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                    <ShieldAlert className="w-2.5 h-2.5" /> Pending Confirmation
                  </span>
                )}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{ship.route}</p>
            <p className="text-[10px] text-muted-foreground/60 font-medium">{ship.departure} → {ship.arrival} · ₱{ship.price} · {ship.total_seats} seats</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => onToggleActive(ship)} className={`p-2 rounded-xl ${ship.is_active !== false ? "text-secondary hover:bg-secondary/10" : "text-muted-foreground hover:bg-muted/30"}`}><Power className="w-4 h-4" /></button>
          <button onClick={() => onCancelTrip(ship)} title="Cancel Date" className="p-2 glass-card rounded-xl text-orange-400 hover:bg-orange-400/10"><AlertTriangle className="w-4 h-4" /></button>
          <button onClick={() => onEdit(ship)} className="p-2 glass-card rounded-xl text-primary hover:bg-primary/10"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => onDelete(ship)} disabled={deletingId === ship.id} className="p-2 glass-card rounded-xl text-destructive hover:bg-destructive/10">
            {deletingId === ship.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="flex gap-1 flex-wrap">
        {allDays.map((d) => (
          <span key={d} className={`px-2 py-0.5 rounded-md text-xs font-bold ${days.includes(d) ? "bg-primary/20 text-primary" : "bg-muted/20 text-muted-foreground/30"}`}>{d}</span>
        ))}
      </div>
    </motion.div>
  );
});

export default ManageShips;