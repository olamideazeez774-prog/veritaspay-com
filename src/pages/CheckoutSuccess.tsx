import { motion } from "framer-motion";
<<<<<<< HEAD
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, Package, Mail, ArrowRight, ExternalLink } from "lucide-react";
=======
import { Link } from "react-router-dom";
import { CheckCircle, Download, Mail, ArrowRight } from "lucide-react";
>>>>>>> f489145b3129b44a12bc2175e550b4f4cac8faff
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/animations";
import { PLATFORM_NAME } from "@/lib/constants";
<<<<<<< HEAD
import { useEffect, useState } from "react";

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const [deliveryUrl, setDeliveryUrl] = useState<string | null>(null);

  useEffect(() => {
    // Check for sale ID in sessionStorage from the callback
    const saleId = sessionStorage.getItem("last_sale_id");
    if (saleId) {
      // Clear it after reading
      sessionStorage.removeItem("last_sale_id");
    }
  }, []);

=======

export default function CheckoutSuccess() {
>>>>>>> f489145b3129b44a12bc2175e550b4f4cac8faff
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex items-center justify-center py-12">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="container mx-auto px-4 max-w-lg text-center"
        >
          {/* Success Icon */}
          <motion.div variants={staggerItem}>
            <div className="mx-auto w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={staggerItem}
            className="font-serif text-3xl font-bold sm:text-4xl"
          >
            Payment Successful!
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={staggerItem}
            className="mt-4 text-lg text-muted-foreground"
          >
            Thank you for your purchase. Your order has been confirmed.
          </motion.p>

          {/* Info Cards */}
          <motion.div variants={staggerItem} className="mt-8 space-y-4">
            <div className="glass-card p-4 flex items-center gap-4 text-left">
<<<<<<< HEAD
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                <Package className="h-5 w-5 text-success" />
              </div>
              <div>
                <h3 className="font-medium">Access Your Product</h3>
                <p className="text-sm text-muted-foreground">
                  Check your email for the delivery link, or access your purchase below.
                </p>
              </div>
            </div>

            <div className="glass-card p-4 flex items-center gap-4 text-left">
=======
>>>>>>> f489145b3129b44a12bc2175e550b4f4cac8faff
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Check Your Email</h3>
                <p className="text-sm text-muted-foreground">
<<<<<<< HEAD
                  We've sent your receipt with permanent access link to your email.
=======
                  We've sent your receipt and download instructions to your email.
                </p>
              </div>
            </div>

            <div className="glass-card p-4 flex items-center gap-4 text-left">
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <Download className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="font-medium">Instant Access</h3>
                <p className="text-sm text-muted-foreground">
                  Your digital product is ready to download right away.
>>>>>>> f489145b3129b44a12bc2175e550b4f4cac8faff
                </p>
              </div>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div variants={staggerItem} className="mt-8 flex flex-col gap-3">
<<<<<<< HEAD
            <Link to="/delivery">
              <Button size="lg" className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                Access My Purchase
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button variant="outline" size="lg" className="w-full">
=======
            <Link to="/marketplace">
              <Button size="lg" className="w-full">
>>>>>>> f489145b3129b44a12bc2175e550b4f4cac8faff
                Continue Shopping
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground">
              Need help? Contact {PLATFORM_NAME} support.
            </p>
          </motion.div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
