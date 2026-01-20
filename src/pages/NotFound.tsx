import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLATFORM_NAME } from "@/lib/constants";
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/animations";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-hero p-4">
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="text-center max-w-md"
      >
        {/* 404 Display */}
        <motion.div variants={staggerItem} className="mb-8">
          <div className="relative">
            <span className="text-[150px] sm:text-[200px] font-bold text-primary/10 font-serif leading-none select-none">
              404
            </span>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="h-20 w-20 rounded-full glass-card flex items-center justify-center">
                <Search className="h-10 w-10 text-primary" />
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Message */}
        <motion.h1
          variants={staggerItem}
          className="font-serif text-3xl sm:text-4xl font-bold mb-4"
        >
          Page Not Found
        </motion.h1>
        
        <motion.p
          variants={staggerItem}
          className="text-muted-foreground text-lg mb-8"
        >
          The page you're looking for doesn't exist or has been moved. 
          Let's get you back on track.
        </motion.p>

        {/* Actions */}
        <motion.div
          variants={staggerItem}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link to="/">
            <Button size="lg" className="gap-2">
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <Link to="/marketplace">
            <Button variant="outline" size="lg" className="gap-2">
              Browse Marketplace
            </Button>
          </Link>
        </motion.div>

        {/* Brand */}
        <motion.p
          variants={staggerItem}
          className="mt-12 text-sm text-muted-foreground"
        >
          © {new Date().getFullYear()} {PLATFORM_NAME}
        </motion.p>
      </motion.div>
    </div>
  );
}