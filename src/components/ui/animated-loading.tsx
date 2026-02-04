import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedLoadingProps {
  className?: string;
  text?: string;
  size?: "sm" | "md" | "lg";
}

export function AnimatedLoading({ className, text, size = "md" }: AnimatedLoadingProps) {
  const dotSize = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  const containerSize = {
    sm: "gap-1",
    md: "gap-1.5",
    lg: "gap-2",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className={cn("flex items-center", containerSize[size])}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={cn("rounded-full bg-primary", dotSize[size])}
            animate={{
              y: [0, -10, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-sm text-muted-foreground"
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
}

export function LoadingOverlay({ isLoading, text }: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <AnimatedLoading size="lg" text={text} />
    </motion.div>
  );
}
