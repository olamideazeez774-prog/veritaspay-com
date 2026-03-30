import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, Link2, BarChart3, Wallet, CreditCard,
  Settings, Users, ShoppingCart, ChevronLeft, Menu, LogOut, Shield,
  X, Inbox, Newspaper, Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { PLATFORM_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SignOutDialog } from "@/components/SignOutDialog";
import { NotificationBell } from "@/components/NotificationBell";
import { useAllFeatureFlags } from "@/hooks/useFeatureFlag";
import { BottomNavBar, BOTTOM_NAV_HREFS_VENDOR, BOTTOM_NAV_HREFS_AFFILIATE, BOTTOM_NAV_HREFS_DEFAULT } from "@/components/BottomNavBar";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ("admin" | "vendor" | "affiliate")[];
  featureFlag?: string;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Products", href: "/dashboard/products", icon: Package, roles: ["vendor", "admin"] },
  { title: "Vendor Toolkit", href: "/dashboard/vendor-toolkit", icon: Wrench, roles: ["vendor"] },
  { title: "Browse Products", href: "/dashboard/browse", icon: Package, roles: ["affiliate"] },
  { title: "My Links", href: "/dashboard/links", icon: Link2, roles: ["affiliate"] },
  { title: "Analytics", href: "/dashboard/stats", icon: BarChart3, roles: ["affiliate"] },
  { title: "Intelligence", href: "/dashboard/analytics", icon: BarChart3, roles: ["affiliate"], featureFlag: "ai_modules" },
  { title: "Referrals", href: "/dashboard/referrals", icon: Users, roles: ["affiliate"] },
  { title: "Toolkit", href: "/dashboard/toolkit", icon: Link2, roles: ["affiliate"], featureFlag: "affiliate_toolkit" },
  { title: "Certificates", href: "/dashboard/certificates", icon: Shield, featureFlag: "certificates" },
  { title: "Sales", href: "/dashboard/sales", icon: ShoppingCart, roles: ["vendor", "admin"] },
  { title: "Announcements", href: "/dashboard/announcements", icon: Menu, roles: ["vendor"] },
  { title: "Wallet", href: "/dashboard/wallet", icon: Wallet },
  { title: "Payouts", href: "/dashboard/payouts", icon: CreditCard },
  { title: "Daily Digest", href: "/dashboard/digest", icon: Newspaper, featureFlag: "daily_digest" },
  { title: "Inbox", href: "/dashboard/inbox", icon: Inbox },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

const adminNavItems: NavItem[] = [
  { title: "Admin Panel", href: "/vp-admin-x7k9", icon: Shield },
  { title: "Analytics", href: "/vp-admin-x7k9/analytics", icon: BarChart3 },
  { title: "Logbook", href: "/vp-admin-x7k9/logbook", icon: LayoutDashboard },
  { title: "Commission Rules", href: "/vp-admin-x7k9/commissions", icon: Settings },
  { title: "Fraud Monitor", href: "/vp-admin-x7k9/fraud", icon: Shield },
  { title: "AI Copilot", href: "/vp-admin-x7k9/ai-copilot", icon: BarChart3, featureFlag: "ai_modules" },
  { title: "Experiments", href: "/vp-admin-x7k9/experiments", icon: Settings, featureFlag: "experiments" },
  { title: "Leaderboard", href: "/vp-admin-x7k9/leaderboard", icon: BarChart3, featureFlag: "leaderboard" },
  { title: "Rankings", href: "/vp-admin-x7k9/rankings", icon: Package },
  { title: "Messaging", href: "/vp-admin-x7k9/messaging", icon: Menu },
  { title: "Materials", href: "/vp-admin-x7k9/materials", icon: Package },
  { title: "Revenue & AI", href: "/vp-admin-x7k9/revenue", icon: CreditCard },
  { title: "Feature Flags", href: "/vp-admin-x7k9/feature-flags", icon: Settings },
  { title: "Users", href: "/vp-admin-x7k9/users", icon: Users },
  { title: "Products", href: "/vp-admin-x7k9/products", icon: Package },
  { title: "Listing Payments", href: "/vp-admin-x7k9/listing-payments", icon: CreditCard, featureFlag: "listing_fees" },
  { title: "Payouts", href: "/vp-admin-x7k9/payouts", icon: CreditCard },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, roles, isAdmin, isVendor, isAffiliate, signOut, isLoading } = useAuth();
  const { flags } = useAllFeatureFlags();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleSignOutClick = () => setShowSignOutDialog(true);

  const handleSignOutConfirm = async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    setShowSignOutDialog(false);
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  // Get bottom nav hrefs for current role to exclude from sidebar on mobile
  const bottomNavHrefs = isVendor 
    ? BOTTOM_NAV_HREFS_VENDOR 
    : isAffiliate 
      ? BOTTOM_NAV_HREFS_AFFILIATE 
      : BOTTOM_NAV_HREFS_DEFAULT;

  const filteredNavItems = navItems.filter((item) => {
    // Check feature flag
    if (item.featureFlag && flags[item.featureFlag]?.enabled === false) return false;
    if (!item.roles) return true;
    return item.roles.some((role) => {
      if (role === "admin") return isAdmin;
      if (role === "vendor") return isVendor;
      if (role === "affiliate") return isAffiliate;
      return false;
    });
  });

  const filteredAdminItems = adminNavItems.filter((item) => {
    if (item.featureFlag && flags[item.featureFlag]?.enabled === false) return false;
    return true;
  });

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    // On mobile, remove items that are in the bottom nav
    const sidebarItems = isMobile 
      ? filteredNavItems.filter(item => !bottomNavHrefs.includes(item.href))
      : filteredNavItems;

    return (
      <>
        {/* Logo */}
        <div className="flex h-16 items-center justify-between gap-2 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold">
              V
            </div>
            {sidebarOpen && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="font-serif text-lg font-semibold text-sidebar-foreground">
                {PLATFORM_NAME}
              </motion.span>
            )}
          </Link>
          {sidebarOpen && (
            <div className="flex items-center gap-1">
              <NotificationBell />
              <ThemeToggle />
            </div>
          )}
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-4">
          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.href} to={item.href}>
                  <motion.div whileHover={{ x: 4 }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}>
                    <item.icon className="h-5 w-5 shrink-0" />
                    {sidebarOpen && <span>{item.title}</span>}
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          {/* Admin Section */}
          {isAdmin && (
            <>
              <Separator className="my-4 bg-sidebar-border" />
              <div className="mb-2 px-3">
                {sidebarOpen && (
                  <span className="text-xs font-medium uppercase tracking-wider text-sidebar-foreground/60">
                    Admin
                  </span>
                )}
              </div>
              <nav className="space-y-1">
                {filteredAdminItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link key={item.href} to={item.href}>
                      <motion.div whileHover={{ x: 4 }}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}>
                        <item.icon className="h-5 w-5 shrink-0" />
                        {sidebarOpen && <span>{item.title}</span>}
                      </motion.div>
                    </Link>
                  );
                })}
              </nav>
            </>
          )}
        </ScrollArea>

        {/* User Section */}
        <div className="border-t border-sidebar-border p-4">
          <Link to="/dashboard/settings"
            className={cn("flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-accent", !sidebarOpen && "justify-center")}>
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-sm">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{profile?.full_name || "User"}</p>
                <p className="truncate text-xs text-sidebar-foreground/60">{profile?.email}</p>
              </div>
            )}
          </Link>
          {sidebarOpen && (
            <Button variant="ghost" size="sm"
              className="mt-3 w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={handleSignOutClick}>
              <LogOut className="mr-2 h-4 w-4" />Sign Out
            </Button>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <motion.aside initial={false} animate={{ width: sidebarOpen ? 260 : 72 }}
        className="fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <SidebarContent />
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-md hover:bg-sidebar-accent">
          <ChevronLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
        </button>
      </motion.aside>

      {/* Mobile Header */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-border bg-background px-4 lg:hidden">
        <div className="flex items-center gap-4">
          <button onClick={() => setMobileOpen(true)} className="text-foreground">
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-serif text-lg font-semibold">{PLATFORM_NAME}</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm lg:hidden" />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar pb-20 lg:hidden">
              <button onClick={() => setMobileOpen(false)} className="absolute right-4 top-4 text-sidebar-foreground">
                <X className="h-5 w-5" />
              </button>
              <SidebarContent isMobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300 lg:pt-0 pt-14 pb-20 lg:pb-0",
        sidebarOpen ? "lg:ml-[260px]" : "lg:ml-[72px]"
      )}>
        <div className="container-wide py-6 lg:py-8">{children}</div>
      </main>

      {/* Bottom Navigation Bar (mobile only) */}
      <BottomNavBar />

      {/* Sign Out Dialog */}
      <SignOutDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}
        onConfirm={handleSignOutConfirm} isLoading={isSigningOut} />
    </div>
  );
}
