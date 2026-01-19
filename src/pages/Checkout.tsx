import { useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Lock, Mail, User, AlertCircle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useProduct } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatCurrency } from "@/lib/format";
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/animations";
import { toast } from "sonner";
import { PLATFORM_NAME } from "@/lib/constants";

export default function Checkout() {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const affiliateCode = searchParams.get("ref");
  const { data: product, isLoading } = useProduct(productId || "");
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.name) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsProcessing(true);
    
    // Simulate payment processing (will be replaced with Paystack)
    setTimeout(() => {
      toast.success("Payment successful!");
      navigate("/checkout/success");
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
        <Footer />
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
        <Footer />
      </div>
    );
  }

  const platformFee = product.price * (product.platform_fee_percent / 100);
  const vendorEarnings = product.price - platformFee;
  const affiliateCommission = affiliateCode
    ? vendorEarnings * (product.commission_percent / 100)
    : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-8 sm:py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back Link */}
          <Link
            to={`/product/${productId}`}
            className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Product
          </Link>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid gap-8 lg:grid-cols-5"
          >
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
                        <Input
                          id="name"
                          type="text"
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="pl-10"
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your purchase details will be sent to this email.
                      </p>
                    </div>
                  </div>

                  {/* Payment Notice */}
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                    <div className="flex gap-3">
                      <CreditCard className="h-5 w-5 text-warning shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Payment Integration</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Secure payment processing via Paystack will be configured after API key setup.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Pay {formatCurrency(product.price)}
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </motion.div>

            {/* Order Summary */}
            <motion.div variants={staggerItem} className="lg:col-span-2">
              <div className="glass-card p-6 sticky top-6">
                <h2 className="font-semibold mb-4">Order Summary</h2>

                {/* Product */}
                <div className="flex gap-4 pb-4 border-b">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {product.cover_image_url ? (
                      <img
                        src={product.cover_image_url}
                        alt={product.title}
                        className="h-full w-full object-cover"
                      />
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

                {/* Pricing */}
                <div className="py-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(product.price)}</span>
                  </div>
                  {affiliateCode && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Referred by affiliate</span>
                      <span className="font-mono text-xs">{affiliateCode}</span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-bold text-primary">
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                </div>

                {/* Trust Badges */}
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

      <Footer />
    </div>
  );
}
