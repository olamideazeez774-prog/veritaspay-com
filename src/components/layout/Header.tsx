import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PLATFORM_NAME } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { Menu, X, ChevronDown, User, LogOut, LayoutDashboard, ArrowRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SignOutDialog } from "@/components/SignOutDialog";

const navLinks = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#how-it-works", label: "How it works" },
];

export function Header() {
  const { user, profile, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const handleSignOutConfirm = async () => {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    setShowSignOutDialog(false);
    navigate("/");
  };

  const isActive = (href: string) => {
    const path = href.split("#")[0];
    return path && location.pathname === path;
  };

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          isScrolled ? "glass-subtle shadow-soft py-2.5" : "bg-background/80 backdrop-blur-sm py-3.5 sm:bg-transparent sm:backdrop-blur-0 sm:py-5"
        }`}
      >
        <div className="container flex min-h-11 items-center justify-between gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label={`${PLATFORM_NAME} home`}>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="flex items-center gap-2.5">
              <img src="/logo.jpg" alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm" />
              <span className="truncate font-serif text-lg font-bold text-gradient-primary sm:text-xl">{PLATFORM_NAME}</span>
            </motion.div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Button
                key={link.href}
                asChild
                variant="ghost"
                className={`text-sm font-medium ${isActive(link.href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Link to={link.href} aria-current={isActive(link.href) ? "page" : undefined}>{link.label}</Link>
              </Button>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 transition-colors hover:bg-muted"
                    aria-label="Open account menu"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-primary">
                      <span className="text-sm font-medium text-white">{profile?.full_name?.[0] || user.email?.[0]?.toUpperCase()}</span>
                    </div>
                    <span className="hidden max-w-32 truncate text-sm font-medium lg:block">{profile?.full_name || "Account"}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </motion.button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/settings" className="flex items-center gap-2"><User className="h-4 w-4" />{profile?.full_name || "My Profile"}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center gap-2"><LayoutDashboard className="h-4 w-4" />Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowSignOutDialog(true)} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button asChild variant="ghost" className="text-sm"><Link to="/login">Sign in</Link></Button>
                <Button asChild className="gap-2 text-sm"><Link to="/register">Start selling now <ArrowRight className="h-4 w-4" /></Link></Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <ThemeToggle />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-muted"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="md:hidden border-t border-border/70 bg-background/95 backdrop-blur-xl"
            >
              <nav className="container flex flex-col gap-1 py-4" aria-label="Mobile navigation">
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Explore Mirvyn</p>
                {navLinks.map((link) => (
                  <Button key={link.href} asChild variant="ghost" className="min-h-11 justify-start text-base">
                    <Link to={link.href} aria-current={isActive(link.href) ? "page" : undefined}>{link.label}</Link>
                  </Button>
                ))}
                <div className="my-2 border-t border-border/70" />
                {user ? (
                  <>
                    <Button asChild variant="ghost" className="min-h-11 justify-start text-base"><Link to="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" />Open dashboard</Link></Button>
                    <Button asChild variant="ghost" className="min-h-11 justify-start text-base"><Link to="/dashboard/settings"><User className="mr-2 h-4 w-4" />My profile</Link></Button>
                    <Button variant="ghost" className="min-h-11 justify-start text-base text-destructive" onClick={() => setShowSignOutDialog(true)}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button asChild variant="outline" className="min-h-11"><Link to="/login">Sign in</Link></Button>
                    <Button asChild className="min-h-11"><Link to="/register">Get started</Link></Button>
                  </div>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <SignOutDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog} onConfirm={handleSignOutConfirm} isLoading={isSigningOut} />
    </>
  );
}
