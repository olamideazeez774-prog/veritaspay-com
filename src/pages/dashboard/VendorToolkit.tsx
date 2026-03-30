import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calculator, Tag, Percent, Plus, Trash2, ToggleLeft, ToggleRight,
  TrendingUp, DollarSign,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatCurrency, formatDate } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function VendorToolkit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("coupons");

  // ======== ROI CALCULATOR ========
  const [roiInputs, setRoiInputs] = useState({
    price: 10000,
    commissionPercent: 30,
    platformFee: 10,
    monthlySales: 50,
  });

  const monthlyRevenue = roiInputs.price * roiInputs.monthlySales;
  const platformFeeAmt = (monthlyRevenue * roiInputs.platformFee) / 100;
  const afterPlatform = monthlyRevenue - platformFeeAmt;
  const affiliatePayouts = (afterPlatform * roiInputs.commissionPercent) / 100;
  const vendorNet = afterPlatform - affiliatePayouts;

  // ======== COUPONS ========
  const [showCouponDialog, setShowCouponDialog] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: "",
    discount_percent: 0,
    discount_amount: 0,
    max_uses: "",
    expires_at: "",
    product_id: "",
  });

  const { data: products } = useQuery({
    queryKey: ["vendor-products-toolkit", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title")
        .eq("vendor_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: coupons, isLoading: couponsLoading } = useQuery({
    queryKey: ["vendor-coupons", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_coupons")
        .select("*")
        .eq("vendor_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createCoupon = useMutation({
    mutationFn: async () => {
      if (!couponForm.code.trim()) throw new Error("Code is required");
      const { error } = await supabase.from("vendor_coupons").insert({
        vendor_id: user!.id,
        code: couponForm.code.toUpperCase(),
        discount_percent: couponForm.discount_percent || 0,
        discount_amount: couponForm.discount_amount || 0,
        max_uses: couponForm.max_uses ? parseInt(couponForm.max_uses) : null,
        expires_at: couponForm.expires_at || null,
        product_id: couponForm.product_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-coupons"] });
      toast.success("Coupon created!");
      setShowCouponDialog(false);
      setCouponForm({ code: "", discount_percent: 0, discount_amount: 0, max_uses: "", expires_at: "", product_id: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleCoupon = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await supabase.from("vendor_coupons").update({ is_active: active }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendor-coupons"] }),
  });

  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("vendor_coupons").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-coupons"] });
      toast.success("Coupon deleted");
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Vendor Toolkit</h1>
          <p className="text-muted-foreground text-sm">Revenue tools, coupons, and calculators</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="coupons" className="flex-1 sm:flex-none">Coupons</TabsTrigger>
            <TabsTrigger value="roi" className="flex-1 sm:flex-none">ROI Calculator</TabsTrigger>
          </TabsList>

          {/* ======== COUPONS TAB ======== */}
          <TabsContent value="coupons" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{coupons?.length || 0} coupons</p>
              <Button size="sm" onClick={() => setShowCouponDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> New Coupon
              </Button>
            </div>

            {couponsLoading ? (
              <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
            ) : !coupons?.length ? (
              <EmptyState icon={Tag} title="No coupons" description="Create discount coupons for your products." />
            ) : (
              <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
                {coupons.map((coupon) => {
                  const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
                  const product = products?.find(p => p.id === coupon.product_id);
                  return (
                    <motion.div key={coupon.id} variants={staggerItem} className="glass-card p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="bg-muted px-2 py-0.5 rounded text-sm font-bold">{coupon.code}</code>
                            {coupon.is_active && !isExpired ? (
                              <Badge className="bg-success text-success-foreground">Active</Badge>
                            ) : isExpired ? (
                              <Badge variant="outline">Expired</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {coupon.discount_percent > 0 && <span>{coupon.discount_percent}% off</span>}
                            {coupon.discount_amount > 0 && <span>{formatCurrency(coupon.discount_amount)} off</span>}
                            {product && <span>· {product.title}</span>}
                            {coupon.max_uses && <span>· {coupon.current_uses}/{coupon.max_uses} uses</span>}
                            {coupon.expires_at && <span>· Expires {formatDate(coupon.expires_at)}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleCoupon.mutate({ id: coupon.id, active: !coupon.is_active })}
                          >
                            {coupon.is_active ? <ToggleRight className="h-5 w-5 text-success" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteCoupon.mutate(coupon.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {/* Create Coupon Dialog */}
            <Dialog open={showCouponDialog} onOpenChange={setShowCouponDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Coupon</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Coupon Code</Label>
                    <Input placeholder="e.g. SAVE20" value={couponForm.code} onChange={(e) => setCouponForm(f => ({ ...f, code: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Discount %</Label>
                      <Input type="number" min={0} max={100} value={couponForm.discount_percent} onChange={(e) => setCouponForm(f => ({ ...f, discount_percent: +e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Discount Amount (₦)</Label>
                      <Input type="number" min={0} value={couponForm.discount_amount} onChange={(e) => setCouponForm(f => ({ ...f, discount_amount: +e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Max Uses (optional)</Label>
                      <Input type="number" min={1} placeholder="Unlimited" value={couponForm.max_uses} onChange={(e) => setCouponForm(f => ({ ...f, max_uses: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Expires (optional)</Label>
                      <Input type="date" value={couponForm.expires_at} onChange={(e) => setCouponForm(f => ({ ...f, expires_at: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Product (optional)</Label>
                    <Select value={couponForm.product_id || "all"} onValueChange={(v) => setCouponForm(f => ({ ...f, product_id: v === "all" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="All products" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All products</SelectItem>
                        {products?.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => createCoupon.mutate()} disabled={createCoupon.isPending}>
                    Create Coupon
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ======== ROI CALCULATOR TAB ======== */}
          <TabsContent value="roi" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="glass-card p-4 sm:p-6 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" /> Revenue Calculator
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Product Price (₦)</Label>
                    <Input type="number" value={roiInputs.price} onChange={(e) => setRoiInputs(r => ({ ...r, price: +e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Commission % (to affiliates)</Label>
                    <Input type="number" min={0} max={90} value={roiInputs.commissionPercent} onChange={(e) => setRoiInputs(r => ({ ...r, commissionPercent: +e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Platform Fee %</Label>
                    <Input type="number" min={0} max={50} value={roiInputs.platformFee} onChange={(e) => setRoiInputs(r => ({ ...r, platformFee: +e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Estimated Monthly Sales</Label>
                    <Input type="number" min={0} value={roiInputs.monthlySales} onChange={(e) => setRoiInputs(r => ({ ...r, monthlySales: +e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 sm:p-6 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-success" /> Monthly Projection
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "Gross Revenue", value: monthlyRevenue, icon: DollarSign, color: "text-foreground" },
                    { label: "Platform Fees", value: -platformFeeAmt, icon: Percent, color: "text-destructive" },
                    { label: "Affiliate Payouts", value: -affiliatePayouts, icon: Percent, color: "text-warning" },
                    { label: "Your Net Earnings", value: vendorNet, icon: TrendingUp, color: "text-success" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <item.icon className={`h-4 w-4 ${item.color}`} />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <span className={`font-bold ${item.color}`}>
                        {item.value < 0 ? "-" : ""}{formatCurrency(Math.abs(item.value))}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Annual Projection</span>
                    <span className="text-lg font-bold text-success">{formatCurrency(vendorNet * 12)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Per-sale net</span>
                    <span className="text-sm font-medium">{formatCurrency(roiInputs.monthlySales > 0 ? vendorNet / roiInputs.monthlySales : 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
