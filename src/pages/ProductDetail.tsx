import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Package,
  ShoppingCart,
  Link2,
  Check,
  Clock,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { useProduct } from "@/hooks/useProducts";
import { useCreateAffiliateLink } from "@/hooks/useAffiliateLinks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/animations";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ShareMenu } from "@/components/ui/share-menu";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { ScarcityTimer } from "@/components/ScarcityTimer";
import { useQuery } from "@tanstack/react-query";

export default function ProductDetail() {
  const { id, code } = useParams();
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const [productId, setProductId] = useState<string | null>(id || null);
  const [affiliateCode, setAffiliateCode] = useState<string | null>(code || null);
  const [isTrackingClick, setIsTrackingClick] = useState(false);
  const { data: product, isLoading, error } = useProduct(productId || "");
  const createAffiliateLink = useCreateAffiliateLink();

  // Check for active coupons with expiry (scarcity timer) - MUST be before any early return
  const { data: activeCoupon } = useQuery({
    queryKey: ["product-coupon", product?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_coupons")
        .select("*")
        .eq("product_id", product!.id)
        .eq("is_active", true)
        .not("expires_at", "is", null)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!product?.id,
  });

  // If we have a code, look up the product and track click using edge function
  useEffect(() => {
    if (code && !id) {
      const lookupAndTrack = async () => {
        setIsTrackingClick(true);
        try {
          const { data, error } = await supabase.functions.invoke("track-click", {
            body: {
              code,
              referrer: document.referrer || null,
              userAgent: navigator.userAgent,
            },
          });

          if (error) {
            console.error("Error tracking click:", error);
            const { data: linkData } = await supabase
              .from("affiliate_links")
              .select("product_id")
              .eq("unique_code", code)
              .maybeSingle();

            if (linkData) {
              setProductId(linkData.product_id);
              setAffiliateCode(code);
            }
          } else if (data?.productId) {
            setProductId(data.productId);
            setAffiliateCode(code);
            
            localStorage.setItem("affiliate_code", code);
            localStorage.setItem("affiliate_code_timestamp", Date.now().toString());
          }
        } catch (err) {
          console.error("Error in click tracking:", err);
        } finally {
          setIsTrackingClick(false);
        }
      };
      lookupAndTrack();
    }
  }, [code, id]);

  const features = [
    { icon: Clock, label: `${product.refund_window_days}-day refund window` },
    { icon: Shield, label: "Secure checkout" },
    { icon: Check, label: "Instant delivery" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-8 sm:py-12">
        <div className="container mx-auto px-4">
          {/* Back Link */}
          <Link
            to="/marketplace"
            className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Marketplace
          </Link>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid gap-8 lg:grid-cols-2"
          >
            {/* Product Image */}
            <motion.div variants={staggerItem}>
              <div className="aspect-video overflow-hidden rounded-xl bg-muted glass-card">
                {product.cover_image_url ? (
                  <img
                    src={product.cover_image_url}
                    alt={product.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                    <Package className="h-24 w-24 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Product Info */}
            <motion.div variants={staggerItem} className="space-y-6">
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {product.affiliate_enabled && (
                    <Badge variant="secondary">{product.commission_percent}% Commission</Badge>
                  )}
                </div>
                <h1 className="font-serif text-3xl font-bold sm:text-4xl">{product.title}</h1>
                <p className="mt-4 text-lg text-muted-foreground">{product.description}</p>
              </div>

              {/* Scarcity Timer */}
              {activeCoupon?.expires_at && (
                <ScarcityTimer
                  endDate={activeCoupon.expires_at}
                  label={`${activeCoupon.discount_percent > 0 ? activeCoupon.discount_percent + '% off' : formatCurrency(activeCoupon.discount_amount) + ' off'} — ends in`}
                />
              )}

              {/* Price */}
              <div className="glass-card p-6 space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-primary">
                    {formatCurrency(product.price)}
                  </span>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <feature.icon className="h-4 w-4 text-success" />
                      {feature.label}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-2">
                  <Link to={`/checkout/${product.id}${affiliateCode ? `?ref=${affiliateCode}` : ""}`} className="block">
                    <Button size="lg" className="w-full">
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      Buy Now
                    </Button>
                  </Link>

                  <div className="flex gap-3">
                    {product.affiliate_enabled && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleGenerateLink}
                        disabled={createAffiliateLink.isPending}
                      >
                        <Link2 className="mr-2 h-4 w-4" />
                        {createAffiliateLink.isPending ? "Generating..." : "Affiliate Link"}
                      </Button>
                    )}
                    <ShareMenu
                      url={shareUrl}
                      title={`Check out ${product.title}!`}
                      variant="ghost"
                      size="icon"
                    />
                  </div>
                </div>
              </div>

              {/* Affiliate Info */}
              {product.affiliate_enabled && (
                <motion.div
                  variants={fadeInUp}
                  className="glass-card p-6 bg-gradient-to-br from-primary/5 to-accent/5"
                >
                  <h3 className="font-semibold mb-2">Earn as an Affiliate</h3>
                  <p className="text-sm text-muted-foreground">
                    Promote this product and earn{" "}
                    <span className="font-bold text-primary">{product.commission_percent}%</span>{" "}
                    commission on every sale. Cookie duration:{" "}
                    <span className="font-medium">{product.cookie_duration_days} days</span>.
                  </p>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
