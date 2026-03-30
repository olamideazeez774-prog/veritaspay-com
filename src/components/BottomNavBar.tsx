import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Package, Link2, Wallet, Settings,
  BarChart3, ShoppingCart, Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAllFeatureFlags } from "@/hooks/useFeatureFlag";

interface BottomNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ("admin" | "vendor" | "affiliate")[];
  featureFlag?: string;
}

const vendorBottomNav: BottomNavItem[] = [
  { title: "Home", href: "/dashboard", icon: LayoutDashboard },
  { title: "Products", href: "/dashboard/products", icon: Package, roles: ["vendor", "admin"] },
  { title: "Sales", href: "/dashboard/sales", icon: ShoppingCart, roles: ["vendor", "admin"] },
  { title: "Wallet", href: "/dashboard/wallet", icon: Wallet },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

const affiliateBottomNav: BottomNavItem[] = [
  { title: "Home", href: "/dashboard", icon: LayoutDashboard },
  { title: "Links", href: "/dashboard/links", icon: Link2, roles: ["affiliate"] },
  { title: "Stats", href: "/dashboard/stats", icon: BarChart3, roles: ["affiliate"] },
  { title: "Wallet", href: "/dashboard/wallet", icon: Wallet },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

const defaultBottomNav: BottomNavItem[] = [
  { title: "Home", href: "/dashboard", icon: LayoutDashboard },
  { title: "Wallet", href: "/dashboard/wallet", icon: Wallet },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

// Items that are in the bottom nav and should be removed from sidebar
export const BOTTOM_NAV_HREFS_VENDOR = vendorBottomNav.map(i => i.href);
export const BOTTOM_NAV_HREFS_AFFILIATE = affiliateBottomNav.map(i => i.href);
export const BOTTOM_NAV_HREFS_DEFAULT = defaultBottomNav.map(i => i.href);

interface BottomNavBarProps {
  isVisible?: boolean;
}

export function BottomNavBar({ isVisible = true }: BottomNavBarProps) {
  const location = useLocation();
  const { isVendor, isAffiliate, isAdmin } = useAuth();
  const { flags } = useAllFeatureFlags();

  const items = isVendor 
    ? vendorBottomNav 
    : isAffiliate 
      ? affiliateBottomNav 
      : defaultBottomNav;

  const filteredItems = items.filter(item => {
    if (item.featureFlag && flags[item.featureFlag]?.enabled === false) return false;
    if (!item.roles) return true;
    return item.roles.some(role => {
      if (role === "admin") return isAdmin;
      if (role === "vendor") return isVendor;
      if (role === "affiliate") return isAffiliate;
      return false;
    });
  }).slice(0, 5);

  // Only show on mobile, hide when sidebar is open
  if (!isVisible) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 lg:hidden border-t border-border bg-background/95 backdrop-blur-md safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-0 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className={cn(
                "text-[10px] font-medium truncate max-w-[56px]",
                isActive && "text-primary"
              )}>
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
