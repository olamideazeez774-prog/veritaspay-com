import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface AnimatedCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  variant?: "default" | "glass" | "neu" | "gradient";
  hover?: boolean;
  delay?: number;
}

export function AnimatedCard({
  children,
  className,
  variant = "default",
  hover = true,
  delay = 0,
  ...props
}: AnimatedCardProps) {
  const variants = {
    default: "bg-card border border-border rounded-xl shadow-soft",
    glass: "glass-card",
    neu: "neu",
    gradient: "gradient-border bg-card rounded-xl",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={
        hover
          ? {
              y: -4,
              boxShadow: "0 20px 40px -15px hsl(var(--foreground) / 0.1)",
              transition: { duration: 0.3 },
            }
          : undefined
      }
      className={cn(variants[variant], "p-6", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
