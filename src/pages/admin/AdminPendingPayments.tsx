import { motion } from "framer-motion";
import { Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";

type Status = "all" | "pending" | "verified" | "failed" | "expired";

interface PendingPayment {
  id: string;
  user_id: string;
  email: string;
  purpose: string;
  reference: string;
  expected_amount: number;
  status: string;
  created_at: string;
  failed_at?: string | null;
  failure_reason?: string | null;
  verified_at?: string | null;
  metadata?: Record<string, unknown>;
}

export default function AdminPendingPayments() {
  const [filter, setFilter] = useState<Status>("pending");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pending-payments", filter],
    queryFn: async () => {
      let q = supabase.from("pending_payments").select("*").order("created_at", { ascending: false }).limit(200);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as PendingPayment[];
    },
  });

  const runCleanup = async () => {
    const { error } = await supabase.functions.invoke("cleanup-stale-payments");
    if (error) { toast.error("Cleanup failed"); return; }
    toast.success("Stale payments expired");
    refetch();
  };

  const badge = (status: string) => {
    if (status === "verified") return <Badge className="bg-success text-success-foreground"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
    if (status === "failed") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    if (status === "expired") return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Expired</Badge>;
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pending Payments</h1>
            <p className="text-muted-foreground text-sm">Live view of every payment intent. Features only activate after `verified`.</p>
          </div>
          <Button size="sm" variant="outline" onClick={runCleanup}>Expire Stale (&gt;30min)</Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["pending", "verified", "failed", "expired", "all"] as Status[]).map((s) => (
            <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)} className="min-h-[40px] capitalize">
              {s}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><AnimatedLoading size="lg" /></div>
        ) : !data?.length ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No payments in this state.</div>
        ) : (
          <motion.div className="space-y-3">
            {data.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-sm truncate">{p.email}</p>
                        {badge(p.status)}
                        <Badge variant="outline" className="capitalize text-xs">{p.purpose.replace(/_/g, " ")}</Badge>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground mt-1 truncate">{p.reference}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(Number(p.expected_amount))} • {formatDate(p.created_at)}
                      </p>
                      {p.failure_reason && (
                        <p className="text-xs text-destructive mt-1">{p.failure_reason}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}