import { useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, Plus, Play, Pause, CheckCircle, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { formatDate } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

const EXPERIMENT_TYPES = [
  { value: "commission_rate", label: "Commission Rates" },
  { value: "vendor_fee", label: "Vendor Fees" },
  { value: "ranking_rule", label: "Ranking Rules" },
  { value: "promo_boost", label: "Promo Boosts" },
  { value: "payout_timing", label: "Payout Timing" },
];

interface Experiment {
  id: string;
  name: string;
  experiment_type: string;
  variants: Json;
  status: string;
  results: Json | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminExperiments() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", experiment_type: "commission_rate", variants: "" });

  const { data: experiments, isLoading } = useQuery({
    queryKey: ["experiments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("experiments").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Experiment[];
    },
  });

  const createExperiment = useMutation({
    mutationFn: async (exp: { name: string; experiment_type: string; variants: Json }) => {
      const { error } = await supabase.from("experiments").insert({ ...exp, created_by: user?.id || null });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["experiments"] }); toast.success("Experiment created"); setShowCreate(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("experiments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["experiments"] }); toast.success("Status updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteExperiment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("experiments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["experiments"] }); toast.success("Experiment deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCreate = () => {
    let variants: Json;
    try {
      variants = JSON.parse(form.variants || "[]");
    } catch {
      variants = [{ name: "Control", value: form.variants }] as Json;
    }
    createExperiment.mutate({ name: form.name, experiment_type: form.experiment_type, variants });
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "running": return "bg-success/10 text-success border-success/20";
      case "completed": return "bg-primary/10 text-primary border-primary/20";
      case "paused": return "bg-warning/10 text-warning border-warning/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <FlaskConical className="h-7 w-7 text-primary" /> Experiments
            </h1>
            <p className="text-muted-foreground text-sm">A/B test commission rates, fees, ranking rules, and more</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="min-h-[44px]"><Plus className="h-4 w-4 mr-2" />New Experiment</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><AnimatedLoading size="lg" text="Loading experiments..." /></div>
        ) : !experiments?.length ? (
          <div className="text-center py-12">
            <FlaskConical className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold">No experiments yet</h3>
            <p className="text-sm text-muted-foreground">Create your first A/B test to optimize the platform.</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
            {experiments.map((exp) => (
              <motion.div key={exp.id} variants={staggerItem} className="glass-card p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="font-semibold">{exp.name}</h3>
                      <Badge className={getStatusColor(exp.status)}>{exp.status}</Badge>
                      <Badge variant="outline">{EXPERIMENT_TYPES.find(t => t.value === exp.experiment_type)?.label || exp.experiment_type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Created {formatDate(exp.created_at)}</p>
                    {exp.variants && (
                      <p className="text-sm text-muted-foreground truncate">Variants: {JSON.stringify(exp.variants)}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {exp.status === "draft" && (
                      <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => updateStatus.mutate({ id: exp.id, status: "running" })}>
                        <Play className="h-4 w-4 mr-1" />Start
                      </Button>
                    )}
                    {exp.status === "running" && (
                      <>
                        <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => updateStatus.mutate({ id: exp.id, status: "paused" })}>
                          <Pause className="h-4 w-4 mr-1" />Pause
                        </Button>
                        <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => updateStatus.mutate({ id: exp.id, status: "completed" })}>
                          <CheckCircle className="h-4 w-4 mr-1" />Complete
                        </Button>
                      </>
                    )}
                    {exp.status === "paused" && (
                      <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => updateStatus.mutate({ id: exp.id, status: "running" })}>
                        <Play className="h-4 w-4 mr-1" />Resume
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="text-destructive min-h-[44px] min-w-[44px]" onClick={() => deleteExperiment.mutate(exp.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Experiment</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Experiment Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Test 40% vs 35% commission" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.experiment_type} onValueChange={v => setForm({ ...form, experiment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPERIMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Variants (JSON array or text)</Label>
                <Textarea value={form.variants} onChange={e => setForm({ ...form, variants: e.target.value })} rows={4} placeholder='[{"name":"Control","value":"30%"},{"name":"Variant A","value":"35%"}]' className="min-h-[100px]" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!form.name || createExperiment.isPending}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
