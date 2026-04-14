import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const clientHeight = window.innerHeight;
      
      // Show button when page is scrolled 300px
      setIsVisible(scrollTop > 300);
      
      // Check if near bottom (within 100px)
      setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 100);
    };

    window.addEventListener("scroll", toggleVisibility, { passive: true });
    toggleVisibility(); // Check initial state

    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            onClick={isAtBottom ? scrollToTop : scrollToBottom}
            size="icon"
            aria-label={isAtBottom ? "Scroll to top" : "Scroll to bottom"}
            className={cn(
              "h-12 w-12 rounded-full shadow-lg transition-all",
              "bg-primary hover:bg-primary/90",
              "hover:shadow-xl hover:scale-105"
            )}
          >
            {isAtBottom ? (
              <ArrowUp className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ArrowDown className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
