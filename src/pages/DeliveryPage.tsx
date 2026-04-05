import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Download, ExternalLink, Clock, Shield, CheckCircle, AlertCircle, Copy, Mail } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/animations";

interface DeliveryData {
  sale: {
    id: string;
    buyerEmail: string;
    totalAmount: number;
    createdAt: string;
    paymentReference: string;
    deliveryToken: string;
    deliveryMethod: "file_download" | "external_link" | "manual";
    deliveredAt: string;
    refundEligibleUntil: string;
    refundEligible: boolean;
    accessCount: number;
  };
  product: {
    id: string;
    title: string;
    description: string;
    fileUrl?: string;
    externalUrl?: string;
    coverImageUrl?: string;
    vendorName: string;
    vendorEmail?: string;
  };
}

export default function DeliveryPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<DeliveryData | null>(null);

  const token = searchParams.get("token");
  const saleId = searchParams.get("sale");
  const email = searchParams.get("email");

  useEffect(() => {
    const fetchDelivery = async () => {
      try {
        // Must have either token OR (sale + email)
        if (!token && (!saleId || !email)) {
          setError("Invalid access link. Please use the link from your email.");
          setLoading(false);
          return;
        }

        const { data: deliveryData, error: deliveryError } = await supabase.functions.invoke("get-delivery", {
          body: {
            token: token || undefined,
            saleId: saleId || undefined,
            email: email || undefined,
          },
        });

        if (deliveryError) {
          throw deliveryError;
        }

        if (deliveryData?.error) {
          throw new Error(deliveryData.error);
        }

        setData(deliveryData);
      } catch (err: unknown) {
        console.error("Delivery fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to load your purchase");
      } finally {
        setLoading(false);
      }
    };

    fetchDelivery();
  }, [token, saleId, email]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleDownload = () => {
    if (data?.product.fileUrl) {
      // Increment access count visually
      if (data) {
        setData({
          ...data,
          sale: { ...data.sale, accessCount: data.sale.accessCount + 1 },
        });
      }
      window.open(data.product.fileUrl, "_blank");
    }
  };

  const handleExternalAccess = () => {
    if (data?.product.externalUrl) {
      // Increment access count visually
      if (data) {
        setData({
          ...data,
          sale: { ...data.sale, accessCount: data.sale.accessCount + 1 },
        });
      }
      window.open(data.product.externalUrl, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-muted-foreground">Loading your purchase...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="container mx-auto px-4 max-w-md"
          >
            <div className="glass-card p-8 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-xl font-semibold mb-2">Access Denied</h1>
              <p className="text-muted-foreground mb-6">{error}</p>
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link to="/marketplace">Browse Products</Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Need help? Contact the vendor or support.
                </p>
              </div>
            </div>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!data) return null;

  const { sale, product } = data;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-8 sm:py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-6"
          >
            {/* Success Header */}
            <motion.div variants={staggerItem} className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">Your Purchase is Ready!</h1>
              <p className="text-muted-foreground mt-2">
                Thank you for your purchase. Access your product below.
              </p>
            </motion.div>

            {/* Product Card */}
            <motion.div variants={staggerItem} className="glass-card p-6">
              <div className="flex gap-4 items-start">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {product.coverImageUrl ? (
                    <img
                      src={product.coverImageUrl}
                      alt={product.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                      <Package className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-lg">{product.title}</h2>
                  <p className="text-sm text-muted-foreground">by {product.vendorName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Purchased: {formatDate(sale.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(sale.totalAmount)}</p>
                  <p className="text-xs text-muted-foreground">{sale.paymentReference}</p>
                </div>
              </div>
            </motion.div>

            {/* Delivery Section */}
            <motion.div variants={staggerItem} className="glass-card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Access Your Product
              </h3>

              {/* File Download */}
              {sale.deliveryMethod === "file_download" && product.fileUrl && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Your digital product is ready for download. Click below to get your file.
                  </p>
                  <Button size="lg" className="w-full" onClick={handleDownload}>
                    <Download className="mr-2 h-5 w-5" />
                    Download Product
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    File downloads may be limited. Please save your file securely.
                  </p>
                </div>
              )}

              {/* External Link */}
              {sale.deliveryMethod === "external_link" && product.externalUrl && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Access your product through the external platform. Click below to continue.
                  </p>
                  <Button size="lg" className="w-full" onClick={handleExternalAccess}>
                    <ExternalLink className="mr-2 h-5 w-5" />
                    Access Product
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    You will be redirected to the vendor&apos;s platform.
                  </p>
                </div>
              )}

              {/* Manual Delivery */}
              {sale.deliveryMethod === "manual" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                    <p className="text-sm">
                      <strong>Manual Delivery:</strong> The vendor will contact you directly at{" "}
                      <strong>{sale.buyerEmail}</strong> with access instructions.
                    </p>
                  </div>
                  {product.vendorEmail && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(`mailto:${product.vendorEmail}`)}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Contact Vendor
                    </Button>
                  )}
                </div>
              )}
            </motion.div>

            {/* Order Info */}
            <motion.div variants={staggerItem} className="glass-card p-6">
              <h3 className="font-semibold mb-4">Order Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono">{sale.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Reference</span>
                  <span className="font-mono">{sale.paymentReference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Buyer Email</span>
                  <span>{sale.buyerEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Access Count</span>
                  <span>{sale.accessCount} time(s)</span>
                </div>
                {sale.refundEligible && (
                  <div className="flex justify-between items-center text-success">
                    <span className="flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      Refund Available Until
                    </span>
                    <span>{formatDate(sale.refundEligibleUntil)}</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Permanent Access Link */}
            <motion.div variants={staggerItem} className="glass-card p-6">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Permanent Access Link
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Save this link to access your purchase anytime without logging in.
              </p>
              <div className="flex gap-2">
                <code className="flex-1 p-3 rounded bg-muted text-xs break-all">
                  {`${window.location.origin}/delivery?token=${sale.deliveryToken}`}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    copyToClipboard(`${window.location.origin}/delivery?token=${sale.deliveryToken}`)
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div variants={staggerItem} className="flex flex-col sm:flex-row gap-3">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/marketplace">Browse More Products</Link>
              </Button>
              <Button asChild className="flex-1">
                <Link to="/">Go Home</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
