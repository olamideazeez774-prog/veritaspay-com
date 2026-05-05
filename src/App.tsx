import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { VercelAnalytics } from "@/components/vercel-analytics";
import { VercelSpeedInsights } from "@/components/vercel-speed-insights";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";

// Public pages - lazy loaded for code splitting
const Index = lazy(() => import("./pages/Index").then(m => ({ default: m.default })));
const Login = lazy(() => import("./pages/Login").then(m => ({ default: m.default })));
const Register = lazy(() => import("./pages/Register").then(m => ({ default: m.default })));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword").then(m => ({ default: m.default })));
const ResetPassword = lazy(() => import("./pages/ResetPassword").then(m => ({ default: m.default })));
const AdminVerificationRequests = lazy(() => import("./pages/admin/AdminVerificationRequests").then(m => ({ default: m.default })));
const NotFound = lazy(() => import("./pages/NotFound").then(m => ({ default: m.default })));
const Marketplace = lazy(() => import("./pages/Marketplace").then(m => ({ default: m.default })));
const About = lazy(() => import("./pages/About").then(m => ({ default: m.default })));
const ProductDetail = lazy(() => import("./pages/ProductDetail").then(m => ({ default: m.default })));
const Checkout = lazy(() => import("./pages/Checkout").then(m => ({ default: m.default })));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess").then(m => ({ default: m.default })));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback").then(m => ({ default: m.default })));
const Install = lazy(() => import("./pages/Install").then(m => ({ default: m.default })));
const DeliveryPage = lazy(() => import("./pages/DeliveryPage").then(m => ({ default: m.default })));

// Dashboard pages - lazy loaded
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.default })));
const VendorProducts = lazy(() => import("./pages/dashboard/VendorProducts").then(m => ({ default: m.default })));
const ProductForm = lazy(() => import("./pages/dashboard/ProductForm").then(m => ({ default: m.default })));
const VendorSales = lazy(() => import("./pages/dashboard/VendorSales").then(m => ({ default: m.default })));
const AffiliateLinks = lazy(() => import("./pages/dashboard/AffiliateLinks").then(m => ({ default: m.default })));
const AffiliateBrowse = lazy(() => import("./pages/dashboard/AffiliateBrowse").then(m => ({ default: m.default })));
const AffiliateStats = lazy(() => import("./pages/dashboard/AffiliateStats").then(m => ({ default: m.default })));
const AffiliateReferrals = lazy(() => import("./pages/dashboard/AffiliateReferrals").then(m => ({ default: m.default })));
const WalletPage = lazy(() => import("./pages/dashboard/WalletPage").then(m => ({ default: m.default })));
const PayoutsPage = lazy(() => import("./pages/dashboard/PayoutsPage").then(m => ({ default: m.default })));
const SettingsPage = lazy(() => import("./pages/dashboard/SettingsPage").then(m => ({ default: m.default })));

// Admin pages - lazy loaded
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard").then(m => ({ default: m.default })));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts").then(m => ({ default: m.default })));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers").then(m => ({ default: m.default })));
const AdminPayouts = lazy(() => import("./pages/admin/AdminPayouts").then(m => ({ default: m.default })));
const AdminListingPayments = lazy(() => import("./pages/admin/AdminListingPayments").then(m => ({ default: m.default })));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics").then(m => ({ default: m.default })));
const AdminLogbook = lazy(() => import("./pages/admin/AdminLogbook").then(m => ({ default: m.default })));
const AdminCommissionRules = lazy(() => import("./pages/admin/AdminCommissionRules").then(m => ({ default: m.default })));
const AdminFraudDashboard = lazy(() => import("./pages/admin/AdminFraudDashboard").then(m => ({ default: m.default })));
const AdminLeaderboard = lazy(() => import("./pages/admin/AdminLeaderboard").then(m => ({ default: m.default })));
const AdminRankings = lazy(() => import("./pages/admin/AdminRankings").then(m => ({ default: m.default })));
const AdminMessaging = lazy(() => import("./pages/admin/AdminMessaging").then(m => ({ default: m.default })));
const AdminPromoMaterials = lazy(() => import("./pages/admin/AdminPromoMaterials").then(m => ({ default: m.default })));
const AdminRevenueControls = lazy(() => import("./pages/admin/AdminRevenueControls").then(m => ({ default: m.default })));
const AdminFeatureFlags = lazy(() => import("./pages/admin/AdminFeatureFlags").then(m => ({ default: m.default })));
const AdminAICopilot = lazy(() => import("./pages/admin/AdminAICopilot").then(m => ({ default: m.default })));
const AdminExperiments = lazy(() => import("./pages/admin/AdminExperiments").then(m => ({ default: m.default })));

// Extra dashboard pages - lazy loaded
const AffiliateToolkit = lazy(() => import("./pages/dashboard/AffiliateToolkit").then(m => ({ default: m.default })));
const VendorAnnouncements = lazy(() => import("./pages/dashboard/VendorAnnouncements").then(m => ({ default: m.default })));
const CertificatesPage = lazy(() => import("./pages/dashboard/CertificatesPage").then(m => ({ default: m.default })));
const AffiliateAnalytics = lazy(() => import("./pages/dashboard/AffiliateAnalytics").then(m => ({ default: m.default })));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate").then(m => ({ default: m.default })));
const InboxPage = lazy(() => import("./pages/dashboard/InboxPage").then(m => ({ default: m.default })));
const DailyDigestPage = lazy(() => import("./pages/dashboard/DailyDigestPage").then(m => ({ default: m.default })));
const VendorToolkit = lazy(() => import("./pages/dashboard/VendorToolkit").then(m => ({ default: m.default })));
const AIAssistantPage = lazy(() => import("./pages/dashboard/AIAssistantPage").then(m => ({ default: m.default })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1,
      refetchOnMount: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

function FeatureFlagRoute({ flag, children }: { flag: string; children: React.ReactNode }) {
  const { enabled, isLoading } = useFeatureFlag(flag);
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><AnimatedLoading size="lg" /></div>;
  if (!enabled) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <VercelAnalytics />
          <VercelSpeedInsights />
          <BrowserRouter>
            <ScrollToTop />
            <ErrorBoundary>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><AnimatedLoading size="lg" /></div>}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/ref/:code" element={<ProductDetail />} />
              <Route path="/checkout/:productId" element={<Checkout />} />
              <Route path="/checkout/success" element={<CheckoutSuccess />} />
              <Route path="/payment/callback" element={<PaymentCallback />} />
              <Route path="/install" element={<Install />} />
              <Route path="/verify-certificate/:hash" element={<VerifyCertificate />} />
              <Route path="/delivery" element={<DeliveryPage />} />

              {/* Protected Dashboard Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              
              {/* Vendor Routes */}
              <Route
                path="/dashboard/products"
                element={
                  <ProtectedRoute requiredRoles={["vendor"]}>
                    <VendorProducts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/products/new"
                element={
                  <ProtectedRoute requiredRoles={["vendor"]}>
                    <ProductForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/products/:id/edit"
                element={
                  <ProtectedRoute requiredRoles={["vendor"]}>
                    <ProductForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/sales"
                element={
                  <ProtectedRoute requiredRoles={["vendor"]}>
                    <VendorSales />
                  </ProtectedRoute>
                }
              />

              {/* Affiliate Routes */}
              <Route
                path="/dashboard/browse"
                element={
                  <ProtectedRoute requiredRoles={["affiliate"]}>
                    <AffiliateBrowse />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/links"
                element={
                  <ProtectedRoute requiredRoles={["affiliate"]}>
                    <AffiliateLinks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/stats"
                element={
                  <ProtectedRoute requiredRoles={["affiliate"]}>
                    <AffiliateStats />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/referrals"
                element={
                  <ProtectedRoute requiredRoles={["affiliate"]}>
                    <AffiliateReferrals />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/toolkit"
                element={
                  <ProtectedRoute requiredRoles={["affiliate"]}>
                    <AffiliateToolkit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/analytics"
                element={
                  <ProtectedRoute requiredRoles={["affiliate"]}>
                    <AffiliateAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/certificates"
                element={
                  <ProtectedRoute>
                    <CertificatesPage />
                  </ProtectedRoute>
                }
              />

              {/* Vendor Routes - Announcements */}
              <Route
                path="/dashboard/announcements"
                element={
                  <ProtectedRoute requiredRoles={["vendor"]}>
                    <VendorAnnouncements />
                  </ProtectedRoute>
                }
              />

              {/* Shared Routes */}
              <Route
                path="/dashboard/wallet"
                element={
                  <ProtectedRoute>
                    <WalletPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/payouts"
                element={
                  <ProtectedRoute>
                    <PayoutsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/inbox"
                element={
                  <ProtectedRoute>
                    <InboxPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/digest"
                element={
                  <ProtectedRoute>
                    <DailyDigestPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/vendor-toolkit"
                element={
                  <ProtectedRoute requiredRoles={["vendor"]}>
                    <VendorToolkit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/ai-assistant"
                element={
                  <ProtectedRoute>
                    <AIAssistantPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/vp-admin-x7k9"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vp-admin-x7k9/products"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminProducts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vp-admin-x7k9/users"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vp-admin-x7k9/payouts"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminPayouts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vp-admin-x7k9/listing-payments"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminListingPayments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vp-admin-x7k9/analytics"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vp-admin-x7k9/logbook"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminLogbook />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vp-admin-x7k9/commissions"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminCommissionRules />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vp-admin-x7k9/fraud"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminFraudDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vp-admin-x7k9/leaderboard"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminLeaderboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vp-admin-x7k9/rankings"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminRankings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vp-admin-x7k9/messaging"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminMessaging />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vp-admin-x7k9/materials"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminPromoMaterials />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vp-admin-x7k9/revenue"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminRevenueControls />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vp-admin-x7k9/feature-flags"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminFeatureFlags />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vp-admin-x7k9/ai-copilot"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminAICopilot />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vp-admin-x7k9/experiments"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminExperiments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vp-admin-x7k9/verification-requests"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminVerificationRequests />
                  </ProtectedRoute>
                }
              />

                  {/* Catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
