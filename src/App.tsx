import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { trackPageView } from "@/lib/analytics";
import ProtectedRoute from "@/components/ProtectedRoute";
import SuspensionGuard from "./components/SuspensionGuard";

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Profile = lazy(() => import("./pages/Profile"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Messages = lazy(() => import("./pages/Messages"));
const Agreements = lazy(() => import("./pages/Agreements"));
const Reputation = lazy(() => import("./pages/Reputation"));
const Admin = lazy(() => import("./pages/Admin"));
const DealDetail = lazy(() => import("./pages/DealDetail"));
const Billing = lazy(() => import("./pages/Billing"));
const Analytics = lazy(() => import("./pages/Analytics"));
const NotificationPreferences = lazy(() => import("./pages/NotificationPreferences"));
const DealRooms = lazy(() => import("./pages/DealRooms"));
const DealRoomCreate = lazy(() => import("./pages/DealRoomCreate"));
const DealRoomDetail = lazy(() => import("./pages/DealRoomDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Contact = lazy(() => import("./pages/Contact"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Help = lazy(() => import("./pages/Help"));

// Analytics tracker component
const AnalyticsTracker = () => {
  const location = useLocation();
  
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  return null;
};

const LoadingScreen = () => (
  <div className="min-h-screen grid place-items-center bg-background text-muted-foreground">
    <div className="text-sm uppercase tracking-[0.2em]">Loading application…</div>
  </div>
);

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AnalyticsTracker />
      <Suspense fallback={<LoadingScreen />}>
        <SuspensionGuard />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/help" element={<Help />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/deals/:id" element={<DealDetail />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/agreements" element={<Agreements />} />
            <Route path="/reputation" element={<Reputation />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings/notifications" element={<NotificationPreferences />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/deal-rooms" element={<DealRooms />} />
            <Route path="/deal-room/create" element={<DealRoomCreate />} />
            <Route path="/deal-room/:id" element={<DealRoomDetail />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
          <Route path="/pricing" element={<Pricing />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </BrowserRouter>
    </TooltipProvider>
);

export default App;
