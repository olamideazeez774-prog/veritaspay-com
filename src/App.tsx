import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

// Public pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Marketplace from "./pages/Marketplace";
import About from "./pages/About";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import Install from "./pages/Install";

// Dashboard pages
import Dashboard from "./pages/Dashboard";
import VendorProducts from "./pages/dashboard/VendorProducts";
import ProductForm from "./pages/dashboard/ProductForm";
import VendorSales from "./pages/dashboard/VendorSales";
import AffiliateLinks from "./pages/dashboard/AffiliateLinks";
import AffiliateBrowse from "./pages/dashboard/AffiliateBrowse";
import AffiliateStats from "./pages/dashboard/AffiliateStats";
import AffiliateReferrals from "./pages/dashboard/AffiliateReferrals";
import WalletPage from "./pages/dashboard/WalletPage";
import PayoutsPage from "./pages/dashboard/PayoutsPage";
import SettingsPage from "./pages/dashboard/SettingsPage";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPayouts from "./pages/admin/AdminPayouts";
import AdminListingPayments from "./pages/admin/AdminListingPayments";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminLogbook from "./pages/admin/AdminLogbook";
import AdminCommissionRules from "./pages/admin/AdminCommissionRules";
import AdminFraudDashboard from "./pages/admin/AdminFraudDashboard";
import AdminLeaderboard from "./pages/admin/AdminLeaderboard";
import AdminRankings from "./pages/admin/AdminRankings";
import AdminMessaging from "./pages/admin/AdminMessaging";
import AdminPromoMaterials from "./pages/admin/AdminPromoMaterials";
import AdminRevenueControls from "./pages/admin/AdminRevenueControls";
import AdminFeatureFlags from "./pages/admin/AdminFeatureFlags";
import AdminAICopilot from "./pages/admin/AdminAICopilot";
import AdminExperiments from "./pages/admin/AdminExperiments";
// Extra dashboard pages
import AffiliateToolkit from "./pages/dashboard/AffiliateToolkit";
import VendorAnnouncements from "./pages/dashboard/VendorAnnouncements";
import CertificatesPage from "./pages/dashboard/CertificatesPage";
import AffiliateAnalytics from "./pages/dashboard/AffiliateAnalytics";
import VerifyCertificate from "./pages/VerifyCertificate";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
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
              <Route path="/install" element={<Install />} />
              <Route path="/verify-certificate/:hash" element={<VerifyCertificate />} />

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

              {/* Legacy admin routes redirect - keep for backwards compatibility */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/products"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminProducts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/payouts"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminPayouts />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
