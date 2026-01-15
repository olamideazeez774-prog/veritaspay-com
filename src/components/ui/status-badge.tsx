import { cn } from "@/lib/utils";
import { Badge } from "./badge";

type StatusType = 
  | "draft" 
  | "active" 
  | "paused" 
  | "pending" 
  | "completed" 
  | "refunded" 
  | "processing" 
  | "paid" 
  | "rejected"
  | "approved"
  | "unapproved";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  draft: { label: "Draft", variant: "secondary", className: "bg-muted text-muted-foreground" },
  active: { label: "Active", variant: "default", className: "bg-success text-success-foreground" },
  paused: { label: "Paused", variant: "outline", className: "border-warning text-warning" },
  pending: { label: "Pending", variant: "outline", className: "border-warning text-warning bg-warning/10" },
  completed: { label: "Completed", variant: "default", className: "bg-success text-success-foreground" },
  refunded: { label: "Refunded", variant: "destructive", className: "" },
  processing: { label: "Processing", variant: "outline", className: "border-info text-info bg-info/10" },
  paid: { label: "Paid", variant: "default", className: "bg-success text-success-foreground" },
  rejected: { label: "Rejected", variant: "destructive", className: "" },
  approved: { label: "Approved", variant: "default", className: "bg-success text-success-foreground" },
  unapproved: { label: "Pending Approval", variant: "outline", className: "border-warning text-warning bg-warning/10" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant={config.variant} 
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
