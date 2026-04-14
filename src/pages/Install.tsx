import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Download, Smartphone, CheckCircle, ArrowRight, Wifi, Bell, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PLATFORM_NAME } from "@/lib/constants";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: boolean }).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => setIsInstalled(true);

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    { icon: Zap, title: "Lightning Fast", desc: "Instant load times with offline support" },
    { icon: Bell, title: "Push Notifications", desc: "Get notified about sales and commissions" },
    { icon: Wifi, title: "Works Offline", desc: "Access your dashboard without internet" },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg space-y-6"
      >
        {/* Logo */}
        <div className="text-center">
          <Link to="/">
            <span className="text-3xl font-bold text-gradient-primary">{PLATFORM_NAME}</span>
          </Link>
          <p className="mt-2 text-muted-foreground">Install the app for the best experience</p>
        </div>

        {/* App Preview Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <img src="/pwa-192x192.png" alt="Mirvyn" className="h-16 w-16 rounded-2xl shadow-lg" />
              <div>
                <h2 className="text-xl font-bold">{PLATFORM_NAME}</h2>
                <p className="text-sm text-muted-foreground">Affiliate Commerce Platform</p>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <f.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Install Actions */}
            {isInstalled ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
                <CheckCircle className="h-6 w-6 text-success" />
                <div>
                  <p className="font-semibold text-success">App Installed!</p>
                  <p className="text-sm text-muted-foreground">You can now use Mirvyn from your home screen</p>
                </div>
              </div>
            ) : isIOS ? (
              <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
                <p className="font-semibold flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  Install on iOS
                </p>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-primary">1.</span>
                    Tap the <strong>Share</strong> button in Safari
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-primary">2.</span>
                    Scroll down and tap <strong>"Add to Home Screen"</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-primary">3.</span>
                    Tap <strong>"Add"</strong> to install
                  </li>
                </ol>
              </div>
            ) : deferredPrompt ? (
              <Button onClick={handleInstall} className="w-full" size="lg">
                <Download className="mr-2 h-5 w-5" />
                Install Mirvyn
              </Button>
            ) : (
              <div className="text-center text-sm text-muted-foreground p-4 rounded-lg bg-muted/50">
                <p>Open this page in Chrome or Edge on your phone to install the app</p>
              </div>
            )}

            <Link to="/dashboard">
              <Button variant="outline" className="w-full">
                Continue to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
