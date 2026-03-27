import { useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Lock, Mail, User, AlertCircle, Tag, Check, X } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useProduct } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatCurrency } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { toast } from "sonner";
import { PLATFORM_NAME } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";

export default function Checkout() {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const affiliateCode = searchParams.get("ref");
  const { data: product, isLoading } = useProduct(productId || "");

  const [formData, setFormData] = useState({ name: "", email: "" });
  const [isProcessing, setIsProcessing] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState<{
    code: string;
    discount_percent: number;
    discount_amount: number;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  const applyCoupon = async () => {
    if (!couponCode.trim() || !product) return;
    setCouponLoading(true);
    setCouponError("");

    try {
      const { data, error } = await supabase
        .from("vendor_coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase().trim())
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) {
        setCouponError("Invalid coupon code");
        setCouponApplied(null);
        return;
      }

      // Check product scope
      if (data.product_id && data.product_id !== product.id) {
        setCouponError("Coupon not valid for this product");
        setCouponApplied(null);
        return;
      }

      // Check vendor ownership
      if (data.vendor_id !== product.vendor_id) {
        setCouponError("Coupon not valid for this product");
        setCouponApplied(null);
        return;
      }

      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setCouponError("Coupon has expired");
        setCouponApplied(null);
        return;
      }

      // Check max uses
      if (data.max_uses && data.current_uses >= data.max_uses) {
        setCouponError("Coupon usage limit reached");
        setCouponApplied(null);
        return;
      }

      setCouponApplied({
        code: data.code,
        discount_percent: data.discount_percent,
        discount_amount: data.discount_amount,
      });
      toast.success("Coupon applied!");
    } catch {
      setCouponError("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponApplied(null);
    setCouponCode("");
    setCouponError("");
  };

  // Calculate discount
  const getDiscount = () => {
    if (!couponApplied || !product) return 0;
    if (couponApplied.discount_percent > 0) {
      return Math.round(product.price * (couponApplied.discount_percent / 100));
    }
    return Math.min(couponApplied.discount_amount, product.price);
  };

  const discount = getDiscount();
  const finalPrice = product ? Math.max(0, product.price - discount) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.name) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-sale", {
        body: {
          productId,
          buyerEmail: formData.email,
          buyerName: formData.name,
          affiliateCode: affiliateCode || undefined,
          paymentReference: `VP-${Date.now().toString(36).toUpperCase()}`,
          couponCode: couponApplied?.code || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Payment processed successfully!");
      navigate("/checkout/success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Payment failed";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-destructive/60" />
            <h2 className="mt-4 text-xl font-semibold">Product not found</h2>
            <Link to="/marketplace">
              <Button className="mt-6">Back to Marketplace</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8 sm:py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link
            to={`/product/${productId}`}
            className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Product
          </Link>

          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid gap-8 lg:grid-cols-5">
            {/* Checkout Form */}
            <motion.div variants={staggerItem} className="lg:col-span-3">
              <div className="glass-card p-6 sm:p-8">
                <h1 className="font-serif text-2xl font-bold mb-6">Checkout</h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="name" type="text" placeholder="John Doe" value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="pl-10" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="email" type="email" placeholder="john@example.com" value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="pl-10" required />
                      </div>
                      <p className="text-xs text-muted-foreground">Your purchase details will be sent to this email.</p>
                    </div>
                  </div>

                  {/* Coupon Section */}
                  <div className="space-y-2">
                    <Label>Coupon Code (optional)</Label>
                    {couponApplied ? (
                      <div className="flex items-center gap-2 p-3 rounded-lg border border-success/30 bg-success/5">
                        <Check className="h-4 w-4 text-success shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-success">
                            {couponApplied.code} — {couponApplied.discount_percent > 0
                              ? `${couponApplied.discount_percent}% off`
                              : `${formatCurrency(couponApplied.discount_amount)} off`}
                          </p>
                          <p className="text-xs text-muted-foreground">You save {formatCurrency(discount)}</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={removeCoupon} className="shrink-0 h-8 w-8">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input placeholder="Enter coupon code" value={couponCode}
                            onChange={(e) => { setCouponCode(e.target.value); setCouponError(""); }} className="pl-10" />
                        </div>
                        <Button type="button" variant="outline" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}>
                          {couponLoading ? <LoadingSpinner size="sm" /> : "Apply"}
                        </Button>
                      </div>
                    )}
                    {couponError && <p className="text-xs text-destructive">{couponError}</p>}
                  </div>

                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex gap-3">
                      <Lock className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Secure Payment</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Your payment is processed securely through {PLATFORM_NAME}.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" size="lg" className="w-full" disabled={isProcessing}>
                    {isProcessing ? (
                      <><LoadingSpinner size="sm" className="mr-2" />Processing...</>
                    ) : (
                      <><Lock className="mr-2 h-4 w-4" />Pay {formatCurrency(finalPrice)}</>
                    )}
                  </Button>
                </form>
              </div>
            </motion.div>

            {/* Order Summary */}
            <motion.div variants={staggerItem} className="lg:col-span-2">
              <div className="glass-card p-6 sticky top-6">
                <h2 className="font-semibold mb-4">Order Summary</h2>
                <div className="flex gap-4 pb-4 border-b">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {product.cover_image_url ? (
                      <img src={product.cover_image_url} alt={product.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                        <CreditCard className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium line-clamp-2">{product.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Digital Product</p>
                  </div>
                </div>

                <div className="py-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(product.price)}</span>
                  </div>
                  {couponApplied && discount > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Discount ({couponApplied.code})</span>
                      <span>-{formatCurrency(discount)}</span>
                    </div>
                  )}
                  {affiliateCode && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Referred by affiliate</span>
                      <span className="font-mono text-xs">{affiliateCode}</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total</span>
                    <div className="text-right">
                      {discount > 0 && (
                        <span className="text-sm text-muted-foreground line-through mr-2">{formatCurrency(product.price)}</span>
                      )}
                      <span className="text-xl font-bold text-primary">{formatCurrency(finalPrice)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    <span>Secured by {PLATFORM_NAME}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
