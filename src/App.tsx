import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/store";
import LoginPage from "./pages/LoginPage";
import BookingHome from "./pages/BookingHome";
import SeatSelection from "./pages/SeatSelection";
import TicketPreview from "./pages/TicketPreview";
import PaymentPage from "./pages/PaymentPage";
import DigitalTicket from "./pages/DigitalTicket";
import TicketReview from "./pages/TicketReview";
import ScanLogin from "./pages/ScanLogin";
import ScannerPage from "./pages/ScannerPage";
import ScanHistoryPage from "./pages/ScanHistoryPage";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import NotFound from "./pages/NotFound";
import MyTickets from "./pages/MyTickets";
import LegSelector from "./pages/LegSelector";
import AccommodationPage from "./pages/AccommodationPage";
import { AuthGuard } from "./components/AuthGuard";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";
import PaymentResult from "./pages/PaymentResult";
import CounterConfirmation from "./pages/CounterConfirmation";
import PrintTicket from "./pages/PrintTicket";
import SchedulesPage from "./pages/SchedulesPage";
import RoutesPage from "./pages/RoutesPage";
import ContactPage from "./pages/ContactPage";
import { IDVerificationNotifier } from "./components/IDVerificationNotifier";

// ── App ───────────────────────────────────────────────────────────────────────
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <IDVerificationNotifier />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/booking" element={<BookingHome />} />
          <Route path="/seat-selection/:shipId" element={<SeatSelection />} />
          <Route path="/ticket-preview/:shipId/:seatId" element={<TicketPreview />} />
          <Route path="/review/:shipId/:seatId" element={<TicketReview />} />
          <Route path="/payment/:shipId/:seatId" element={<PaymentPage />} />
          <Route path="/ticket/:bookingId" element={<DigitalTicket />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-failed" element={<PaymentFailed />} />
          <Route path="/payment-result" element={<PaymentResult />} />
          <Route path="/counter-confirmation" element={<CounterConfirmation />} />
          <Route path="/print-ticket/:bookingId" element={<PrintTicket />} />
          <Route path="/my-tickets" element={<MyTickets />} />
          <Route path="/leg-selector/:shipId" element={<LegSelector />} />
          <Route path="/accommodation/:shipId" element={<AccommodationPage />} />
          
          {/* Information Pages */}
          <Route path="/schedules" element={<SchedulesPage />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/contact" element={<ContactPage />} />

          <Route path="/scan-login" element={<ScanLogin />} />
          <Route path="/scanner" element={<AuthGuard allowedRoles={["scanner", "super_admin"]}><ScannerPage /></AuthGuard>} />
          <Route path="/scan-history" element={<AuthGuard allowedRoles={["scanner", "super_admin"]}><ScanHistoryPage /></AuthGuard>} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin" element={<AuthGuard allowedRoles={["admin"]}><AdminDashboard /></AuthGuard>} />
          <Route path="/super-admin" element={<AuthGuard allowedRoles={["super_admin"]}><SuperAdminDashboard /></AuthGuard>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;