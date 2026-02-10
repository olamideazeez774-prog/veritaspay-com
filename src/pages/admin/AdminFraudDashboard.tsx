import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, AlertTriangle, CheckCircle, XCircle, Eye, Ban, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useFraudEvents, useFraudStats, useUpdateFraudEvent, FraudEvent } from "@/hooks/useFraudEvents";
import { useAIInsight } from "@/hooks/useAIInsights";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { StatCard } from "@/components/ui/stat-card";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { formatDateTime } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AdminFraudDashboard() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: events, isLoading } = useFraudEvents(statusFilter);
  const { data: stats } = useFraudStats();
  const updateEvent = useUpdateFraudEvent();
  const aiInsight = useAIInsight();
  const [selected, setSelected] = useState<FraudEvent | null>(null);
  const [notes, setNotes] = useState("");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());

  const getSeverityColor = (s: string) => {
    switch (s) {
      case "critical": return "bg-destructive text-destructive-foreground";
      case "high": return "bg-warning text-warning-foreground";
      case "medium": return "bg-info/10 text-info border-info/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleAIAnalysis = async () => {
    if (!selected) return;
    setAiResult("Analyzing...");
    aiInsight.mutate(
      { type: "fraud_scoring", data: selected },
      { onSuccess: (result) => setAiResult(result), onError: () => setAiResult("Analysis failed.") }
    );
  };

  const toggleBulk = (id: string) => {
    setBulkSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!events) return;
    if (bulkSelected.size === events.length) {
      setBulkSelected(new Set());
    } else {
      setBulkSelected(new Set(events.map(e => e.id)));
    }
  };

  const bulkAction = async (status: "dismissed" | "confirmed") => {
    const ids = [...bulkSelected];
    if (!ids.length) return;
    for (const id of ids) {
      await updateEvent.mutateAsync({ id, status, commission_held: status === "confirmed" } as any);
    }
    setBulkSelected(new Set());
    toast.success(`${ids.length} events ${status}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Anti-Fraud Dashboard</h1>
          <p className="text-muted-foreground text-sm">Monitor and manage fraud detection events</p>
        </div>

        {stats && (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Flags" value={stats.total.toString()} icon={ShieldAlert} />
            <StatCard title="Pending Review" value={stats.flagged.toString()} icon={AlertTriangle} variant="warning" />
            <StatCard title="Critical" value={stats.critical.toString()} icon={Ban} variant="accent" />
            <StatCard title="Confirmed Fraud" value={stats.confirmed.toString()} icon={XCircle} variant="primary" />
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
          {bulkSelected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{bulkSelected.size} selected</span>
              <Button variant="outline" size="sm" onClick={() => bulkAction("dismissed")}>
                <CheckCircle className="h-4 w-4 mr-1" />Dismiss All
              </Button>
              <Button variant="destructive" size="sm" onClick={() => bulkAction("confirmed")}>
                <Ban className="h-4 w-4 mr-1" />Confirm All
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><AnimatedLoading size="lg" text="Loading fraud events..." /></div>
        ) : !events?.length ? (
          <div className="text-center py-12">
            <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold">No fraud events</h3>
            <p className="text-sm text-muted-foreground">The platform is clean!</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-1">
              <Checkbox checked={events.length > 0 && bulkSelected.size === events.length} onCheckedChange={selectAll} />
              <span className="text-xs text-muted-foreground">Select all</span>
            </div>
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
              {events.map((event) => (
                <motion.div key={event.id} variants={staggerItem} className="glass-card p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Checkbox checked={bulkSelected.has(event.id)} onCheckedChange={() => toggleBulk(event.id)} className="mt-1" />
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={getSeverityColor(event.severity)}>{event.severity}</Badge>
                          <span className="text-sm font-medium">{event.event_type.replace(/_/g, " ")}</span>
                          <Badge variant="outline">{event.status}</Badge>
                          {event.commission_held && <Badge variant="destructive">Commission Held</Badge>}
                        </div>
                        <p className="text-sm text-foreground truncate">{event.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(event.created_at)}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setSelected(event); setNotes(event.admin_notes || ""); setAiResult(null); }}>
                      <Eye className="h-4 w-4 mr-1" /> Review
                    </Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Review Fraud Event</DialogTitle></DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium">{selected.event_type}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Severity</span><Badge className={getSeverityColor(selected.severity)}>{selected.severity}</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{selected.status}</span></div>
                  {selected.ip_address && <div className="flex justify-between"><span className="text-muted-foreground">IP</span><span className="font-mono text-xs">{selected.ip_address}</span></div>}
                  {selected.device_fingerprint && <div className="flex justify-between"><span className="text-muted-foreground">Device</span><span className="font-mono text-xs truncate max-w-[200px]">{selected.device_fingerprint}</span></div>}
                </div>
                <p className="text-sm">{selected.description}</p>
                <Button variant="outline" size="sm" onClick={handleAIAnalysis} disabled={aiInsight.isPending}>
                  <Sparkles className="h-4 w-4 mr-2" />AI Analysis
                </Button>
                {aiResult && <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm whitespace-pre-wrap">{aiResult}</div>}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin Notes</label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => { updateEvent.mutate({ id: selected!.id, status: "dismissed", admin_notes: notes } as any); setSelected(null); }}>
                <CheckCircle className="h-4 w-4 mr-1" />Dismiss
              </Button>
              <Button variant="destructive" size="sm" onClick={() => { updateEvent.mutate({ id: selected!.id, status: "confirmed", admin_notes: notes, commission_held: true } as any); setSelected(null); }}>
                <Ban className="h-4 w-4 mr-1" />Confirm Fraud
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
