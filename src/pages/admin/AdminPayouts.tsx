import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Search, Check, X, Clock } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatCurrency, formatDate } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type PayoutStatus = Database["public"]["Enums"]["payout_status"];

interface PayoutRequest {
  id: string;
  amount: number;
  status: PayoutStatus;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  admin_notes: string | null;
  created_at: string;
  user_id: string;
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

export default function AdminPayouts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: payouts, isLoading } = useQuery({
    queryKey: ["admin-payouts"],
    queryFn: async () => {
      const { data: payoutData, error } = await supabase
        .from("payout_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = [...new Set(payoutData.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return payoutData.map(payout => ({
        ...payout,
        profiles: profileMap.get(payout.user_id) || { email: "", full_name: null }
      })) as PayoutRequest[];
    },
  });

  const updatePayout = useMutation({
    mutationFn: async ({
      payoutId,
      status,
      notes,
    }: {
      payoutId: string;
      status: PayoutStatus;
      notes: string;
    }) => {
      const { error } = await supabase
        .from("payout_requests")
        .update({
          status,
          admin_notes: notes,
          processed_at: status === "paid" || status === "rejected" ? new Date().toISOString() : null,
        })
        .eq("id", payoutId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
      toast.success("Payout updated successfully");
      setSelectedPayout(null);
      setAdminNotes("");
    },
    onError: () => {
      toast.error("Failed to update payout");
    },
  });

  const filteredPayouts = payouts?.filter((payout) => {
    const matchesSearch =
      payout.profiles?.email?.toLowerCase().includes(search.toLowerCase()) ||
      payout.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      payout.account_name?.toLowerCase().includes(search.toLowerCase());

    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && payout.status === statusFilter;
  });

  const getStatusBadge = (status: PayoutStatus) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-success gap-1">
            <Check className="h-3 w-3" />
            Paid
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <X className="h-3 w-3" />
            Rejected
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Processing
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payout Requests</h1>
          <p className="text-muted-foreground">Review and process withdrawal requests</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by user or account..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payouts Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : !filteredPayouts?.length ? (
          <EmptyState
            icon={Wallet}
            title="No payout requests"
            description={
              statusFilter !== "all"
                ? "No requests match your filter."
                : "No payout requests have been submitted."
            }
          />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="glass-card overflow-hidden"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Bank Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayouts.map((payout) => (
                  <motion.tr key={payout.id} variants={staggerItem}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payout.profiles?.full_name || "No name"}</p>
                        <p className="text-sm text-muted-foreground">{payout.profiles?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(payout.amount)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{payout.bank_name}</p>
                        <p className="text-muted-foreground">
                          {payout.account_name} • ****{payout.account_number?.slice(-4)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(payout.status)}</TableCell>
                    <TableCell>{formatDate(payout.created_at)}</TableCell>
                    <TableCell className="text-right">
                      {payout.status === "pending" || payout.status === "processing" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPayout(payout);
                            setAdminNotes(payout.admin_notes || "");
                          }}
                        >
                          Process
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPayout(payout);
                            setAdminNotes(payout.admin_notes || "");
                          }}
                        >
                          View
                        </Button>
                      )}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        )}

        {/* Process Dialog */}
        <Dialog open={!!selectedPayout} onOpenChange={() => setSelectedPayout(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Payout Request</DialogTitle>
              <DialogDescription>
                Review the details and update the payout status.
              </DialogDescription>
            </DialogHeader>

            {selectedPayout && (
              <div className="space-y-4 py-4">
                {/* Details */}
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-bold">{formatCurrency(selectedPayout.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank</span>
                    <span>{selectedPayout.bank_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account</span>
                    <span>{selectedPayout.account_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span>{selectedPayout.account_name}</span>
                  </div>
                </div>

                {/* Admin Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin Notes</label>
                  <Textarea
                    placeholder="Add notes for this payout..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              {selectedPayout?.status === "pending" || selectedPayout?.status === "processing" ? (
                <>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      updatePayout.mutate({
                        payoutId: selectedPayout!.id,
                        status: "rejected",
                        notes: adminNotes,
                      })
                    }
                    disabled={updatePayout.isPending}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    onClick={() =>
                      updatePayout.mutate({
                        payoutId: selectedPayout!.id,
                        status: "paid",
                        notes: adminNotes,
                      })
                    }
                    disabled={updatePayout.isPending}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Mark as Paid
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setSelectedPayout(null)}>
                  Close
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
