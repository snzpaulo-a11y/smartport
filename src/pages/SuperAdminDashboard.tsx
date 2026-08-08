import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  getStaffList, 
  getSystemLogs, 
  deleteStaff, 
  addStaff, 
  updateStaffShips,
  getShips,
  confirmShip,
  updateShip,
  deleteShip,
  toggleShipActive,
  cancelShipDate,
  updateStaff,
  getReviews,
  Staff, 
  SystemLog, 
  Ship,
  Review,
  StaffRole 
} from "@/lib/store";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  Settings,
  LogOut,
  UserPlus,
  Trash2,
  X,
  Eye,
  EyeOff,
  Activity,
  CheckCircle2,
  XCircle,
  Key,
  Ship as ShipIcon,
  Search,
  RefreshCw,
  AlertTriangle,
  Pencil,
  Power,
  ChevronRight,
  ShieldCheck,
  Lock,
  MessageSquare,
  Star as StarIcon
} from "lucide-react";

type AuthTab = "overview" | "admins" | "ships" | "audit" | "reviews" | "settings";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AuthTab>("overview");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin Create Form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newShipType, setNewShipType] = useState("ferry");
  const [newPaymongoSecret, setNewPaymongoSecret] = useState("");
  const [newPaymongoPublic, setNewPaymongoPublic] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [formMsg, setFormMsg] = useState("");
  const [creating, setCreating] = useState(false);

  // Ship Assignment Modal
  const [assignAdminId, setAssignAdminId] = useState<string | null>(null);
  const [selectedShipIds, setSelectedShipIds] = useState<string[]>([]);
  const [assigningLoading, setAssigningLoading] = useState(false);
  const [ships, setShips] = useState<Ship[]>([]);

  // Ship Create Form
  const [showShipCreate, setShowShipCreate] = useState(false);
  const [newShipModel, setNewShipModel] = useState<any>({ name: "", type: "ferry", route: "", departure: "", arrival: "", price: 100, totalSeats: 100 });
  const [creatingShip, setCreatingShip] = useState(false);
  const [shipFormMsg, setShipFormMsg] = useState("");
  
  // Audit Search
  const [auditSearch, setAuditSearch] = useState("");
  
  // Admin Editing
  const [showAdminEdit, setShowAdminEdit] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Staff | null>(null);
  
  // Ship Editing & Cancellation
  const [showShipEdit, setShowShipEdit] = useState(false);
  const [editingShip, setEditingShip] = useState<Ship | null>(null);
  const [cancellingShip, setCancellingShip] = useState<Ship | null>(null);
  const [cancelDate, setCancelDate] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Settings
  const [newAdminPass, setNewAdminPass] = useState("");
  const [settingsMsg, setSettingsMsg] = useState("");

  useEffect(() => {
    const adminStaffStr = sessionStorage.getItem("adminStaff");
    if (!adminStaffStr) {
      navigate("/admin-login");
      return;
    }
    const currentStaff = JSON.parse(adminStaffStr);
    if (currentStaff.role !== "super_admin") {
      navigate("/admin-login");
      return;
    }

    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const staffData = await getStaffList();
      setStaff(staffData);
      
      const logsData = await getSystemLogs();
      setLogs(logsData);
      
      const shipsData = await getShips();
      setShips(shipsData);

      const reviewsData = await getReviews();
      setReviews(reviewsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("adminStaff");
    sessionStorage.removeItem("admin_type");
    navigate("/");
  };

  const handleCreateAdmin = async () => {
    if (!newName || !newEmail || !newPass) {
      setFormMsg("Please fill all fields");
      return;
    }
    setCreating(true);
    try {
      // Pass the new ship type and paymongo keys to addStaff
      await addStaff(newName, newEmail, newPass, newShipType, undefined, "admin", newPaymongoSecret, newPaymongoPublic);
      setFormMsg("Admin created successfully!");
      setNewName(""); setNewEmail(""); setNewPass("");
      setNewShipType("ferry");
      setNewPaymongoSecret(""); setNewPaymongoPublic("");
      fetchData();
      setTimeout(() => setShowCreate(false), 1500);
    } catch (e: any) {
      setFormMsg(e.message || "Failed to create admin");
    } finally {
      setCreating(false);
    }
  };

  const manageAccounts = staff.filter(s => s.role === "admin" || s.role === "super_admin");

  const handleAssignShips = async () => {
    if (!assignAdminId) return;
    setAssigningLoading(true);
    try {
      await updateStaffShips(assignAdminId, selectedShipIds);
      await fetchData();
      setAssignAdminId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setAssigningLoading(false);
    }
  };

  const handleCreateShip = async () => {
    if (!newShipModel.name || !newShipModel.route || !newShipModel.departure || !newShipModel.arrival) {
      setShipFormMsg("Please fill in all core fields!");
      return;
    }
    setCreatingShip(true);
    try {
      const { addShip } = await import("@/lib/store");
      await addShip({
        name: newShipModel.name,
        type: newShipModel.type,
        route: newShipModel.route,
        departure: newShipModel.departure,
        arrival: newShipModel.arrival,
        price: Number(newShipModel.price),
        totalSeats: Number(newShipModel.totalSeats),
        scheduleDays: "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
        isConfirmed: true // Super Admin ships are auto-confirmed
      });
      setShipFormMsg("Ship physically instantiated successfully!");
      await fetchData();
      setTimeout(() => setShowShipCreate(false), 1500);
    } catch(e: any) {
      setShipFormMsg(e.message || "Failed to instantiate fleet.");
    } finally {
      setCreatingShip(false);
    }
  };

  const handleConfirmShip = async (id: string) => {
    try {
      await confirmShip(id);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleShip = async (id: string, active: boolean) => {
    try {
      await toggleShipActive(id, !active);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteShip = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vessel? This action is permanent.")) return;
    try {
      await deleteShip(id);
      await fetchData();
    } catch (e: any) {
      console.error(e);
      alert("Could not delete vessel: " + (e.message || "Unknown error"));
    }
  };

  const handleCancelTrip = async () => {
    if (!cancellingShip || !cancelDate) return;
    setIsCancelling(true);
    try {
      await cancelShipDate(cancellingShip.id, cancelDate, cancelReason);
      setCancellingShip(null);
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newAdminPass) return;
    try {
      const { supabase } = await import("@/lib/store");
      const adminStaffStr = sessionStorage.getItem("adminStaff");
      if (!adminStaffStr) return;
      const currentStaff = JSON.parse(adminStaffStr);
      
      const { error } = await supabase.from("staff").update({ password: newAdminPass }).eq("id", currentStaff.id);
      if (error) throw error;
      
      setSettingsMsg("Password updated successfully!");
      setNewAdminPass("");
      setTimeout(() => setSettingsMsg(""), 3000);
    } catch (e: any) {
      setSettingsMsg(e.message || "Failed to update password");
    }
  };

  const handleEditAdmin = async () => {
    if (!editingAdmin) return;
    try {
      await updateStaff(editingAdmin.id, {
        name: editingAdmin.name,
        email: editingAdmin.email,
        password: editingAdmin.password,
        role: editingAdmin.role
      });
      setShowAdminEdit(false);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
    l.performedByName.toLowerCase().includes(auditSearch.toLowerCase()) ||
    l.details.toLowerCase().includes(auditSearch.toLowerCase())
  );

  const pendingShips = ships.filter(s => !s.isConfirmed);
  const confirmedShips = ships.filter(s => s.isConfirmed);

  return (
    <div className="min-h-screen bg-[#0F1219] text-white flex">
      {/* ── SIDEBAR ── */}
      <div className="w-64 bg-[#11161D] border-r border-white/5 flex flex-col shrink-0 min-h-screen">
        <div className="p-6 flex items-center gap-3 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-[#3F70FF] flex items-center justify-center text-white">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h1 className="font-bold text-lg tracking-wide text-[#F8FAFC]">SuperAdmin</h1>
        </div>

        <div className="p-4 flex-1">
          <p className="text-[10px] font-bold text-white/40 tracking-[0.2em] mb-4 uppercase px-2">Platform</p>
          <div className="space-y-1">
            <button onClick={() => setActiveTab("overview")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "overview" ? "bg-[#3F70FF]/15 text-[#3F70FF]" : "text-[#94A3B8] hover:text-white hover:bg-white/5"}`}>
              <LayoutDashboard className="w-4 h-4" /> Overview
            </button>
            <button onClick={() => setActiveTab("admins")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "admins" ? "bg-[#3F70FF]/15 text-[#3F70FF]" : "text-[#94A3B8] hover:text-white hover:bg-white/5"}`}>
              <Users className="w-4 h-4" /> Admins
            </button>
            <button onClick={() => setActiveTab("ships")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "ships" ? "bg-[#3F70FF]/15 text-[#3F70FF]" : "text-[#94A3B8] hover:text-white hover:bg-white/5"}`}>
              <ShipIcon className="w-4 h-4" /> Ships & Access
            </button>
            <button onClick={() => setActiveTab("audit")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "audit" ? "bg-[#3F70FF]/15 text-[#3F70FF]" : "text-[#94A3B8] hover:text-white hover:bg-white/5"}`}>
              <Activity className="w-4 h-4" /> Audit Log
            </button>
            <button onClick={() => setActiveTab("reviews")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "reviews" ? "bg-[#3F70FF]/15 text-[#3F70FF]" : "text-[#94A3B8] hover:text-white hover:bg-white/5"}`}>
              <MessageSquare className="w-4 h-4" /> Reviews
            </button>
            <button onClick={() => setActiveTab("settings")} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "settings" ? "bg-[#3F70FF]/15 text-[#3F70FF]" : "text-[#94A3B8] hover:text-white hover:bg-white/5"}`}>
              <Settings className="w-4 h-4" /> Settings
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0 max-h-screen overflow-y-auto">
        
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-end px-8 shrink-0 bg-[#0F1219]">
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold text-[#F8FAFC]">System Root</p>
              <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">Owner</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#1A222C] flex items-center justify-center font-bold text-[#4F84FF] border border-white/10 text-sm tracking-wider">
              SR
            </div>
            <button onClick={handleLogout} className="ml-2 p-2 text-[#94A3B8] hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-8 max-w-5xl w-full">
          
          {loading ? (
             <div className="flex items-center justify-center p-20">
               <div className="w-8 h-8 rounded-full border-2 border-[#3F70FF] border-t-transparent animate-spin" />
             </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-[1.75rem] font-bold text-[#F8FAFC] tracking-tight">Dashboard</h2>
                      <p className="text-[#94A3B8] text-sm mt-1">Platform overview and recent activity.</p>
                    </div>
                    <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-[#3F70FF] hover:bg-[#5280FF] text-white rounded-lg text-sm font-medium transition-colors border border-[#3F70FF]/50 shadow-[0_0_20px_rgba(63,112,255,0.2)]">
                      Create Admin
                    </button>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-[#151A22] border border-white/5 rounded-2xl p-5">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-[#94A3B8] text-xs font-semibold">Total Admins</p>
                        <Users className="w-4 h-4 text-[#94A3B8]" />
                      </div>
                      <p className="text-3xl font-bold text-[#F8FAFC]">{staff.filter(s => s.role !== 'scanner').length}</p>
                    </div>
                    <div className="bg-[#151A22] border border-white/5 rounded-2xl p-5">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-[#94A3B8] text-xs font-semibold">Active Scanners</p>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                      <p className="text-3xl font-bold text-[#F8FAFC]">{staff.filter(s => s.role === 'scanner').length}</p>
                    </div>
                    <div className="bg-[#151A22] border border-white/5 rounded-2xl p-5">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-[#94A3B8] text-xs font-semibold">System Logs</p>
                        <Activity className="w-4 h-4 text-rose-500" />
                      </div>
                      <p className="text-3xl font-bold text-[#F8FAFC]">{logs.length}</p>
                    </div>
                    <div className="bg-[#151A22] border border-white/5 rounded-2xl p-5">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-[#94A3B8] text-xs font-semibold">Total Permissions</p>
                        <Key className="w-4 h-4 text-[#3F70FF]" />
                      </div>
                      <p className="text-3xl font-bold text-[#F8FAFC]">4</p>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-[#151A22] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-white/5 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-[#F8FAFC] text-base">Recent Activity</h3>
                        <p className="text-[#94A3B8] text-xs mt-0.5">Latest actions by admins</p>
                      </div>
                      <Activity className="w-4 h-4 text-[#94A3B8]" />
                    </div>
                    <div className="divide-y divide-white/5">
                      {logs.slice(0, 8).map((log) => (
                        <div key={log.id} className="p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                          <div className="w-8 h-8 rounded-full bg-[#1A222C] border border-white/10 flex items-center justify-center text-xs font-bold text-[#94A3B8] shrink-0">
                            {log.performedByName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#F8FAFC]">
                              <span className="font-bold">{log.performedByName}</span>
                              <span className="text-[#94A3B8] mx-1">{log.action.toLowerCase().replace(/_/g, " ")}</span>
                              <span className="text-white/80">{log.details.split(":")[0]}</span>
                            </p>
                            <p className="text-xs text-[#94A3B8] mt-0.5">
                              {new Date(log.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      {logs.length === 0 && (
                        <div className="p-8 text-center text-[#94A3B8] text-sm">No recent activity</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ADMINS TAB */}
              {activeTab === "admins" && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-[1.75rem] font-bold text-[#F8FAFC] tracking-tight">Admin Accounts</h2>
                      <p className="text-[#94A3B8] text-sm mt-1">Manage platform administrators and their permissions.</p>
                    </div>
                    <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-[#3F70FF] hover:bg-[#5280FF] text-white rounded-lg text-sm font-medium transition-colors border border-[#3F70FF]/50 shadow-[0_0_20px_rgba(63,112,255,0.2)]">
                      Create Admin
                    </button>
                  </div>
                  
                  <div className="bg-[#151A22] border border-white/5 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#1A222C] text-[#94A3B8]">
                        <tr>
                          <th className="px-6 py-4 font-medium">Name</th>
                          <th className="px-6 py-4 font-medium">Email</th>
                          <th className="px-6 py-4 font-medium">Fleet Type</th>
                          <th className="px-6 py-4 font-medium">Payment Setup</th>
                          <th className="px-6 py-4 font-medium">Assigned Ships</th>
                          <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {manageAccounts.map((admin) => (
                          <tr key={admin.id} className="hover:bg-white/[0.02]">
                            <td className="px-6 py-4 font-medium text-white">{admin.name}</td>
                            <td className="px-6 py-4 text-[#94A3B8]">{admin.email}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase ${admin.role === 'super_admin' ? 'bg-[#3F70FF]/20 text-[#3F70FF]' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                {admin.shipType || (admin.role === 'super_admin' ? "System" : "N/A")}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {admin.paymongoPublicKey ? (
                                <div className="flex items-center gap-1.5 text-emerald-500">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-bold uppercase">Configured</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-rose-500/50">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-bold uppercase italic">Missing</span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {admin.role === 'super_admin' ? (
                                <span className="text-[#94A3B8] text-xs">All System Access</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {admin.shipIds && admin.shipIds.length > 0 ? (
                                    admin.shipIds.map(id => {
                                      const mappedShip = ships.find(s => s.id === id);
                                      return (
                                        <span key={id} className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] text-white">
                                          {mappedShip ? mappedShip.name : "Unknown Ship"}
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="text-[#94A3B8] text-xs">No ships assigned</span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                              {admin.role !== 'super_admin' && (
                                <>
                                  <button onClick={() => {
                                    setEditingAdmin(admin);
                                    setShowAdminEdit(true);
                                  }} className="p-1.5 text-[#94A3B8] hover:text-[#3F70FF] hover:bg-[#3F70FF]/10 rounded-lg transition-colors">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => {
                                    setAssignAdminId(admin.id);
                                    setSelectedShipIds(admin.shipIds || []);
                                  }} className="px-3 py-1.5 bg-[#3F70FF]/10 text-[#3F70FF] hover:bg-[#3F70FF]/20 rounded-lg text-xs font-medium transition-colors">
                                    Assign Ships
                                  </button>
                                  <button onClick={async () => {
                                    if (confirm("Delete this admin?")) {
                                      await deleteStaff(admin.id);
                                      fetchData();
                                    }
                                  }} className="text-rose-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SHIPS TAB */}
              {activeTab === "ships" && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-[1.75rem] font-bold text-[#F8FAFC] tracking-tight">System Fleets</h2>
                      <p className="text-[#94A3B8] text-sm mt-1">Review and approve vessels added by administrative staff.</p>
                    </div>
                  </div>

                  {/* Pending Confirmations */}
                  {pendingShips.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-1">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <h3 className="font-bold text-amber-500 uppercase tracking-wider text-xs">Pending Confirmation</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingShips.map((s) => (
                          <div key={s.id} className="bg-[#1A222C] border border-amber-500/20 p-5 rounded-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3">
                              <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-bold rounded uppercase tracking-tighter">Needs Approval</span>
                            </div>
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="font-bold text-white text-lg">{s.name}</h3>
                                <span className="text-[#3F70FF] text-xs font-semibold uppercase tracking-wider">{s.type}</span>
                                {s.requester_name && <p className="text-[9px] text-amber-500/80 font-bold uppercase mt-1 tracking-wider">Requested by: {s.requester_name}</p>}
                              </div>
                            </div>
                            <div className="space-y-2 text-[#94A3B8] text-sm mb-4">
                              <p>Route: <span className="text-white">{s.route}</span></p>
                              <p>Capacity: <span className="text-white">{s.totalSeats} seats</span></p>
                              <div className="pt-2 border-t border-white/5 mt-2 space-y-1">
                                <p className="text-[10px] font-bold text-[#3F70FF] uppercase tracking-widest">Payment Setup</p>
                                <p className="text-[11px]">Public: <span className="text-white font-mono">{s.paymongoPublicKey || "Not set"}</span></p>
                                <p className="text-[11px]">Secret: <span className="text-white font-mono">{s.paymongoSecretKey ? `••••${s.paymongoSecretKey.slice(-4)}` : "Not set"}</span></p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleConfirmShip(s.id)} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                <ShieldCheck className="w-4 h-4" /> Approve
                              </button>
                              <button onClick={() => {
                                if(confirm("Reject and delete this fleet request?")) {
                                  handleDeleteShip(s.id);
                                }
                              }} className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 rounded-lg transition-all text-xs font-bold flex items-center justify-center gap-2">
                                <XCircle className="w-4 h-4" /> Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Confirmed Fleet */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <h3 className="font-bold text-[#F8FAFC] uppercase tracking-wider text-xs">Active Fleet</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {confirmedShips.map((s) => (
                        <div key={s.id} className={`bg-[#1A222C] border border-white/5 p-5 rounded-2xl transition-all hover:border-[#3F70FF]/30 ${!s.isActive ? 'opacity-60 grayscale' : ''}`}>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-bold text-white text-lg">{s.name}</h3>
                              <span className="text-[#3F70FF] text-xs font-semibold uppercase tracking-wider">{s.type}</span>
                            </div>
                            <ShipIcon className="w-6 h-6 text-white/20" />
                          </div>
                          <div className="space-y-1 text-[#94A3B8] text-sm mb-6">
                            <p className="flex justify-between"><span>Route:</span> <span className="text-white font-medium">{s.route}</span></p>
                            <p className="flex justify-between"><span>Departure:</span> <span className="text-white font-medium">{s.departure}</span></p>
                            <p className="flex justify-between"><span>Status:</span> <span className={s.isActive ? "text-emerald-500 font-bold" : "text-rose-500 font-bold text-[10px]"}>{s.isActive ? "Operational" : "Deactivated"}</span></p>
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-4 border-t border-white/5">
                            <div className="flex gap-2">
                              <button onClick={() => handleToggleShip(s.id, !!s.isActive)} className={`p-2 rounded-lg transition-colors ${s.isActive ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20" : "text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20"}`}>
                                <Power className="w-4 h-4" />
                              </button>
                              <button onClick={() => setCancellingShip(s)} className="p-2 text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors">
                                <AlertTriangle className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex gap-2">
                              {/* Future: Edit Modal */}
                              <button onClick={() => handleDeleteShip(s.id)} className="p-2 text-[#94A3B8] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {confirmedShips.length === 0 && (
                        <div className="col-span-full p-8 text-center text-[#94A3B8] border border-dashed border-white/10 rounded-2xl italic">No active vessels found.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* AUDIT LOG TAB */}
              {activeTab === "audit" && (
                <div className="space-y-6 animate-in fade-in duration-500">
                   <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-[1.75rem] font-bold text-[#F8FAFC] tracking-tight">System Audit</h2>
                      <p className="text-[#94A3B8] text-sm mt-1">Immutable record of all administrative actions.</p>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                      <input 
                        type="text" 
                        placeholder="Search logs..." 
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        className="bg-[#151A22] border border-white/5 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#3F70FF]/50 w-64"
                      />
                    </div>
                  </div>

                  <div className="bg-[#151A22] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#1A222C] text-[#94A3B8] border-b border-white/5 uppercase text-[10px] tracking-widest font-bold">
                        <tr>
                          <th className="px-6 py-4 font-semibold">Timestamp</th>
                          <th className="px-6 py-4 font-semibold">Administrator</th>
                          <th className="px-6 py-4 font-semibold">Action</th>
                          <th className="px-6 py-4 font-semibold">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-6 py-4 text-[#94A3B8] font-mono text-xs">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${log.role === 'super_admin' ? 'bg-[#3F70FF]' : 'bg-emerald-500'}`} />
                                <span className="font-bold text-[#F8FAFC]">{log.performedByName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs">
                              <span className={`px-2 py-1 rounded bg-white/5 border border-white/10 text-white/70 font-bold`}>
                                {log.action.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-[#94A3B8] max-w-xs truncate" title={log.details}>
                              {log.details}
                            </td>
                          </tr>
                        ))}
                        {filteredLogs.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-20 text-center text-[#94A3B8] italic">No logs found matching your criteria.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* REVIEWS TAB */}
              {activeTab === "reviews" && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-[1.75rem] font-bold text-[#F8FAFC] tracking-tight">Customer Feedback</h2>
                      <p className="text-[#94A3B8] text-sm mt-1">Passenger ratings and survey analytics.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="bg-[#151A22] border border-white/5 rounded-2xl px-6 py-3 flex items-center gap-3">
                         <div className="flex items-center gap-1 text-amber-400">
                            <StarIcon className="w-5 h-5 fill-current" />
                            <span className="text-xl font-bold">
                              {reviews.length > 0 
                                ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
                                : "0.0"}
                            </span>
                         </div>
                         <div className="h-8 w-px bg-white/5" />
                         <div className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest leading-none">
                            <p>Average</p>
                            <p className="mt-1">Rating</p>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Survey Summary */}
                  <div className="grid grid-cols-3 gap-6">
                    {["ease", "clarity", "recommend"].map((qId) => {
                      const counts: any = {};
                      reviews.forEach(r => {
                        const val = r.surveyData?.[qId];
                        if (val) counts[val] = (counts[val] || 0) + 1;
                      });
                      const topAnswer = Object.entries(counts).sort((a: any, b: any) => b[1] as number - (a[1] as number))[0];
                      
                      return (
                        <div key={qId} className="bg-[#151A22] border border-white/5 rounded-2xl p-6">
                          <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.1em] mb-4">
                            {qId === 'ease' ? 'Booking Experience' : qId === 'clarity' ? 'Information Clarity' : 'Recommendation'}
                          </p>
                          {topAnswer ? (
                            <>
                              <h4 className="text-lg font-bold text-white mb-1">{topAnswer[0]}</h4>
                              <p className="text-[#3F70FF] text-xs font-bold uppercase tracking-wider">
                                {Math.round(((topAnswer[1] as number) / reviews.length) * 100)}% of passengers
                              </p>
                            </>
                          ) : (
                            <p className="text-[#94A3B8] text-sm italic">No data yet</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Detailed Reviews List */}
                  <div className="bg-[#151A22] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5 bg-[#1A222C]">
                      <h3 className="font-bold text-white text-sm">Recent Responses</h3>
                    </div>
                    <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                      {reviews.map((r) => (
                        <div key={r.id} className="p-6 hover:bg-white/[0.01] transition-colors">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#1A222C] border border-white/10 flex items-center justify-center font-bold text-[#94A3B8] text-sm">
                                {r.passengerName ? r.passengerName.charAt(0) : "P"}
                              </div>
                              <div>
                                <p className="font-bold text-white">{r.passengerName || "Anonymous"}</p>
                                <p className="text-[10px] text-[#94A3B8] font-mono">{new Date(r.createdAt).toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <StarIcon key={star} className={`w-3.5 h-3.5 ${star <= r.rating ? "fill-amber-400 text-amber-400" : "text-slate-400"}`} />
                              ))}
                            </div>
                          </div>
                          
                          {r.comment && (
                            <div className="bg-[#1A222C] rounded-xl p-4 mb-4 border border-white/5">
                              <p className="text-sm text-white/80 italic">"{r.comment}"</p>
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-2">
                            {Object.entries(r.surveyData || {}).map(([q, a]: any) => (
                              <div key={q} className="bg-white/5 rounded-lg px-3 py-2 border border-white/5">
                                <p className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-tighter mb-1 line-clamp-1">
                                  {q.replace(/_/g, " ")}
                                </p>
                                <p className="text-xs text-white font-medium truncate">{a}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {reviews.length === 0 && (
                        <div className="p-20 text-center text-[#94A3B8] italic">No reviews found in clinical data stream.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SETTINGS TAB */}
              {activeTab === "settings" && (
                <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl">
                  <div>
                    <h2 className="text-[1.75rem] font-bold text-[#F8FAFC] tracking-tight">System Settings</h2>
                    <p className="text-[#94A3B8] text-sm mt-1">Authentication and platform security controls.</p>
                  </div>

                  <div className="bg-[#151A22] border border-white/5 rounded-2xl p-8 space-y-8">
                    <section className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-[#3F70FF]" />
                        <h3 className="font-bold text-[#F8FAFC]">Update Master Password</h3>
                      </div>
                      <p className="text-sm text-[#94A3B8]">Change the password for the Super Admin accounts. This action will be logged.</p>
                      
                      <div className="flex flex-col gap-4">
                        <div className="relative">
                          <input 
                            type={showPass ? "text" : "password"} 
                            placeholder="Enter new master password" 
                            value={newAdminPass}
                            onChange={(e) => setNewAdminPass(e.target.value)}
                            className="w-full bg-[#1A222C] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3F70FF]/50"
                          />
                          <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {settingsMsg && <p className={`text-xs ${settingsMsg.includes('success') ? 'text-emerald-500 font-bold' : 'text-rose-500'}`}>{settingsMsg}</p>}
                        <button onClick={handleUpdatePassword} className="bg-[#3F70FF] hover:bg-[#5280FF] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all self-start shadow-xl shadow-[#3F70FF]/10">
                          Update Root Access
                        </button>
                      </div>
                    </section>

                    <div className="h-px bg-white/5" />

                    <section className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-rose-500" />
                        <h3 className="font-bold text-[#F8FAFC]">Global System Status</h3>
                      </div>
                      <p className="text-sm text-[#94A3B8]">Immediate platform controls for emergency maintenance or scaling.</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between">
                            <div>
                               <p className="text-xs font-bold text-white uppercase tracking-wider mb-1">Booking Engine</p>
                               <p className="text-[10px] text-emerald-500 font-bold">Online & Healthy</p>
                            </div>
                            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                         </div>
                         <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between opacity-50 cursor-not-allowed">
                            <div>
                               <p className="text-xs font-bold text-white uppercase tracking-wider mb-1">Maintenance Mode</p>
                               <p className="text-[10px] text-white/40 font-bold italic">Disabled</p>
                            </div>
                            <span className="w-3 h-3 bg-[#1A222C] border border-white/10 rounded-full" />
                         </div>
                      </div>
                    </section>
                  </div>
                </div>
              )}

            </>
          )}

        </main>
      </div>

        {/* ── EDIT ADMIN MODAL ── */}
        {showAdminEdit && editingAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#151A22] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Edit Administrator</h3>
                <button onClick={() => setShowAdminEdit(false)} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wider">Full Name</label>
                  <input type="text" value={editingAdmin.name} onChange={(e) => setEditingAdmin({...editingAdmin, name: e.target.value})}
                    className="w-full bg-[#1A222C] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3F70FF]/50 transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wider">Email Address</label>
                  <input type="email" value={editingAdmin.email} onChange={(e) => setEditingAdmin({...editingAdmin, email: e.target.value})}
                    className="w-full bg-[#1A222C] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3F70FF]/50 transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wider">Password (Reset)</label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} value={editingAdmin.password} onChange={(e) => setEditingAdmin({...editingAdmin, password: e.target.value})}
                      className="w-full bg-[#1A222C] border border-white/5 rounded-xl px-4 py-3 pr-10 text-sm text-white focus:outline-none focus:border-[#3F70FF]/50 transition-colors" />
                    <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button onClick={handleEditAdmin} className="w-full mt-2 py-3 bg-[#3F70FF] hover:bg-[#5280FF] text-white rounded-xl text-sm font-bold transition-colors">
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ── CREATE MODAL ── */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div key="create-admin-modal" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#151A22] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Create Admin</h3>
                <button onClick={() => setShowCreate(false)} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wider">Full Name</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-[#1A222C] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3F70FF]/50 transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wider">Email Address</label>
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-[#1A222C] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3F70FF]/50 transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} value={newPass} onChange={(e) => setNewPass(e.target.value)}
                      className="w-full bg-[#1A222C] border border-white/5 rounded-xl px-4 py-3 pr-10 text-sm text-white focus:outline-none focus:border-[#3F70FF]/50 transition-colors" />
                    <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wider">Assigned Fleet Type</label>
                  <select value={newShipType} onChange={(e) => setNewShipType(e.target.value)}
                    className="w-full bg-[#1A222C] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3F70FF]/50 transition-colors">
                    <option value="ferry">Ferry</option>
                    <option value="pumpboat">Pumpboat</option>
                    <option value="fastcraft">Fast Craft</option>
                    <option value="roro">RoRo</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-[#94A3B8] mb-1.5 block uppercase tracking-wider">PayMongo Secret</label>
                    <input type="password" placeholder="sk_test_..." value={newPaymongoSecret} onChange={(e) => setNewPaymongoSecret(e.target.value)}
                      className="w-full bg-[#1A222C] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3F70FF]/50 transition-colors" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#94A3B8] mb-1.5 block uppercase tracking-wider">PayMongo Public</label>
                    <input type="text" placeholder="pk_test_..." value={newPaymongoPublic} onChange={(e) => setNewPaymongoPublic(e.target.value)}
                      className="w-full bg-[#1A222C] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3F70FF]/50 transition-colors" />
                  </div>
                </div>
                {formMsg && <p className={`text-sm text-center font-medium ${formMsg.includes("success") ? "text-emerald-500" : "text-rose-500"}`}>{formMsg}</p>}
                <button onClick={handleCreateAdmin} disabled={creating} className="w-full mt-2 py-3 bg-[#3F70FF] hover:bg-[#5280FF] text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
                  {creating ? "Creating..." : "Confirm & Create"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ── CREATE SHIP MODAL ── */}
        {showShipCreate && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <motion.div key="create-ship-modal" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
               className="bg-[#151A22] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
               <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#151A22] z-10">
                 <h3 className="text-lg font-bold text-white">Create New Fleet</h3>
                 <button onClick={() => setShowShipCreate(false)} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5" /></button>
               </div>
               <div className="p-6 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-2">
                     <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wider">Ship Name</label>
                     <input type="text" value={newShipModel.name} onChange={(e) => setNewShipModel({...newShipModel, name: e.target.value})} className="w-full bg-[#1A222C] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3F70FF]/50" />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wider">Type</label>
                     <select value={newShipModel.type} onChange={(e) => setNewShipModel({...newShipModel, type: e.target.value})} className="w-full bg-[#1A222C] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3F70FF]/50">
                       <option value="ferry">Ferry</option>
                       <option value="pumpboat">Pumpboat</option>
                     </select>
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wider">Route</label>
                     <input type="text" placeholder="e.g. Danao to Camotes" value={newShipModel.route} onChange={(e) => setNewShipModel({...newShipModel, route: e.target.value})} className="w-full bg-[#1A222C] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3F70FF]/50" />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wider">Departure Time</label>
                     <input type="time" value={newShipModel.departure} onChange={(e) => setNewShipModel({...newShipModel, departure: e.target.value})} className="w-full bg-[#1A222C] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3F70FF]/50" />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wider">Arrival Time</label>
                     <input type="time" value={newShipModel.arrival} onChange={(e) => setNewShipModel({...newShipModel, arrival: e.target.value})} className="w-full bg-[#1A222C] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3F70FF]/50" />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wider">Base Ticket Price (₱)</label>
                     <input type="number" min="0" value={newShipModel.price} onChange={(e) => setNewShipModel({...newShipModel, price: e.target.value})} className="w-full bg-[#1A222C] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3F70FF]/50" />
                   </div>
                   <div>
                     <label className="text-xs font-semibold text-[#94A3B8] mb-1.5 block uppercase tracking-wider">Total Seating Capacity</label>
                     <input type="number" min="1" max="1000" value={newShipModel.totalSeats} onChange={(e) => setNewShipModel({...newShipModel, totalSeats: e.target.value})} className="w-full bg-[#1A222C] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3F70FF]/50" />
                   </div>
                 </div>
                 {shipFormMsg && <p className={`text-sm text-center font-medium ${shipFormMsg.includes("success") ? "text-emerald-500" : "text-rose-500"}`}>{shipFormMsg}</p>}
                 <button onClick={handleCreateShip} disabled={creatingShip} className="w-full py-3 bg-[#3F70FF] hover:bg-[#5280FF] text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
                   {creatingShip ? "Registering Vessel..." : "Confirm & Launch Fleet"}
                 </button>
               </div>
             </motion.div>
           </div>
        )}

        {/* ── ASSIGN SHIPS MODAL ── */}
        {assignAdminId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div key="assign-ships-modal" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#151A22] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-white">Assign Ships</h3>
                  <p className="text-xs text-[#94A3B8]">Select the fleets this admin manages.</p>
                </div>
                <button onClick={() => setAssignAdminId(null)} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-3">
                {ships.length === 0 ? (
                  <p className="text-sm text-[#94A3B8] text-center">No ships available.</p>
                ) : (
                  ships.map(ship => {
                    const isSelected = selectedShipIds.includes(ship.id);
                    return (
                      <label key={ship.id} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-[#3F70FF]/10 border-[#3F70FF]' : 'bg-[#1A222C] border-white/5 hover:border-white/20'}`}>
                        <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#3F70FF]' : 'bg-white/10'}`}>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white">{ship.name}</p>
                          <p className="text-xs text-[#94A3B8] uppercase">{ship.type}</p>
                        </div>
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={isSelected} 
                          onChange={(e) => {
                            if (e.target.checked) setSelectedShipIds([...selectedShipIds, ship.id]);
                            else setSelectedShipIds(selectedShipIds.filter(id => id !== ship.id));
                          }} 
                        />
                      </label>
                    );
                  })
                )}
              </div>
              
              <div className="p-6 border-t border-white/5 shrink-0">
                <button onClick={handleAssignShips} disabled={assigningLoading} className="w-full py-3 bg-[#3F70FF] hover:bg-[#5280FF] text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
                  {assigningLoading ? "Saving..." : "Save Assignments"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── CANCEL TRIP MODAL ── */}
      <AnimatePresence>
        {cancellingShip && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#151A22] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-rose-500" /> Cancel Voyage</h3>
                <button onClick={() => setCancellingShip(null)} className="text-[#94A3B8] hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-[#94A3B8]">This will invalidate all current tickets for <span className="text-white font-bold">{cancellingShip.name}</span> on the selected date.</p>
                <div>
                  <label className="text-[10px] font-bold text-[#94A3B8] mb-1.5 block uppercase tracking-[0.2em]">Select Date</label>
                  <input type="date" value={cancelDate} onChange={(e) => setCancelDate(e.target.value)}
                    className="w-full bg-[#1A222C] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500/50 transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#94A3B8] mb-1.5 block uppercase tracking-[0.2em]">Reason for Cancel</label>
                  <input type="text" placeholder="e.g. Gale Warning" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-[#1A222C] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500/50 transition-colors" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setCancellingShip(null)} className="flex-1 py-3 text-[#94A3B8] hover:text-white transition-colors text-sm font-bold">Abort</button>
                  <button onClick={handleCancelTrip} disabled={isCancelling} className="flex-[2] py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-rose-500/10">
                    {isCancelling ? "Processing..." : "Confirm Cancellation"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
