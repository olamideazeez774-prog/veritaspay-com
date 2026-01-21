import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Public pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import Marketplace from "./pages/Marketplace";
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
import WalletPage from "./pages/dashboard/WalletPage";
import PayoutsPage from "./pages/dashboard/PayoutsPage";
import SettingsPage from "./pages/dashboard/SettingsPage";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPayouts from "./pages/admin/AdminPayouts";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/marketplace" element={<Marketplace />} />
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
);

export default App;
