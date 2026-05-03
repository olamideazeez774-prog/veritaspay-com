import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Clock, CheckCircle, XCircle, Plus, Banknote, Info } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useWallet, usePayoutRequests, useCreatePayoutRequest } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/animations";
import {
  MIN_WITHDRAWAL_AMOUNT,
  WITHDRAWAL_FEE_PERCENT_MIN,
  WITHDRAWAL_FEE_PERCENT_MAX,
  WITHDRAWAL_FEE_TIER_THRESHOLD,
  PAYOUT_HOLD_HOURS,
} from "@/lib/constants";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export default function PayoutsPage() {
  const { user, profile, isAdmin } = useAuth();
  const { data: wallet, isLoading: walletLoading } = useWallet(user?.id);
  const { data: payouts, isLoading: payoutsLoading } = usePayoutRequests(user?.id);
  const createPayout = useCreatePayoutRequest();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    bank_name: "",
    account_number: "",
    account_name: "",
  });

  // Fee settings are handled via constants for now

  // Calculate withdrawal fee based on amount (2% - 4% sliding scale)
  // Higher amounts get lower percentage fees
  const amount = parseFloat(formData.amount) || 0;
  // Tiered withdrawal fee: < ₦20,000 = 3%, ≥ ₦20,000 = 2%
  const getWithdrawalFeePercent = (amt: number): number => {
    if (isAdmin) return 0;
    return amt >= WITHDRAWAL_FEE_TIER_THRESHOLD
      ? WITHDRAWAL_FEE_PERCENT_MIN
      : WITHDRAWAL_FEE_PERCENT_MAX;
  };

  const withdrawalFeePercent = getWithdrawalFeePercent(amount);
  const feeAmount = isAdmin ? 0 : Math.round(amount * withdrawalFeePercent / 100);
  const netAmount = Math.max(0, amount - feeAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount < MIN_WITHDRAWAL_AMOUNT) {
      toast.error(`Minimum withdrawal amount is ${formatCurrency(MIN_WITHDRAWAL_AMOUNT)}`);
      return;
    }

    if (!wallet || amount > wallet.withdrawable_balance) {
      toast.error("Insufficient withdrawable balance");
      return;
    }

    if (!formData.bank_name || !formData.account_number || !formData.account_name) {
      toast.error("Please fill in all bank details");
      return;
    }

    createPayout.mutate(
      {
        wallet_id: wallet.id,
        user_id: user!.id,
        amount,
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        account_name: formData.account_name,
      },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          setFormData({ amount: "", bank_name: "", account_number: "", account_name: "" });
        },
      }
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid": return <CheckCircle className="h-4 w-4 text-success" />;
      case "rejected": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const isLoading = walletLoading || payoutsLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Payouts</h1>
              <span className="text-sm text-muted-foreground border rounded-full px-3 py-1 bg-muted/50">
                {profile?.full_name || profile?.email || "User"}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">Request and track your withdrawals</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="min-h-[44px]">
                <Plus className="mr-2 h-4 w-4" />
                Request Payout
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Request Payout</DialogTitle>
                <DialogDescription>
                  Enter your bank details and the amount you'd like to withdraw.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm text-muted-foreground">Available for withdrawal</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(wallet?.withdrawable_balance || 0)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="amount">Amount</Label>
                      <span className="text-xs text-muted-foreground">
                        Min: {formatCurrency(MIN_WITHDRAWAL_AMOUNT)}
                      </span>
                    </div>
                    <Input id="amount" type="number" placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} max={wallet?.withdrawable_balance} min={MIN_WITHDRAWAL_AMOUNT} step="0.01" required />
                    <p className="text-xs text-muted-foreground">
                      Withdrawal fee: 2% - 4% (lower fees for larger amounts)
                    </p>
                  </div>

                  {/* Fee breakdown */}
                  {amount >= MIN_WITHDRAWAL_AMOUNT && withdrawalFeePercent > 0 && !isAdmin && (
                    <div className="rounded-lg border bg-muted/50 p-3 space-y-1 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground mb-2">
                        <Info className="h-4 w-4" aria-hidden="true" />
                        <span className="font-medium">Fee Breakdown</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Processing fee ({withdrawalFeePercent}%)</span>
                        <span>{formatCurrency(feeAmount)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1 font-semibold">
                        <span>You'll receive</span>
                        <span className="text-success">{formatCurrency(netAmount)}</span>
                      </div>
                    </div>
                  )}
                  {isAdmin && amount > 0 && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
                      Admin accounts are fee-exempt. Full amount will be disbursed.
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input id="bank_name" placeholder="e.g. First Bank" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_number">Account Number</Label>
                    <Input id="account_number" placeholder="0123456789" value={formData.account_number} onChange={(e) => setFormData({ ...formData, account_number: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_name">Account Name</Label>
                    <Input id="account_name" placeholder="John Doe" value={formData.account_name} onChange={(e) => setFormData({ ...formData, account_name: e.target.value })} required />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createPayout.isPending}>
                    {createPayout.isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {wallet && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Wallet className="h-4 w-4" />
                <span className="text-sm">Withdrawable</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-success">
                {formatCurrency(wallet.withdrawable_balance)}
              </p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Pending Clearance</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-warning">
                {formatCurrency(wallet.pending_balance)}
              </p>
            </div>
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Banknote className="h-4 w-4" />
                <span className="text-sm">Total Withdrawn</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{formatCurrency(wallet.total_withdrawn)}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Payout History</h2>

          {isLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : !payouts?.length ? (
            <EmptyState icon={Wallet} title="No payout requests yet" description="Request your first payout when you have withdrawable earnings." />
          ) : (
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
              {payouts.map((payout) => (
                <motion.div key={payout.id} variants={staggerItem} className="glass-card p-4 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(payout.status)}
                      <div>
                        <p className="font-semibold">{formatCurrency(payout.amount)}</p>
                        <p className="text-sm text-muted-foreground">
                          {payout.bank_name} • ****{payout.account_number?.slice(-4)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <StatusBadge status={payout.status} />
                      <span className="text-sm text-muted-foreground">{formatDate(payout.created_at)}</span>
                    </div>
                  </div>
                  {payout.admin_notes && (
                    <p className="mt-3 text-sm text-muted-foreground border-t pt-3">
                      <span className="font-medium">Note:</span> {payout.admin_notes}
                    </p>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
