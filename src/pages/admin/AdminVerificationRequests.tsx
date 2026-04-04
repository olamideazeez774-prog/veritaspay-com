import { useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, CheckCircle, XCircle, Shield, Loader2, User, Clock, DollarSign, Award } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface VerificationRequest {
  id: string;
  user_id: string;
  path: "gold_rank" | "paid";
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  profiles?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  wallets?: {
    total_earned: number;
  };
}

export default function AdminVerificationRequests() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<VerificationRequest | null>(null);
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["verification-requests", filter],
    queryFn: async () => {
      let query = supabase
        .from("verification_requests")
        .select(`
          *,
          profiles:user_id (full_name, email, avatar_url, is_verified),
          wallets:user_id (total_earned)
        `)
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as VerificationRequest[];
    },
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: "approved" | "rejected"; notes: string }) => {
      const { error } = await supabase
        .from("verification_requests")
        .update({
          status,
          admin_notes: notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // If approved, also update the user's profile to verified
      if (status === "approved") {
        const request = requests?.find(r => r.id === id);
        if (request) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ is_verified: true })
            .eq("id", request.user_id);
          
          if (profileError) throw profileError;
        }
      }
    },
    onSuccess: () => {
      toast.success("Verification request updated");
      queryClient.invalidateQueries({ queryKey: ["verification-requests"] });
      setSelected(null);
      setNotes("");
    },
    onError: () => {
      toast.error("Failed to update request");
    },
  });

  const getPathIcon = (path: string) => {
    if (path === "gold_rank") return <Award className="h-4 w-4" />;
    return <DollarSign className="h-4 w-4" />;
  };

  const getPathLabel = (path: string) => {
    if (path === "gold_rank") return "Gold Rank (Free)";
    return "Paid Verification";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const pendingCount = requests?.filter(r => r.status === "pending").length || 0;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12"><AnimatedLoading size="lg" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <BadgeCheck className="h-7 w-7 text-primary" />
              Verification Requests
            </h1>
            <p className="text-muted-foreground text-sm">
              Review and manage user verification requests
              {pendingCount > 0 && (
                <span className="ml-2 text-primary font-medium">({pendingCount} pending)</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {(["all", "pending", "approved", "rejected"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className="min-h-[44px]"
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-2xl font-bold">{requests?.filter(r => r.status === "pending").length || 0}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <div>
                  <p className="text-2xl font-bold">{requests?.filter(r => r.status === "approved").length || 0}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">
                    {requests?.filter(r => r.path === "paid" && r.status === "pending").length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Paid Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
          {!requests?.length ? (
            <div className="text-center py-12">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 font-semibold">No verification requests</h3>
              <p className="text-sm text-muted-foreground">Requests will appear here when users apply.</p>
            </div>
          ) : (
            requests.map((request) => (
              <motion.div key={request.id} variants={staggerItem}>
                <Card className={request.status === "pending" ? "border-primary/30" : ""}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {request.profiles?.avatar_url ? (
                          <img 
                            src={request.profiles.avatar_url} 
                            alt="" 
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{request.profiles?.full_name || "Unknown User"}</p>
                          {request.profiles?.is_verified && (
                            <BadgeCheck className="h-4 w-4 text-success" />
                          )}
                          {getStatusBadge(request.status)}
                          <Badge variant="outline" className="gap-1">
                            {getPathIcon(request.path)}
                            {getPathLabel(request.path)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{request.profiles?.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Total Earned: ₦{request.wallets?.total_earned?.toLocaleString() || "0"} • 
                          Submitted: {formatDate(request.created_at)}
                        </p>
                        {request.admin_notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Admin Notes: {request.admin_notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {request.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelected(request)}
                              className="min-h-[44px]"
                            >
                              Review
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Review Dialog */}
        <Dialog open={!!selected} onOpenChange={() => { setSelected(null); setNotes(""); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Review Verification Request</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {selected.profiles?.avatar_url ? (
                      <img 
                        src={selected.profiles.avatar_url} 
                        alt="" 
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{selected.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{selected.profiles?.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">Path</p>
                    <p>{getPathLabel(selected.path)}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">Total Earned</p>
                    <p>₦{selected.wallets?.total_earned?.toLocaleString() || "0"}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Admin Notes (optional)</p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this decision..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                  />
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => { setSelected(null); setNotes(""); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => updateRequest.mutate({ id: selected.id, status: "rejected", notes })}
                    disabled={updateRequest.isPending}
                  >
                    {updateRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                    Reject
                  </Button>
                  <Button
                    onClick={() => updateRequest.mutate({ id: selected.id, status: "approved", notes })}
                    disabled={updateRequest.isPending}
                  >
                    {updateRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                    Approve
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
