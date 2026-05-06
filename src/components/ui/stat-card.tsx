import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "secondary" | "accent" | "success" | "warning";
  className?: string;
}

const variantStyles = {
  default: "bg-card",
  primary: "bg-primary/10 border-primary/20",
  secondary: "bg-secondary/10 border-secondary/20",
  accent: "bg-accent/10 border-accent/20",
  success: "bg-success/10 border-success/20",
  warning: "bg-warning/10 border-warning/20",
};

const iconVariantStyles = {
  default: "text-muted-foreground bg-muted",
  primary: "text-primary bg-primary/20",
  secondary: "text-secondary bg-secondary/20",
  accent: "text-accent bg-accent/20",
  success: "text-success bg-success/20",
  warning: "text-warning bg-warning/20",
};

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  className,
}, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border p-4 sm:p-6 shadow-sm transition-shadow hover:shadow-md overflow-hidden",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight break-all leading-tight">{value}</p>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                "text-xs sm:text-sm font-medium",
                trend.isPositive ? "text-success" : "text-destructive"
              )}
            >
              {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "rounded-lg p-2 sm:p-3 shrink-0",
              iconVariantStyles[variant]
            )}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        )}
      </div>
    </div>
  );
});
