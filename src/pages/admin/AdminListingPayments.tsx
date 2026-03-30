import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CreditCard, CheckCircle, XCircle, Clock, Search, Eye } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAllListingPayments, useUpdateListingPayment, ListingPayment } from "@/hooks/useListingPayment";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { supabase } from "@/integrations/supabase/client";

interface PaymentWithProfile extends ListingPayment {
  profile?: { full_name: string | null; email: string };
}

export default function AdminListingPayments() {
  const { data: payments, isLoading } = useAllListingPayments();
  const updatePayment = useUpdateListingPayment();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithProfile | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [profiles, setProfiles] = useState<Record<string, { full_name: string | null; email: string }>>({});

  useEffect(() => {
    if (payments && payments.length > 0) {
      const vendorIds = [...new Set(payments.map((p) => p.vendor_id))];
      supabase.from("profiles").select("id, full_name, email").in("id", vendorIds).then(({ data }) => {
        if (data) {
          const profileMap: Record<string, { full_name: string | null; email: string }> = {};
          data.forEach((p) => { profileMap[p.id] = { full_name: p.full_name, email: p.email }; });
          setProfiles(profileMap);
        }
      });
    }
  }, [payments]);

  const filteredPayments = payments?.filter((p) => {
    const profile = profiles[p.vendor_id];
    const s = searchTerm.toLowerCase();
    return p.payment_reference.toLowerCase().includes(s) || p.business_name?.toLowerCase().includes(s) ||
      p.business_email?.toLowerCase().includes(s) || profile?.full_name?.toLowerCase().includes(s) ||
      profile?.email.toLowerCase().includes(s);
  });

  const handleApprove = async (payment: ListingPayment) => {
    await updatePayment.mutateAsync({ id: payment.id, status: "verified", admin_notes: adminNotes || undefined });
    setSelectedPayment(null); setAdminNotes("");
  };

  const handleReject = async (payment: ListingPayment) => {
    if (!adminNotes.trim()) return;
    await updatePayment.mutateAsync({ id: payment.id, status: "rejected", admin_notes: adminNotes });
    setSelectedPayment(null); setAdminNotes("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified": return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case "rejected": return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default: return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Listing Payments</h1>
          <p className="text-muted-foreground text-sm">Review and verify vendor listing payments</p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by reference, business name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : !filteredPayments || filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold">No payments found</h3>
            <p className="text-sm text-muted-foreground">No listing payments to review yet.</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3 sm:hidden">
              {filteredPayments.map((payment) => {
                const profile = profiles[payment.vendor_id];
                return (
                  <motion.div key={payment.id} variants={staggerItem} className="glass-card p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{profile?.full_name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{profile?.email}</p>
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                        <p className="text-xs text-muted-foreground">{payment.business_name || "-"}</p>
                      </div>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{payment.payment_reference}</code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{formatDate(payment.created_at)}</span>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedPayment({ ...payment, profile }); setAdminNotes(payment.admin_notes || ""); }}>
                        <Eye className="h-4 w-4 mr-1" /> Review
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Desktop table */}
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="glass-card overflow-hidden hidden sm:block">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => {
                      const profile = profiles[payment.vendor_id];
                      return (
                        <motion.tr key={payment.id} variants={staggerItem}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{profile?.full_name || "Unknown"}</p>
                              <p className="text-sm text-muted-foreground">{profile?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{payment.business_name || "-"}</p>
                              <p className="text-sm text-muted-foreground">{payment.business_email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                          <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{payment.payment_reference}</code></TableCell>
                          <TableCell>{formatDate(payment.created_at)}</TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedPayment({ ...payment, profile }); setAdminNotes(payment.admin_notes || ""); }}>
                              <Eye className="h-4 w-4 mr-1" /> Review
                            </Button>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          </>
        )}

        {/* Review Dialog */}
        <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Review Payment</DialogTitle>
              <DialogDescription>Verify this listing payment from {selectedPayment?.profile?.full_name}</DialogDescription>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 p-4 rounded-lg bg-muted text-sm">
                  {[
                    ["Amount", formatCurrency(selectedPayment.amount)],
                    ["Reference", selectedPayment.payment_reference],
                    ["Business", selectedPayment.business_name || "-"],
                    ["Email", selectedPayment.business_email || "-"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-muted-foreground text-xs">{label}</p>
                      <p className="font-medium break-all">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin Notes</label>
                  <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Add notes..." rows={3} />
                </div>
                {selectedPayment.status === "pending" && (
                  <div className="flex gap-2">
                    <Button variant="destructive" onClick={() => handleReject(selectedPayment)} disabled={updatePayment.isPending || !adminNotes.trim()} className="flex-1">
                      <XCircle className="h-4 w-4 mr-2" /> Reject
                    </Button>
                    <Button onClick={() => handleApprove(selectedPayment)} disabled={updatePayment.isPending} className="flex-1">
                      <CheckCircle className="h-4 w-4 mr-2" /> Approve
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
