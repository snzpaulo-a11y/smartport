import { createClient } from "@supabase/supabase-js";

// ── Date helpers ──────────────────────────────────────────────────────────────
/** Returns today's date in YYYY-MM-DD using the local timezone (avoids UTC drift). */
export function getLocalDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function getNextLocalDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Ship {
  id: string;
  name: string;
  type: "ferry" | "pumpboat";
  route: string;
  departure: string;
  arrival: string;
  date: string;
  price: number;
  totalSeats: number;
  totalBunks?: number;
  image: string;
  scheduleDays?: string;
  isActive?: boolean;
  isConfirmed?: boolean;
  stops?: string;
  cancelled_dates?: string[];
  requester_id?: string;
  requester_name?: string;
}

export interface Seat {
  id: string;
  label: string;
  type: "seat" | "bunk-upper" | "bunk-lower";
  row: number;
  col: number;
  status: "available" | "booked" | "blocked";
}

export interface Booking {
  id: string;
  shipId: string;
  seatId: string;
  seatLabel: string;
  passengerName: string;
  passengerType: "regular" | "student" | "senior" | "pwd";
  phone: string;
  status: "pending" | "paid" | "boarded" | "cancelled" | "expired" | "counter";
  qrCode: string;
  createdAt: string;
  counterDeadline?: string;
  userId?: string;
  accommodationType?: "seat" | "bunk";
  tripDate?: string;
  boardStop?: string;
  alightStop?: string;
  legPrice?: number;
  email?: string;
  idVerified?: boolean;
  verificationScore?: number;
  idImageUrl?: string;
  idVerificationStatus?: "none" | "pending" | "verified" | "rejected";
  idVerifiedAt?: string;
  idVerifiedBy?: string;
  idRejectedReason?: string;
}

export interface ScanRecord {
  id: string;
  bookingId: string;
  passengerName: string;
  passengerType: string;
  seatLabel: string;
  shipName: string;
  scannedAt: string;
  isDuplicate: boolean;
  staffId?: string;
  staffName?: string;
}

export interface ManifestHistory {
  id: string;
  shipId: string;
  shipName: string;
  tripDate: string;
  archivedAt: string;
  bookings: Booking[];
}

export type StaffRole = "super_admin" | "admin" | "scanner";

export interface Staff {
  id: string;
  name: string;
  email: string;
  password: string;
  role: StaffRole;
  createdAt: string;
  shipType?: string;
  shipIds?: string[];
}

export interface SystemLog {
  id: string;
  action: string;
  details: string;
  performedBy: string;
  performedByName: string;
  role: StaffRole;
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string | null;
  passengerName: string;
  rating: number;
  comment: string;
  surveyData: any;
  createdAt: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email, password, options: { data: { full_name: name } },
  });
  if (error) {
    // If Supabase already has this email (e.g. from a prior attempt), try signing in instead.
    if (error.message?.includes("already registered") || error.message?.includes("already been registered")) {
      return { fallbackSignIn: true } as any;
    }
    throw error;
  }
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithOtp(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
  return data;
}

export async function verifyOtp(email: string, token: string, type: "email" | "signup" | "recovery" = "email") {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;

  // Clear staff session keys so an admin/scanner logout also revokes access.
  sessionStorage.removeItem("adminStaff");
  sessionStorage.removeItem("admin_type");
  sessionStorage.removeItem("scanStaff");
}

const IPROG_API_KEY = import.meta.env.VITE_IPROG_SMS_API_KEY as string;

export async function sendIprogSMS(phone: string, message: string) {
  try {
    const formData = new URLSearchParams();
    formData.append("api_token", IPROG_API_KEY);
    // Ensure phone is starting with 0 or 63
    let formattedPhone = phone;
    if (phone.startsWith("+63")) formattedPhone = "0" + phone.slice(3);
    
    formData.append("recipient", formattedPhone);
    formData.append("phone_number", formattedPhone);
    formData.append("message", message);
    
    // Use proxy setup in vite.config.ts to avoid browser CORS issues
    // Using the correct endpoint from the iProg documentation
    const res = await fetch("/iprog-api/api/v1/sms_messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: formData.toString()
    });
    
    if (!res.ok) {
        const errorText = await res.text();
        console.error("iProg SMS API failed with status", res.status, errorText);
        throw new Error(`SMS API Error: ${res.statusText} - ${errorText}`);
    }
    
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("iProg Catch Error:", err);
    throw new Error(err.message || "Phone number might be invalid or network error.");
  }
}
const MAILTRAP_TOKEN = import.meta.env.VITE_MAILTRAP_TOKEN as string;

export async function sendMailtrapEmail(email: string, name: string, subject: string, message: string) {
  try {
    const res = await fetch("/mailtrap-api/api/send", { // Using Live Sending API
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MAILTRAP_TOKEN}` // Live API uses Authorization header
      },
      body: JSON.stringify({
        "from": { "email": "mailtrap@demomailtrap.com", "name": "SmartPort Auth" },
        "to": [{ "email": email }],
        "subject": subject,
        "text": message,
        "category": "OTP Verification"
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Mailtrap Error:", res.status, err);
      throw new Error(`Email Service Error: ${res.statusText}`);
    }

    return await res.json();
  } catch (err: any) {
    console.error("Mailtrap Catch Error:", err);
    throw new Error(err.message || "Email delivery failed.");
  }
}

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID as string;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string;
const EMAILJS_ID_APPROVAL_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_ID_APPROVAL_TEMPLATE_ID as string;
const EMAILJS_ID_REJECTION_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_ID_REJECTION_TEMPLATE_ID as string;

export async function sendEmailjsIDStatus(email: string, name: string, status: "verified" | "rejected", reason?: string) {
  try {
    const isRejected = status === "rejected";
    const templateId = isRejected
      ? (EMAILJS_ID_REJECTION_TEMPLATE_ID || "template_pff85wj")
      : (EMAILJS_ID_APPROVAL_TEMPLATE_ID || "template_d4wzqd8");
    const serviceId = isRejected
      ? (import.meta.env.VITE_EMAILJS_REJECTION_SERVICE_ID as string || "service_utkg3ph")
      : EMAILJS_SERVICE_ID;
    const publicKey = isRejected
      ? (import.meta.env.VITE_EMAILJS_REJECTION_PUBLIC_KEY as string || "Zn4om2AxW4hi59WUv")
      : EMAILJS_PUBLIC_KEY;
    if (!templateId) {
      console.warn("EmailJS Template ID missing for ID status notification.");
      return false;
    }

    const data = {
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: {
          'to_email': email,
          'email': email,
          'user_email': email,
          'to_name': name,
          'passenger_name': name,
          'status': status.toUpperCase(),
          'reason': reason || 'N/A',
          'message': status === "verified" 
            ? "Good news! Your identity has been verified. Your discount is now active, and you can proceed with your payment."
            : `Unfortunately, your identity verification was rejected. Reason: ${reason || 'Invalid ID'}. You can try uploading a new one or proceed as a regular passenger.`
      }
    };

    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    return res.ok;
  } catch (err) {
    console.error("EmailJS Status Error:", err);
    return false;
  }
}


export async function sendEmailjsOTP(email: string, otp: string, templateId?: string) {
  try {
    const data = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: templateId || EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
          'email': email,
          'to_email': email,
          'user_email': email,
          'passcode': otp,
          'otp_code': otp,
          'time': new Date(Date.now() + 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    };

    console.log("Attempting to send OTP to:", email, "via EmailJS...");
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (!res.ok) {
        const err = await res.text();
        console.error("EmailJS Error Response:", res.status, err);
        throw new Error(`Email Service rejected request: ${err}`);
    }
    
    console.log("EmailJS Success: OTP sent successfully.");
    
    return true;
  } catch (err: any) {
    console.error("EmailJS Catch Error:", err);
    throw new Error(err.message || "Email delivery failed.");
  }
}

export async function getCurrentUser() {



  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export async function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
}

// ─── Staff Auth ───────────────────────────────────────────────────────────────

/**
 * The hardened path calls SECURITY DEFINER RPCs (bcrypt verified server-side).
 * Before the migration is applied those functions don't exist yet, so we fall
 * back to the legacy table queries. After the migration, RLS denies the legacy
 * table access and only the RPC path works.
 */
function isMissingFunctionError(error: any): boolean {
  return (
    error?.code === "PGRST202" ||
    /could not find the function/i.test(error?.message || "") ||
    /function .* does not exist/i.test(error?.message || "")
  );
}

function staffFromRpc(r: any): Staff {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    password: "",
    role: (r.role as StaffRole) || "scanner",
    createdAt: r.created_at,
    shipType: r.ship_type,
    shipIds: r.ship_id ? String(r.ship_id).split(",").map((id: string) => id.trim()).filter(Boolean) : [],
  };
}

export async function staffLogin(email: string, password: string): Promise<Staff | null> {
  // 1. Prefer the server-side RPC (bcrypt verify, no password leaves the DB).
  const { data, error } = await supabase.rpc("staff_login", {
    p_email: email,
    p_password: password,
  });

  if (!error) {
    if (!data) return null;
    return staffFromRpc(data);
  }

  if (!isMissingFunctionError(error)) {
    console.error("staff_login RPC failed:", error);
    return null;
  }

  // 2. Legacy fallback (pre-migration): verify locally as before.
  const { data: legacy, error: legacyError } = await supabase
    .from("staff").select("*").eq("email", email).maybeSingle();
  if (legacyError || !legacy || legacy.password !== password) return null;
  return dbToStaff(legacy);
}

export async function getStaffList(shipType?: string): Promise<Staff[]> {
  // Prefer the RPC which never exposes password material.
  const { data, error } = await supabase.rpc("staff_list");

  if (!error) {
    const list = (Array.isArray(data) ? data : []).map(staffFromRpc);
    return shipType ? list.filter((s) => s.shipType === shipType) : list;
  }

  if (!isMissingFunctionError(error)) throw error;

  // Legacy fallback (pre-migration).
  let query = supabase.from("staff").select("*").order("created_at", { ascending: false });
  if (shipType) query = (query as any).eq("ship_type", shipType);
  const { data: legacyData, error: legacyError } = await query;
  if (legacyError) throw legacyError;
  return legacyData.map(dbToStaff);
}

function dbToStaff(s: any): Staff {
  return { 
    id: s.id, 
    name: s.name, 
    email: s.email, 
    password: s.password, 
    role: (s.role as StaffRole) || "scanner", 
    createdAt: s.created_at, 
    shipType: s.ship_type, 
    shipIds: s.ship_id ? s.ship_id.split(",").map((id: string) => id.trim()).filter(Boolean) : []
  };
}

export async function addStaff(
  name: string, email: string, password: string, 
  shipType: string = "ferry", shipIds?: string[], role: StaffRole = "scanner"
): Promise<void> {
  // Prefer the RPC (hashes the password server-side).
  const { error } = await supabase.rpc("staff_create", {
    p_name: name,
    p_email: email,
    p_password: password,
    p_ship_type: shipType,
    p_ship_ids: shipIds && shipIds.length > 0 ? shipIds : null,
    p_role: role,
  });

  if (error && !isMissingFunctionError(error)) throw error;

  if (error) {
    // Legacy fallback (pre-migration).
    const { error: legacyError } = await supabase.from("staff").insert({
      name, email, password, role, ship_type: shipType, ship_id: shipIds?.join(",") || null
    });
    if (legacyError) throw legacyError;
  }

  await addSystemLog("CREATE_STAFF", `Created ${role}: ${name} (${email})`, "System/SuperAdmin");
}

export async function updateStaffShips(staffId: string, shipIds: string[]): Promise<void> {
  const { error } = await supabase.rpc("staff_update", {
    p_id: staffId,
    p_name: null,
    p_email: null,
    p_password: null,
    p_role: null,
    p_ship_ids: shipIds.length > 0 ? shipIds : [],
  });

  if (error && !isMissingFunctionError(error)) throw error;

  if (error) {
    // Legacy fallback (pre-migration).
    const { error: legacyError } = await supabase.from("staff").update({
      ship_id: shipIds.length > 0 ? shipIds.join(",") : null
    }).eq("id", staffId);
    if (legacyError) throw legacyError;
  }

  await addSystemLog("UPDATE_STAFF", `Assigned ships to staff ${staffId}`, "System/SuperAdmin");
}

export async function updateStaff(id: string, updates: {
  name?: string; email?: string; password?: string; role?: StaffRole;
}): Promise<void> {
  const { error } = await supabase.rpc("staff_update", {
    p_id: id,
    p_name: updates.name ?? null,
    p_email: updates.email ?? null,
    p_password: updates.password ?? null,
    p_role: updates.role ?? null,
    p_ship_ids: null,
  });

  if (error && !isMissingFunctionError(error)) throw error;

  if (error) {
    // Legacy fallback (pre-migration).
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.password !== undefined) dbUpdates.password = updates.password;
    if (updates.role !== undefined) dbUpdates.role = updates.role;

    const { error: legacyError } = await supabase.from("staff").update(dbUpdates).eq("id", id);
    if (legacyError) throw legacyError;
  }

  await addSystemLog("UPDATE_STAFF", `Updated staff details for ${updates.name || id}`, "System/SuperAdmin");
}

export async function deleteStaff(id: string): Promise<void> {
  const { data: staff } = await supabase.from("staff").select("name, role").eq("id", id).maybeSingle();

  const { error } = await supabase.rpc("staff_delete", { p_id: id });
  if (error && !isMissingFunctionError(error)) throw error;

  if (error) {
    // Legacy fallback (pre-migration).
    const { error: legacyError } = await supabase.from("staff").delete().eq("id", id);
    if (legacyError) throw legacyError;
  }

  if (staff) {
    await addSystemLog("DELETE_STAFF", `Deleted ${staff.role}: ${staff.name}`, "System/SuperAdmin");
  }
}

// ─── System Logs ──────────────────────────────────────────────────────────────

export async function addSystemLog(action: string, details: string, performedBy: string): Promise<void> {
  // Try to get current staff from session if not provided
  let performerName = performedBy;
  let performerRole: StaffRole = "scanner";

  const staffJson = sessionStorage.getItem("scanStaff") || sessionStorage.getItem("adminStaff");
  if (staffJson) {
    const staff = JSON.parse(staffJson);
    performerName = staff.name;
    performerRole = staff.role;
  }

  const { error } = await supabase.from("system_logs").insert({
    action,
    details,
    performer_id: performedBy === "System/SuperAdmin" || !performedBy.includes("-") ? null : performedBy,
    performer_name: performerName,
    role: performerRole
  });
  if (error) console.error("Error adding system log:", error);
}

export async function deleteSystemLog(id: string): Promise<void> {
  const { error } = await supabase.from("system_logs").delete().eq("id", id);
  if (error) throw error;
}

export async function getSystemLogs(): Promise<SystemLog[]> {
  const { data, error } = await supabase.from("system_logs").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return data.map((l: any) => ({
    id: l.id,
    action: l.action,
    details: l.details,
    performedBy: l.performer_id || "System",
    performedByName: l.performer_name,
    role: l.role as StaffRole,
    createdAt: l.created_at
  }));
}


/**
 * Generate seat rows for a ship based on totalSeats and totalBunks.
 * Regular seats: rows 1..R, cols A..D (4 per row, 2 aisle + 2 window)
 * Bunk pairs: each pair = 1 lower (bunk-lower) + 1 upper (bunk-upper)
 * Labels: seats → "1A","1B"... bunks → lower "L1","C1"... upper "U1","D1"...
 * Uses upsert instead of delete-and-recreate so existing bookings that
 * reference seats don't violate the FK, and admin-blocked status is preserved.
 */
export async function generateSeatsForShip(
  shipId: string,
  totalSeats: number,
  totalBunks: number
): Promise<void> {
  // Existing seats (id + status) so blocked/status state is preserved across regen
  const { data: existingRows } = await supabase
    .from("seats").select("id, status").eq("ship_id", shipId);
  const existingStatus = new Map((existingRows || []).map((r: any) => [r.id, r.status]));
  const existingIds = new Set(existingStatus.keys());

  // Seat ids currently referenced by bookings — these can never be hard-deleted
  const { data: refRows } = await supabase
    .from("bookings").select("seat_id").eq("ship_id", shipId).not("seat_id", "is", null);
  const referencedIds = new Set((refRows || []).map((r: any) => r.seat_id));

  const rows: any[] = [];

  // ── Regular seats (4 per row: cols 1-4) ──
  const seatRows = Math.ceil(totalSeats / 4);
  for (let r = 1; r <= seatRows; r++) {
    const colLabels = ["A", "B", "C", "D"];
    for (let c = 0; c < 4; c++) {
      const seatNum = (r - 1) * 4 + c + 1;
      if (seatNum > totalSeats) break;
      const id = `${shipId}-seat-${r}-${c + 1}`;
      rows.push({
        id,
        ship_id: shipId,
        label: `${r}${colLabels[c]}`,
        type: "seat",
        row_num: r,
        col_num: c + 1,
        status: existingStatus.get(id) || "available",
      });
    }
  }

  // ── Bunk beds (lower + upper pairs, 2 pairs per bunk row) ──
  // Lower bunks: labels L1, L2...  Upper bunks: labels U1, U2...
  if (totalBunks > 0) {
    const bunkRowOffset = seatRows + 1;
    const bunkRowCount = Math.ceil(totalBunks / 2); // 2 pairs per row
    for (let r = 0; r < bunkRowCount; r++) {
      const rowNum = bunkRowOffset + r;
      for (let p = 0; p < 2; p++) {
        const pairNum = r * 2 + p + 1;
        if (pairNum > totalBunks) break;
        // Lower bunk
        const lowerId = `${shipId}-lower-${pairNum}`;
        rows.push({
          id: lowerId,
          ship_id: shipId,
          label: `L${pairNum}`,
          type: "bunk-lower",
          row_num: rowNum,
          col_num: p * 2 + 1,
          status: existingStatus.get(lowerId) || "available",
        });
        // Upper bunk
        const upperId = `${shipId}-upper-${pairNum}`;
        rows.push({
          id: upperId,
          ship_id: shipId,
          label: `U${pairNum}`,
          type: "bunk-upper",
          row_num: rowNum,
          col_num: p * 2 + 2,
          status: existingStatus.get(upperId) || "available",
        });
      }
    }
  }

  if (rows.length > 0) {
    // Upsert so seats already referenced by bookings are updated in place,
    // while brand-new seats get inserted — no FK / duplicate-PK errors.
    const { error } = await supabase.from("seats").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }

  // Clean up stale seats that no longer fit the new layout and aren't referenced
  const newIds = new Set(rows.map(r => r.id));
  const staleIds = [...existingIds].filter(id => !newIds.has(id) && !referencedIds.has(id));
  if (staleIds.length > 0) {
    const { error: delErr } = await supabase.from("seats").delete().in("id", staleIds);
    if (delErr) console.error("Stale seat cleanup error:", delErr);
  }
}

export async function addShip(ship: {
  name: string; type: "ferry" | "pumpboat" | "fastcraft" | "roro"; route: string;
  departure: string; arrival: string; price: number;
  totalSeats: number; totalBunks?: number; scheduleDays: string; 
  imageUrl?: string; stops?: string; isConfirmed?: boolean;
  requesterId?: string; requesterName?: string;
}): Promise<string> {
  const shipId = generateId();
  const insertData: any = {
    id: shipId,
    name: ship.name, type: ship.type, route: ship.route,
    departure: ship.departure, arrival: ship.arrival,
    price: ship.price, total_seats: ship.totalSeats,
    schedule_days: ship.scheduleDays, image_url: ship.imageUrl || null,
    stops: ship.stops || null, total_bunks: ship.totalBunks || null, is_active: false,
    is_confirmed: ship.isConfirmed ?? false,
    requester_id: ship.requesterId || null,
    requester_name: ship.requesterName || null,
    date: getLocalDate()
  };

  try {
    const { data, error } = await supabase.from("ships").insert(insertData).select("id").single();
    
    if (error) {
      console.error("Detailed Database Error:", error);
      throw new Error(`Database Error: ${error.message || 'Unknown error'}`);
    }

    if (!data) throw new Error("Connection successful but no ship ID was returned.");
    
    // Auto-generate seat rows
    await generateSeatsForShip(data.id, ship.totalSeats, ship.totalBunks || 0);
    return data.id;
  } catch (err: any) {
    console.error("Critical Connection Error in addShip:", err);
    if (err.message === 'Failed to fetch') {
      throw new Error("Network Error: Could not reach Supabase. Please check your internet or Supabase project status.");
    }
    throw err;
  }
}

export async function deleteShip(id: string): Promise<void> {
  // Manual cascade delete
  console.log("Robustly deleting ship dependencies for ID:", id);
  
  // 1. Get all bookings for this ship
  const { data: shipBookings } = await supabase.from("bookings").select("id").eq("ship_id", id);
  const bookingIds = shipBookings?.map(b => b.id) || [];
  console.log(`Found ${bookingIds.length} bookings to delete for ship ${id}`);

  // 2. Delete scan records linked to these bookings
  if (bookingIds.length > 0) {
    const { error: scErr } = await supabase.from("scan_records").delete().in("booking_id", bookingIds);
    if (scErr) console.error("Scan records deletion error:", scErr);
    else console.log("Deleted scan records for ship bookings.");
  }
  
  // 3. Delete seats
  const { error: seatErr } = await supabase.from("seats").delete().eq("ship_id", id);
  if (seatErr) console.error("Seats deletion error:", seatErr);

  // 4. Delete manifest history
  await supabase.from("manifest_history").delete().eq("ship_id", id);

  // 5. Delete bookings with verification
  const { error: bookingError } = await supabase.from("bookings").delete().eq("ship_id", id);
  if (bookingError) {
    console.error("Error deleting bookings:", bookingError);
    // SOFT DELETE FALLBACK
    console.log("Falling back to soft-delete (hiding) due to foreign key constraints.");
    await supabase.from("ships").update({ is_active: false, name: `[DEL] ${id}` }).eq("id", id);
    return;
  }

  // 6. Verify Bookings are actually gone
  const { data: remainBookings } = await supabase.from("bookings").select("id").eq("ship_id", id);
  if (remainBookings && remainBookings.length > 0) {
    console.log("Falling back to soft-delete (hiding) due to undeletable bookings.");
    await supabase.from("ships").update({ is_active: false, name: `[DEL] ${id}` }).eq("id", id);
    return;
  }

  // 7. Delete the ship itself
  const { error } = await supabase.from("ships").delete().eq("id", id);
  if (error) {
    console.error("Final ship deletion error:", error);
    console.log("Falling back to soft-delete (hiding) due to final deletion error.");
    await supabase.from("ships").update({ is_active: false, name: `[DEL] ${id}` }).eq("id", id);
    return;
  }
  console.log("Ship deleted successfully:", id);
}

export async function toggleShipActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("ships").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

export async function updateShip(id: string, updates: {
  name?: string; route?: string; departure?: string; arrival?: string;
  price?: number; totalSeats?: number; totalBunks?: number; scheduleDays?: string; stops?: string; imageUrl?: string;
}): Promise<void> {
  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.route !== undefined) dbUpdates.route = updates.route;
  if (updates.departure !== undefined) dbUpdates.departure = updates.departure;
  if (updates.arrival !== undefined) dbUpdates.arrival = updates.arrival;
  if (updates.price !== undefined) dbUpdates.price = updates.price;
  if (updates.totalSeats !== undefined) dbUpdates.total_seats = updates.totalSeats;
  if (updates.scheduleDays !== undefined) dbUpdates.schedule_days = updates.scheduleDays;
  if (updates.stops !== undefined) dbUpdates.stops = updates.stops;
  if (updates.totalBunks !== undefined) dbUpdates.total_bunks = updates.totalBunks;
  if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
  const { error } = await supabase.from("ships").update(dbUpdates).eq("id", id);
  if (error) throw error;
}

// ─── Ships ────────────────────────────────────────────────────────────────────

export async function getShips(onlyConfirmed: boolean = false): Promise<Ship[]> {
  let query = supabase.from("ships").select("*").order("name", { ascending: true });
  if (onlyConfirmed) {
    query = (query as any).eq("is_confirmed", true);
  }
  const { data, error } = await query;
  if (error) throw error;
  
  // Filter out any "soft-deleted" or hidden ships
  return data
    .filter((row: any) => !row.name.startsWith("[DEL]"))
    .map(dbToShip);
}

export async function confirmShip(id: string): Promise<void> {
  // 1. Get the ship to find the requester
  const { data: shipData } = await supabase.from("ships").select("id, requester_id").eq("id", id).single();
  
  // 2. Update the ship status
  const { error } = await supabase.from("ships").update({ is_confirmed: true }).eq("id", id);
  if (error) throw error;

  // 3. Automated Assignment: If there's a requester, add it to their staff profile
  if (shipData?.requester_id) {
    const { data: staffData } = await supabase.from("staff").select("ship_id").eq("id", shipData.requester_id).single();
    if (staffData) {
      let currentIds = staffData.ship_id ? staffData.ship_id.split(",").map((s: string) => s.trim()) : [];
      if (!currentIds.includes(id)) {
        currentIds.push(id);
        const newIdsStr = currentIds.filter(Boolean).join(",");
        await supabase.from("staff").update({ ship_id: newIdsStr }).eq("id", shipData.requester_id);
      }
    }
  }
  
  const { data: ship } = await supabase.from("ships").select("name").eq("id", id).single();
  await addSystemLog("CONFIRM_SHIP", `Confirmed vessel: ${ship?.name || id}`, "System/SuperAdmin");
}

export async function getShipById(id: string): Promise<Ship | null> {
  const { data, error } = await supabase.from("ships").select("*").eq("id", id).single();
  if (error) return null;
  return dbToShip(data);
}

function dbToShip(row: any): Ship {
  return {
    id: row.id, name: row.name, type: row.type, route: row.route,
    departure: row.departure, arrival: row.arrival, date: row.date,
    price: row.price, totalSeats: row.total_seats, image: row.image_url || row.image,
    scheduleDays: row.schedule_days, isActive: row.is_active, 
    isConfirmed: row.is_confirmed,
    stops: row.stops, totalBunks: row.total_bunks,
    cancelled_dates: row.cancelled_dates || [],
    requester_id: row.requester_id,
    requester_name: row.requester_name,
  };
}

// ─── Schedule helpers (weekly operation) ─────────────────────────────────────

export const SCHEDULE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function getScheduleDays(schedule?: string): string[] {
  if (!schedule) return [...SCHEDULE_DAYS];
  const days = schedule.split(",").map(d => d.trim()).filter(Boolean);
  if (days.length === 0 || days.includes("daily")) return [...SCHEDULE_DAYS];
  return days;
}

export function isDayOnSchedule(day: string, schedule?: string): boolean {
  return getScheduleDays(schedule).includes(day);
}

export function isOperatingToday(schedule?: string): boolean {
  return isDayOnSchedule(new Date().toLocaleDateString('en-US', { weekday: 'short' }), schedule);
}

export function formatSchedule(schedule?: string): string {
  const days = getScheduleDays(schedule);
  if (days.length >= SCHEDULE_DAYS.length) return "Daily";
  return days.join(", ");
}

// ─── Stop helpers (used by LegSelector) ──────────────────────────────────────

export interface Stop {
  location: string;
  arrival: string;
  departure: string;
  price: number;
  scheduleDays?: string;
}

export function getStopScheduleDays(ship: Ship, stop: Stop): string[] {
  const raw = stop.scheduleDays?.trim();
  if (raw) return getScheduleDays(raw);
  return [...SCHEDULE_DAYS];
}

export function getLegScheduleDays(ship: Ship, boardStop: string, alightStop: string): string[] {
  const stops = getShipStops(ship);
  const board = stops.find(s => s.location === boardStop);
  const alight = stops.find(s => s.location === alightStop);
  const boardDays = board ? getStopScheduleDays(ship, board) : [...SCHEDULE_DAYS];
  const alightDays = alight ? getStopScheduleDays(ship, alight) : [...SCHEDULE_DAYS];
  return boardDays.filter(d => alightDays.includes(d));
}

export function isLegOperating(ship: Ship, boardStop: string, alightStop: string, dateStr: string): boolean {
  const day = new Date(dateStr + "T00:00:00").toLocaleDateString('en-US', { weekday: 'short' });
  return getLegScheduleDays(ship, boardStop, alightStop).includes(day);
}

export function getShipStops(ship: Ship): Stop[] {
  if (ship.stops) {
    try { 
      const parsed = JSON.parse(ship.stops);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* fallback */ }
  }
  
  // Fallback: use route string (supports →, -, /)
  const separator = ship.route.includes("→") ? "→" : ship.route.includes("-") ? "-" : "/";
  const parts = ship.route.split(separator).map(s => s.trim()).filter(Boolean);
  
  if (parts.length >= 2) {
    return parts.map((loc, idx) => ({
      location: loc,
      arrival: idx === 0 ? "-" : (idx === parts.length - 1 ? (ship.arrival || "10:00 PM") : "-"),
      departure: idx === parts.length - 1 ? "-" : (idx === 0 ? (ship.departure || "08:00 AM") : "-"),
      price: idx === 0 ? 0 : Math.round((ship.price / (parts.length - 1)) * idx)
    }));
  } else if (parts.length === 1) {
    // Single stop fallback
    return [{ location: parts[0], arrival: "-", departure: ship.departure, price: 0 }];
  }
  
  return [];
}

export function calcLegPrice(stops: Stop[], from: string, to: string): number {
  const fromIdx = stops.findIndex((s) => s.location === from);
  const toIdx = stops.findIndex((s) => s.location === to);
  if (fromIdx === -1 || toIdx === -1 || toIdx <= fromIdx) return 0;
  return stops[toIdx].price || 0;
}

// ─── Seats ────────────────────────────────────────────────────────────────────

export async function getSeatsForShip(shipId: string): Promise<Seat[]> {
  const { data, error } = await supabase
    .from("seats").select("*").eq("ship_id", shipId)
    .order("row_num", { ascending: true }).order("col_num", { ascending: true });
  if (error) throw error;
  return data.map(dbToSeat);
}

/**
 * How long an unpaid (pending) booking may hold a seat before it expires.
 * The clock starts at admin approval (id_verified_at) for discount bookings,
 * or at booking creation (created_at) for everyone else.
 */
export const PAYMENT_WINDOW_HOURS = 3;

export function getPaymentDeadline(booking: { createdAt?: string; idVerifiedAt?: string }): Date {
  const base = booking.idVerifiedAt || booking.createdAt || new Date().toISOString();
  const d = new Date(base);
  if (isNaN(d.getTime())) {
    return new Date(Date.now() + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000);
  }
  return new Date(d.getTime() + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000);
}

// ─── Counter (pay-at-counter) hold rules ──────────────────────────────────────

/** Counter reservations release the seat 1 hour before departure. */
export const COUNTER_HOLD_HOURS_BEFORE_DEPARTURE = 1;
/** Fallback hold (24h) if departure time can't be parsed. */
export const COUNTER_FALLBACK_HOLD_HOURS = 24;
/** Absolute minimum hold so a booking made close to departure never insta-expires. */
export const COUNTER_MIN_HOLD_MINUTES = 15;

/** Parse a "h:mm AM/PM" string into a Date on the given tripDate. */
export function parseDepartureTime(departure: string, tripDate: string): Date | null {
  try {
    const [time, period] = departure.split(" ");
    const [hours, minutes] = time.split(":").map(Number);
    let h = hours;
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    const d = new Date(`${tripDate}T00:00:00`);
    d.setHours(h, minutes, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Deadline for a counter booking = departure time − COUNTER_HOLD_HOURS_BEFORE_DEPARTURE.
 * Falls back to a fixed window when departure can't be parsed, and never goes
 * below COUNTER_MIN_HOLD_MINUTES from creation.
 */
export function computeCounterDeadline(departure: string, tripDate: string, createdAt?: string): Date {
  const base = createdAt ? new Date(createdAt) : new Date();
  const departureDate = parseDepartureTime(departure, tripDate);
  if (!departureDate) {
    return new Date(base.getTime() + COUNTER_FALLBACK_HOLD_HOURS * 60 * 60 * 1000);
  }
  const deadline = new Date(departureDate.getTime() - COUNTER_HOLD_HOURS_BEFORE_DEPARTURE * 60 * 60 * 1000);
  const minDeadline = new Date(base.getTime() + COUNTER_MIN_HOLD_MINUTES * 60 * 1000);
  return deadline > minDeadline ? deadline : minDeadline;
}

/** Effective deadline for a stored counter booking (falls back to stored value). */
export function getCounterDeadline(booking: { counterDeadline?: string; createdAt?: string }): Date {
  if (booking.counterDeadline) {
    const d = new Date(booking.counterDeadline);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(Date.now() + COUNTER_FALLBACK_HOLD_HOURS * 60 * 60 * 1000);
}

export function isBookingExpired(booking: { status?: string; createdAt?: string; idVerifiedAt?: string; counterDeadline?: string }): boolean {
  if (booking.status === "pending") return getPaymentDeadline(booking).getTime() <= Date.now();
  if (booking.status === "counter") return getCounterDeadline(booking).getTime() <= Date.now();
  return false;
}

/**
 * Mark pending bookings past their payment window and counter bookings past
 * their counter deadline as "expired". Expired bookings no longer block their
 * seat (availability only counts paid/boarded/pending/counter), so the seat
 * frees up automatically.
 */
export async function expireStalePendingBookings(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("id, status, created_at, id_verified_at, counter_deadline, id_verification_status")
      .in("status", ["pending", "counter"]);
    if (error) throw error;

    const staleIds = (data || [])
      .filter((b: any) => {
        if (b.status === "counter") {
          return getCounterDeadline({ counterDeadline: b.counter_deadline, createdAt: b.created_at }).getTime() <= Date.now();
        }
        // Discount bookings awaiting ID verification aren't payable yet — their
        // payment window starts when the admin approves (id_verified_at).
        if (b.id_verification_status === "pending") return false;
        return getPaymentDeadline({ createdAt: b.created_at, idVerifiedAt: b.id_verified_at }).getTime() <= Date.now();
      })
      .map((b: any) => b.id);

    if (staleIds.length === 0) return 0;

    const { error: upErr } = await supabase
      .from("bookings")
      .update({ status: "expired" })
      .in("id", staleIds);
    if (upErr) throw upErr;

    console.log(`[expireStalePendingBookings] Marked ${staleIds.length} booking(s) as expired.`);
    return staleIds.length;
  } catch (err: any) {
    console.error("[expireStalePendingBookings] Error:", err.message);
    return 0;
  }
}

/**
 * Get seats with availability computed from PAID bookings for a specific date + leg.
 * Seats are NEVER permanently booked — availability is date-specific.
 * Pending bookings DO block seats until payment or expiry.
 */
export async function getSeatsForShipAndDate(
  shipId: string,
  tripDate: string,
  boardStop?: string,
  alightStop?: string
): Promise<Seat[]> {
  // Release seats held by bookings that outlived their payment window.
  expireStalePendingBookings();

  // Get all physical seats
  const { data: seatData, error: seatErr } = await supabase
    .from("seats").select("*").eq("ship_id", shipId)
    .order("row_num", { ascending: true }).order("col_num", { ascending: true });
  if (seatErr) throw seatErr;

  // Get PAID, BOARDED, PENDING, or COUNTER (reservations) bookings for this specific trip date
  // This ensures that reservations correctly 'mark' or hold the seat.
  const { data: bookingData } = await supabase
    .from("bookings")
    .select("seat_id, board_stop, alight_stop, status, created_at, id_verified_at, counter_deadline, id_verification_status")
    .eq("ship_id", shipId)
    .eq("trip_date", tripDate)
    .in("status", ["paid", "boarded", "pending", "counter"]);

  // Build set of taken seat IDs for this leg
  const takenSeatIds = new Set<string>();
  
  if (bookingData && bookingData.length > 0) {
    // To check overlaps correctly, we need the stop order for this ship
    const { data: shipData } = await supabase.from("ships").select("stops, route").eq("id", shipId).single();
    const stops = shipData ? getShipStops({ ...shipData } as any) : [];
    const stopMap = new Map(stops.map((s, i) => [s.location, i]));

    const newStart = boardStop ? stopMap.get(boardStop) : undefined;
    const newEnd = alightStop ? stopMap.get(alightStop) : undefined;

    for (const b of bookingData) {
      // A pending booking past its payment window does NOT hold the seat —
      // unless it's still awaiting ID verification (window starts at approval).
      if (b.status === "pending" && b.id_verification_status !== "pending" && getPaymentDeadline({ createdAt: b.created_at, idVerifiedAt: b.id_verified_at }).getTime() <= Date.now()) {
        continue;
      }
      // A counter booking past its counter deadline does NOT hold the seat either.
      if (b.status === "counter" && getCounterDeadline({ counterDeadline: b.counter_deadline, createdAt: b.created_at }).getTime() <= Date.now()) {
        continue;
      }
      if (newStart === undefined || newEnd === undefined || !b.board_stop || !b.alight_stop) {
        // Fallback: if we can't determine indices, assume overlap
        takenSeatIds.add(b.seat_id);
      } else {
        const oldStart = stopMap.get(b.board_stop);
        const oldEnd = stopMap.get(b.alight_stop);

        if (oldStart === undefined || oldEnd === undefined) {
          takenSeatIds.add(b.seat_id);
        } else {
          // Robust overlap check: [newStart, newEnd] vs [oldStart, oldEnd]
          // They overlap if they are NOT entirely separate
          const isSeparate = (newEnd <= oldStart) || (newStart >= oldEnd);
          if (!isSeparate) {
            takenSeatIds.add(b.seat_id);
          }
        }
      }
    }
  }

  return seatData.map((row: any) => {
    const base = dbToSeat(row);
    if (base.status === "blocked") return base; // admin-blocked stays blocked
    return { ...base, status: takenSeatIds.has(row.id) ? "booked" : "available" };
  });
}

function dbToSeat(row: any): Seat {
  return { id: row.id, label: row.label, type: row.type, row: row.row_num, col: row.col_num, status: row.status };
}

export async function updateSeatStatus(seatId: string, status: Seat["status"]): Promise<void> {
  const { error } = await supabase.from("seats").update({ status }).eq("id", seatId);
  if (error) throw error;
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function getBookings(): Promise<Booking[]> {
  const { data, error } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(dbToBooking);
}

export async function getBookingsByShip(shipId: string): Promise<Booking[]> {
  const { data, error } = await supabase.from("bookings").select("*")
    .eq("ship_id", shipId).order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(dbToBooking);
}

/**
 * Get bookings for a ship on a specific trip date (for manifest).
 * Only returns PAID and BOARDED bookings — pending are invisible.
 */
export async function getBookingsByShipAndDate(shipId: string, tripDate: string): Promise<Booking[]> {
  const { data, error } = await supabase.from("bookings").select("*")
    .eq("ship_id", shipId)
    .eq("trip_date", tripDate)
    .in("status", ["paid", "boarded"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(dbToBooking);
}

/**
 * Get bookings for a user — only PAID and BOARDED tickets show in history.
 */
export async function getBookingsByUser(userId: string): Promise<Booking[]> {
  const { data, error } = await supabase.from("bookings").select("*")
    .eq("user_id", userId)
    .in("status", ["paid", "boarded", "cancelled", "pending", "expired", "counter"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(dbToBooking);
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const { data, error } = await supabase.from("bookings").select("*").eq("id", id).single();
  if (error) return null;
  return dbToBooking(data);
}

export async function getBookingByQrCode(qrCode: string): Promise<Booking | null> {
  const { data, error } = await supabase.from("bookings").select("*").eq("qr_code", qrCode).single();
  if (error) return null;
  return dbToBooking(data);
}

/**
 * Find the OTHER members of a group booking. Group members are saved at the
 * same instant (same created_at) for the same ship + trip date, so scanning one
 * reservation's QR lets staff confirm the whole group at once.
 * Returns raw DB rows (snake_case), excluding the given booking, status counter.
 */
export async function getBookingSiblings(booking: { id: string; shipId?: string; tripDate?: string; createdAt?: string }): Promise<any[]> {
  if (!booking.shipId || !booking.tripDate || !booking.createdAt) return [];
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("ship_id", booking.shipId)
    .eq("trip_date", booking.tripDate)
    .eq("created_at", booking.createdAt)
    .eq("status", "counter")
    .neq("id", booking.id)
    .order("seat_label", { ascending: true });
  if (error) return [];
  return data || [];
}

export function dbToBooking(row: any): Booking {
  return {
    id: row.id, shipId: row.ship_id, seatId: row.seat_id, seatLabel: row.seat_label,
    passengerName: row.passenger_name, passengerType: row.passenger_type,
    phone: row.phone, email: row.email || undefined, status: row.status, qrCode: row.qr_code,
    createdAt: row.created_at, userId: row.user_id,
    counterDeadline: row.counter_deadline || undefined,
    accommodationType: row.accommodation_type,
    tripDate: row.trip_date,
    boardStop: row.board_stop,
    alightStop: row.alight_stop,
    legPrice: row.leg_price,
    idVerified: row.is_id_verified,
    verificationScore: row.verification_score,
    idImageUrl: row.id_image_url,
    idVerificationStatus: row.id_verification_status || "none",
    idVerifiedAt: row.id_verified_at,
    idVerifiedBy: row.id_verified_by,
    idRejectedReason: row.id_rejected_reason,
  };
}

/**
 * Save a booking — does NOT change seat status in the seats table.
 * Seats are determined available/booked by querying bookings table per date.
 * Status should be "pending" until payment confirmed.
 */
export async function saveBooking(booking: Booking): Promise<void> {
  // We use upsert now, which handles duplicates automatically based on the 'id' primary key.
  // The previous manual delete block is no longer needed and could cause race conditions.

  console.log("[saveBooking] Attempting to upsert booking:", booking.id);
  const { error } = await supabase.from("bookings").upsert({
    id: booking.id,
    ship_id: booking.shipId,
    seat_id: booking.seatId,
    seat_label: booking.seatLabel,
    passenger_name: booking.passengerName,
    passenger_type: booking.passengerType,
    phone: booking.phone,
    email: booking.email || null,
    status: booking.status,
    qr_code: booking.qrCode,
    created_at: booking.createdAt,
    counter_deadline: booking.counterDeadline || null,
    user_id: booking.userId ?? null,
    accommodation_type: booking.accommodationType ?? "seat",
    trip_date: booking.tripDate ?? getLocalDate(),
    board_stop: booking.boardStop || null,
    alight_stop: booking.alightStop || null,
    leg_price: booking.legPrice || null,
    is_id_verified: booking.idVerified ?? false,
    verification_score: booking.verificationScore || 0,
    id_image_url: booking.idImageUrl || null,
    id_verification_status: booking.idVerificationStatus || "none",
    id_verified_at: booking.idVerifiedAt || null,
    id_verified_by: booking.idVerifiedBy || null,
    id_rejected_reason: booking.idRejectedReason || null,
  });
  
  if (error) {
    console.error("[saveBooking] Error:", error);
    throw error;
  }
  console.log("[saveBooking] Success for:", booking.id);
}

export async function updateBooking(id: string, updates: Partial<Booking>): Promise<void> {
  const dbUpdates: any = {};
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.seatLabel) dbUpdates.seat_label = updates.seatLabel;
  if (updates.counterDeadline !== undefined) dbUpdates.counter_deadline = updates.counterDeadline;
  const { error } = await supabase.from("bookings").update(dbUpdates).eq("id", id);
  if (error) throw error;
}

/**
 * Mark bookings as reserved-for-counter (held seat, pay at the terminal counter).
 * Sets status = 'counter' and the counter deadline that gates seat release.
 */
export async function markBookingsCounter(ids: string[], deadline: Date): Promise<void> {
  const { error } = await supabase.from("bookings").update({
    status: "counter",
    counter_deadline: deadline.toISOString(),
  }).in("id", ids);
  if (error) throw error;
}

export async function deleteBooking(id: string): Promise<void> {
  // Soft delete: detach from the user AND mark as cancelled so the seat is
  // freed and the booking disappears from the admin reservations list.
  // (Hard Delete is blocked by RLS, so we never physically remove the row.)
  const { error } = await supabase.from("bookings").update({ user_id: null, status: "cancelled" }).eq("id", id);

  if (error) {
    console.error("[deleteBooking] Soft Delete Error:", error);
    // If even updating user_id is blocked, we throw the error.
    throw error;
  }
}

// ─── Scan Records (per staff) ─────────────────────────────────────────────────

/**
 * Get scan history for a specific staff member only.
 */
export async function getScanHistory(staffId?: string): Promise<ScanRecord[]> {
  let query = supabase.from("scan_records").select("*").order("scanned_at", { ascending: false });
  if (staffId) query = (query as any).eq("staff_id", staffId);
  const { data, error } = await query;
  if (error) throw error;
  return data.map(dbToScanRecord);
}

function dbToScanRecord(row: any): ScanRecord {
  return {
    id: row.id, bookingId: row.booking_id, passengerName: row.passenger_name,
    passengerType: row.passenger_type, seatLabel: row.seat_label,
    shipName: row.ship_name, scannedAt: row.scanned_at, isDuplicate: row.is_duplicate,
    staffId: row.staff_id, staffName: row.staff_name,
  };
}

// ─── Identity Verification ────────────────────────────────────────────────────

export async function uploadIDImage(bookingId: string, fileBlob: Blob): Promise<string> {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(fileBlob.type)) {
    throw new Error("Unsupported file type. Please upload a JPG, PNG, or WebP image.");
  }
  if (fileBlob.size > 5 * 1024 * 1024) {
    throw new Error("Image is too large. Please upload a file under 5MB.");
  }

  const ext = fileBlob.type === "image/png" ? "png" : fileBlob.type === "image/webp" ? "webp" : "jpg";
  // Unguessable random object key so ID images can't be enumerated by booking id.
  const fileName = `${crypto.randomUUID().replace(/-/g, "")}_${Date.now()}.${ext}`;

  console.log(`[Storage] Attempting upload to bucket 'id-verifications' with name: ${fileName}`);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("id-verifications")
    .upload(fileName, fileBlob, { 
      contentType: fileBlob.type,
      cacheControl: "3600",
      upsert: false
    });

  if (uploadError) {
    console.error("[Storage Error]", uploadError);
    // Provide a more helpful error if it looks like a missing bucket
    if (uploadError.message.includes("not found") || uploadError.message.includes("does not exist")) {
      throw new Error("Bucket 'id-verifications' not found. Please create it in Supabase Storage.");
    }
    throw uploadError;
  }

  const { data } = supabase.storage.from("id-verifications").getPublicUrl(fileName);
  return data.publicUrl;
}

export async function updateIDVerificationStatus(
  bookingId: string, 
  status: "verified" | "rejected",
  isVerified: boolean,
  reason?: string,
  adminId?: string
): Promise<void> {
  const updates: any = { 
    id_verification_status: status,
    is_id_verified: isVerified,
    id_verified_at: status === "verified" ? new Date().toISOString() : null,
    id_verified_by: adminId || null,
    id_rejected_reason: reason || null
  };

  // On rejection, downgrade to regular fare (remove discount).
  if (status === "rejected") {
    updates.passenger_type = "regular";
  }

  const { error } = await supabase.from("bookings")
    .update(updates)
    .eq("id", bookingId);
  
  if (error) throw error;

  // Trigger EmailJS Notification (Async)
  const { data: booking } = await supabase.from("bookings").select("passenger_name, phone, user_id, email").eq("id", bookingId).single();
  if (booking) {
    // Find the passenger's email — try multiple fallbacks.
    let email = booking.email as string | undefined;

    // Fallback: look for an email on any other booking by the same user.
    if (!email && booking.user_id) {
      const { data: otherBooking } = await supabase
        .from("bookings")
        .select("email")
        .eq("user_id", booking.user_id)
        .not("email", "is", null)
        .limit(1)
        .maybeSingle();
      email = otherBooking?.email as string | undefined;
    }

    // Last resort: try admin API (requires service role key).
    if (!email && booking.user_id) {
      const { data: userData } = await supabase.auth.admin.getUserById(booking.user_id).catch(() => ({ data: { user: null } }));
      email = userData?.user?.email as string | undefined;
    }

    if (email) {
      sendEmailjsIDStatus(email, booking.passenger_name, status, reason);
    } else {
      console.warn("[updateIDVerificationStatus] No email found for booking", bookingId, "— email notification skipped.");
    }
  }
}

export async function updateBookingToRegular(bookingId: string, fullPrice: number): Promise<void> {
  const { error } = await supabase.from("bookings")
    .update({ 
      passenger_type: "regular",
      leg_price: fullPrice,
      id_verification_status: "none",
      is_id_verified: false,
      id_rejected_reason: null
    })
    .eq("id", bookingId);
  
  if (error) throw error;
}

export async function addScanRecord(record: ScanRecord): Promise<void> {
  const { error } = await supabase.from("scan_records").insert({
    id: record.id, booking_id: record.bookingId, passenger_name: record.passengerName,
    passenger_type: record.passengerType, seat_label: record.seatLabel,
    ship_name: record.shipName, scanned_at: record.scannedAt, is_duplicate: record.isDuplicate,
    staff_id: record.staffId ?? null, staff_name: record.staffName ?? null,
  });
  if (error) throw error;
}

/**
 * Clear scan history for a specific staff member.
 */
export async function clearScanHistory(staffId: string): Promise<void> {
  await supabase.from("scan_records").delete().eq("staff_id", staffId);
}

// ─── Manifest History ─────────────────────────────────────────────────────────

export async function getManifestHistory(): Promise<ManifestHistory[]> {
  const { data, error } = await supabase.from("manifest_history").select("*")
    .order("archived_at", { ascending: false });
  if (error) throw error;
  return data.map((row: any) => ({
    id: row.id, shipId: row.ship_id, shipName: row.ship_name,
    tripDate: row.trip_date, archivedAt: row.archived_at, bookings: row.bookings,
  }));
}

/**
 * Archive manifest for a specific trip date (called manually or when date passes).
 * Archives all PAID/BOARDED bookings for a given ship + date.
 */
export async function archiveManifestForDate(
  shipId: string,
  shipName: string,
  tripDate: string
): Promise<boolean> {
  // Check if already archived
  const { data: existing } = await supabase.from("manifest_history").select("id")
    .eq("ship_id", shipId).eq("trip_date", tripDate).maybeSingle();
  if (existing) return false;

  // Get all paid/boarded bookings for this date
  const bookings = await getBookingsByShipAndDate(shipId, tripDate);
  if (bookings.length === 0) return false;

  const { error } = await supabase.from("manifest_history").insert({
    id: `${shipId}-${tripDate}-${Date.now()}`,
    ship_id: shipId, ship_name: shipName,
    trip_date: tripDate, bookings,
  });
  if (error) throw error;

  // Remove those bookings from active bookings
  const ids = bookings.map((b) => b.id);
  const { error: deleteError } = await supabase.from("bookings").delete().in("id", ids);
  if (deleteError) throw deleteError;
  return true;
}

/**
 * Auto-archive manifests for past dates (yesterday and earlier).
 */
export async function autoArchivePastManifests(ships: Ship[]): Promise<void> {
  const today = getLocalDate();
  for (const ship of ships) {
    // Get distinct trip dates for this ship that are before today
    const { data } = await supabase.from("bookings").select("trip_date")
      .eq("ship_id", ship.id).in("status", ["paid", "boarded"]).lt("trip_date", today);
    if (!data) continue;
    const dates = [...new Set(data.map((r: any) => r.trip_date).filter(Boolean))];
    for (const date of dates) {
      await archiveManifestForDate(ship.id, ship.name, date);
    }
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Check if a specific stop has departed on a given trip date.
 * Uses local time to compare against stop's departure.
 */
export function isStopDeparted(stop: Stop, tripDate: string): boolean {
  if (!stop || !stop.departure) return false;
  
  const now = new Date();
  const todayStr = getLocalDate();
  
  // If the trip is in the future, it definitely hasn't departed
  if (tripDate > todayStr) return false;
  // If the trip was in the past, it's already departed
  if (tripDate < todayStr) return true;
  
  // Same day: parse the departure time (e.g., "08:00 AM" or "08:00 am")
  try {
    const [time, periodRaw] = stop.departure.trim().split(/\s+/);
    const period = (periodRaw || "").toUpperCase();
    const [hours, minutes] = time.split(":").map(Number);
    let h = hours;
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    
    const departureDate = new Date(`${tripDate}T00:00:00`);
    departureDate.setHours(h, minutes, 0, 0);
    
    // Add small buffer if needed (e.g., 5 mins)
    return now >= departureDate;
  } catch (e) {
    console.error("Error parsing stop departure time:", stop.departure, e);
    return false;
  }
}

// ─── Trip Cancellation ────────────────────────────────────────────────────────

export async function sendSimulatedCancellationEmail(bookingId: string, email: string, passengerName: string, reason: string) {
  console.log(`\n\n========================================
[MOCK EMAIL SENT via SUPABASE/RESEND]
To: ${email}
Subject: URGENT: Trip Cancellation for Booking ${bookingId}

Dear ${passengerName},

We regret to inform you that your upcoming trip has been cancelled.
Reason: ${reason || 'Operational issues / Bad weather'}

Your booking ID is: ${bookingId}.
Please contact Port Support to arrange a re-booking or to request a full refund via PayMongo.
========================================\n\n`);
}

export async function cancelShipDate(shipId: string, date: string, reason: string) {
  const { data: shipData } = await supabase.from("ships").select("cancelled_dates").eq("id", shipId).single();
  
  const currentCancelled: string[] = shipData?.cancelled_dates || [];
  if (!currentCancelled.includes(date)) {
    const { error } = await supabase.from("ships").update({ cancelled_dates: [...currentCancelled, date] }).eq("id", shipId);
    if (error) console.error("Error updating cancelled dates:", error);
  }

  const { data: affectedBookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("ship_id", shipId)
    .eq("trip_date", date)
    .in("status", ["paid", "pending", "counter"]);

  if (affectedBookings && affectedBookings.length > 0) {
    const bookingIds = affectedBookings.map((b: any) => b.id);
    await supabase.from("bookings").update({ status: "cancelled" }).in("id", bookingIds);

    for (const b of affectedBookings) {
      await sendSimulatedCancellationEmail(b.id, "(Passenger Email)", b.passenger_name, reason);
    }
  }
}

// ─── Reviews & Feedback ───────────────────────────────────────────────────────

export async function submitReview(review: {
  bookingId?: string;
  passengerName: string;
  rating: number;
  comment?: string;
  surveyData?: any;
}): Promise<void> {
  const { error } = await supabase.from("reviews").insert({
    booking_id: review.bookingId,
    passenger_name: review.passengerName,
    rating: review.rating,
    comment: review.comment,
    survey_data: review.surveyData,
  });
  if (error) throw error;
}

export async function getReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data.map((r: any) => ({
    id: r.id,
    bookingId: r.booking_id,
    passengerName: r.passenger_name,
    rating: r.rating,
    comment: r.comment,
    surveyData: r.survey_data,
    createdAt: r.created_at,
  }));
}

export async function getReviewsByShip(shipId: string): Promise<Review[]> {
  try {
    // Attempt join - requires foreign key relationship in Supabase
    const { data, error } = await supabase
      .from("reviews")
      .select("*, bookings!inner(ship_id)")
      .eq("bookings.ship_id", shipId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return data.map((r: any) => ({
      id: r.id,
      bookingId: r.booking_id,
      passengerName: r.passenger_name,
      rating: r.rating,
      comment: r.comment,
      surveyData: r.survey_data,
      createdAt: r.created_at,
    }));
  } catch (err) {
    console.error("Join fetch for reviews failed, using manual filter:", err);
    // Manual fallback: Get all reviews and correlate (less efficient but safe)
    const all = await getReviews();
    
    // Get all bookings for this ship to filter reviews
    const { data: shipBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("ship_id", shipId);
    
    if (!shipBookings) return [];
    const shipBookingIds = new Set(shipBookings.map(b => b.id));
    
    return all.filter(r => r.bookingId && shipBookingIds.has(r.bookingId));
  }
}

export async function hasReviewForBooking(bookingId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", bookingId)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 is 'no rows found'
    console.error("Error checking review status:", error);
    return false;
  }
  
  return !!data;
}