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
        "rounded-xl border p-6 shadow-sm transition-shadow hover:shadow-md",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                "text-sm font-medium",
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
              "rounded-lg p-3",
              iconVariantStyles[variant]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
});
