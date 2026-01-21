import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Link2,
  BarChart3,
  Wallet,
  CreditCard,
  Settings,
  Users,
  ShoppingCart,
  ChevronLeft,
  Menu,
  LogOut,
  Shield,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { PLATFORM_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ("admin" | "vendor" | "affiliate")[];
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Products", href: "/dashboard/products", icon: Package, roles: ["vendor", "admin"] },
  { title: "Browse Products", href: "/dashboard/browse", icon: Package, roles: ["affiliate"] },
  { title: "My Links", href: "/dashboard/links", icon: Link2, roles: ["affiliate"] },
  { title: "Analytics", href: "/dashboard/stats", icon: BarChart3, roles: ["affiliate"] },
  { title: "Sales", href: "/dashboard/sales", icon: ShoppingCart, roles: ["vendor", "admin"] },
  { title: "Wallet", href: "/dashboard/wallet", icon: Wallet },
  { title: "Payouts", href: "/dashboard/payouts", icon: CreditCard },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

const adminNavItems: NavItem[] = [
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Products", href: "/admin/products", icon: Package },
  { title: "Sales", href: "/admin/sales", icon: ShoppingCart },
  { title: "Payouts", href: "/admin/payouts", icon: CreditCard },
  { title: "Settings", href: "/admin/settings", icon: Settings },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, roles, isAdmin, isVendor, isAffiliate, signOut, isLoading } = useAuth();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
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

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.some((role) => {
      if (role === "admin") return isAdmin;
      if (role === "vendor") return isVendor;
      if (role === "affiliate") return isAffiliate;
      return false;
    });
  });

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold">
            V
          </div>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-serif text-lg font-semibold text-sidebar-foreground"
            >
              {PLATFORM_NAME}
            </motion.span>
          )}
        </Link>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link key={item.href} to={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
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
              {adminNavItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link key={item.href} to={item.href}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
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
        <div className={cn("flex items-center gap-3", !sidebarOpen && "justify-center")}>
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-sm">
              {getInitials(profile?.full_name)}
            </AvatarFallback>
          </Avatar>
          {sidebarOpen && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {profile?.full_name || "User"}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/60">{profile?.email}</p>
            </div>
          )}
        </div>
        {sidebarOpen && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        )}
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 72 }}
        className="fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-sidebar-border bg-sidebar lg:flex"
      >
        <SidebarContent />
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-md hover:bg-sidebar-accent"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
        </button>
      </motion.aside>

      {/* Mobile Header */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background px-4 lg:hidden">
        <button onClick={() => setMobileOpen(true)} className="text-foreground">
          <Menu className="h-6 w-6" />
        </button>
        <span className="font-serif text-lg font-semibold">{PLATFORM_NAME}</span>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-4 top-4 text-sidebar-foreground"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 transition-all duration-300 lg:pt-0 pt-14",
          sidebarOpen ? "lg:ml-[260px]" : "lg:ml-[72px]"
        )}
      >
        <div className="container-wide py-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
