import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, Link2, Wallet, Settings, ShoppingCart, Store } from "lucide-react";
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
  { title: "Browse", href: "/marketplace", icon: Store, roles: ["affiliate"] },
  { title: "Links", href: "/dashboard/links", icon: Link2, roles: ["affiliate"] },
  { title: "Wallet", href: "/dashboard/wallet", icon: Wallet },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

const defaultBottomNav: BottomNavItem[] = [
  { title: "Home", href: "/dashboard", icon: LayoutDashboard },
  { title: "Browse", href: "/marketplace", icon: Store },
  { title: "Wallet", href: "/dashboard/wallet", icon: Wallet },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

export const BOTTOM_NAV_HREFS_VENDOR = vendorBottomNav.map((item) => item.href);
export const BOTTOM_NAV_HREFS_AFFILIATE = affiliateBottomNav.map((item) => item.href);
export const BOTTOM_NAV_HREFS_DEFAULT = defaultBottomNav.map((item) => item.href);

interface BottomNavBarProps {
  isVisible?: boolean;
}

export function BottomNavBar({ isVisible = true }: BottomNavBarProps) {
  const location = useLocation();
  const { isVendor, isAffiliate, isAdmin } = useAuth();
  const { flags } = useAllFeatureFlags();
  const items = isVendor ? vendorBottomNav : isAffiliate ? affiliateBottomNav : defaultBottomNav;

  const filteredItems = items.filter((item) => {
    if (item.featureFlag && flags[item.featureFlag]?.enabled === false) return false;
    if (!item.roles) return true;
    return item.roles.some((role) => (role === "admin" && isAdmin) || (role === "vendor" && isVendor) || (role === "affiliate" && isAffiliate));
  }).slice(0, 5);

  if (!isVisible) return null;

  return (
    <nav className="safe-area-bottom fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden" aria-label="Primary mobile navigation">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around">
        {filteredItems.map((item) => {
          const isActive = item.href === "/dashboard" ? location.pathname === "/dashboard" : location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} to={item.href} aria-current={isActive ? "page" : undefined} className={cn("flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors", isActive ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              <span className={cn("flex h-7 w-10 items-center justify-center rounded-full transition-colors", isActive && "bg-primary/10")}><item.icon className="h-5 w-5" aria-hidden="true" /></span>
              <span className="max-w-[64px] truncate">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
