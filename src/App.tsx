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

              {/* Admin Routes - Secret Panel (not linked in UI) */}
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
