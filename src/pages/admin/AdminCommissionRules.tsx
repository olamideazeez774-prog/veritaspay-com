import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, Plus, Trash2, Zap } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useCommissionRules, useCreateCommissionRule, useUpdateCommissionRule, useDeleteCommissionRule } from "@/hooks/useCommissionRules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";

const RULE_TYPES = [
  { value: "tiered", label: "Tiered Commission" },
  { value: "time_boost", label: "Time-Limited Boost" },
  { value: "first_sale_bonus", label: "First Sale Bonus" },
  { value: "per_product", label: "Per Product Override" },
  { value: "per_affiliate", label: "Per Affiliate Override" },
  { value: "recurring", label: "Recurring Commission" },
  { value: "weekly_threshold", label: "Weekly Threshold" },
];

export default function AdminCommissionRules() {
  const { data: rules, isLoading } = useCommissionRules();
  const createRule = useCreateCommissionRule();
  const updateRule = useUpdateCommissionRule();
  const deleteRule = useDeleteCommissionRule();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", rule_type: "tiered", commission_override: "", boost_percent: "", bonus_amount: "", min_sales: "0", starts_at: "", ends_at: "", priority: "0" });

  const handleCreate = () => {
    createRule.mutate({
      name: form.name,
      rule_type: form.rule_type,
      commission_override: form.commission_override ? Number(form.commission_override) : null,
      boost_percent: Number(form.boost_percent || 0),
      bonus_amount: Number(form.bonus_amount || 0),
      min_sales: Number(form.min_sales || 0),
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      priority: Number(form.priority || 0),
    } as any, { onSuccess: () => { setShowCreate(false); setForm({ name: "", rule_type: "tiered", commission_override: "", boost_percent: "", bonus_amount: "", min_sales: "0", starts_at: "", ends_at: "", priority: "0" }); } });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Commission Rules</h1>
            <p className="text-muted-foreground text-sm">Configure tiered, boosted, and custom commission structures</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="min-h-[44px]">
            <Plus className="h-4 w-4 mr-2" />Add Rule
          </Button>
        </div>

        {/* Weekly threshold info */}
        <div className="rounded-lg border bg-muted/50 p-3 sm:p-4 text-sm">
          <p className="font-medium mb-1">Weekly Threshold Logic</p>
          <p className="text-muted-foreground text-xs sm:text-sm">
            When an affiliate reaches 15 sales/week, their commission automatically upgrades to 40% (forward-only). 
            The rate is maintained as long as the threshold is met weekly, with a 1-week grace period before reverting.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><AnimatedLoading size="lg" text="Loading rules..." /></div>
        ) : !rules?.length ? (
          <div className="text-center py-12">
            <Settings className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold">No commission rules</h3>
            <p className="text-sm text-muted-foreground">Create your first rule to customize commissions.</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
            {rules.map((rule) => (
              <motion.div key={rule.id} variants={staggerItem} className="glass-card p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Zap className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="font-semibold">{rule.name}</h3>
                      <Badge variant="outline">{RULE_TYPES.find(t => t.value === rule.rule_type)?.label || rule.rule_type}</Badge>
                      {!rule.is_active && <Badge variant="secondary">Inactive</Badge>}
                      {rule.rule_type === "weekly_threshold" && <Badge className="bg-primary/10 text-primary border-primary/20">Weekly</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {rule.commission_override != null && <span>Override: {rule.commission_override}%</span>}
                      {(rule.boost_percent ?? 0) > 0 && <span>Boost: +{rule.boost_percent}%</span>}
                      {(rule.bonus_amount ?? 0) > 0 && <span>Bonus: ₦{rule.bonus_amount}</span>}
                      {(rule.min_sales ?? 0) > 0 && <span>After {rule.min_sales} sales</span>}
                      {rule.starts_at && <span>From {formatDate(rule.starts_at)}</span>}
                      {rule.ends_at && <span>Until {formatDate(rule.ends_at)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={rule.is_active} onCheckedChange={(checked) => updateRule.mutate({ id: rule.id, is_active: checked })} />
                    <Button variant="ghost" size="icon" className="text-destructive min-h-[44px] min-w-[44px]" onClick={() => deleteRule.mutate(rule.id)}>
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
            <DialogHeader><DialogTitle>Create Commission Rule</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Rule Name</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g., Gold Tier 40%" />
              </div>
              <div className="space-y-2">
                <Label>Rule Type</Label>
                <Select value={form.rule_type} onValueChange={v => setForm({...form, rule_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Commission Override %</Label>
                  <Input type="number" value={form.commission_override} onChange={e => setForm({...form, commission_override: e.target.value})} placeholder="e.g., 40" />
                </div>
                <div className="space-y-2">
                  <Label>Boost %</Label>
                  <Input type="number" value={form.boost_percent} onChange={e => setForm({...form, boost_percent: e.target.value})} placeholder="e.g., 10" />
                </div>
                <div className="space-y-2">
                  <Label>Bonus Amount (₦)</Label>
                  <Input type="number" value={form.bonus_amount} onChange={e => setForm({...form, bonus_amount: e.target.value})} placeholder="e.g., 5000" />
                </div>
                <div className="space-y-2">
                  <Label>Min Sales Required</Label>
                  <Input type="number" value={form.min_sales} onChange={e => setForm({...form, min_sales: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={form.starts_at} onChange={e => setForm({...form, starts_at: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={form.ends_at} onChange={e => setForm({...form, ends_at: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Priority (higher = applied first)</Label>
                <Input type="number" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!form.name || createRule.isPending}>Create Rule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
