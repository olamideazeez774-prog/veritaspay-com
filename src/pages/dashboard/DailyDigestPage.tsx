import { useState } from "react";
import { motion } from "framer-motion";
import { Newspaper, Calendar, TrendingUp, DollarSign, Users, ShoppingCart, Eye } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatCurrency, formatDate } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DigestContent {
  total_clicks?: number;
  total_conversions?: number;
  total_commission?: number;
  total_sales?: number;
  total_revenue?: number;
  top_product?: string;
  summary?: string;
  [key: string]: unknown;
}

export default function DailyDigestPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: digests, isLoading } = useQuery({
    queryKey: ["daily-digests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_digests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("daily_digests").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["daily-digests"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase.from("daily_digests").update({ is_read: true }).eq("user_id", user!.id).eq("is_read", false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-digests"] });
      toast.success("All digests marked as read");
    },
  });

  const unreadCount = digests?.filter(d => !d.is_read).length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Daily Digest</h1>
            <p className="text-muted-foreground text-sm">Your daily performance summaries</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
              <Eye className="h-4 w-4 mr-1" /> Mark All Read ({unreadCount})
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : !digests?.length ? (
          <EmptyState
            icon={Newspaper}
            title="No digests yet"
            description="Daily performance summaries will appear here once generated."
          />
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-4">
            {digests.map((digest) => {
              const content = (digest.content || {}) as DigestContent;
              return (
                <motion.div
                  key={digest.id}
                  variants={staggerItem}
                  className={`glass-card p-4 sm:p-6 space-y-4 transition-all ${!digest.is_read ? "ring-2 ring-primary/30" : ""}`}
                  onClick={() => !digest.is_read && markRead.mutate(digest.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{formatDate(digest.created_at)}</span>
                      <Badge variant="outline" className="text-xs">{digest.digest_type}</Badge>
                    </div>
                    {!digest.is_read && <Badge className="bg-primary text-primary-foreground text-xs">New</Badge>}
                  </div>

                  {content.summary && (
                    <p className="text-sm text-muted-foreground">{content.summary}</p>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {content.total_clicks != null && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <TrendingUp className="h-4 w-4 text-info" />
                        <div>
                          <p className="text-sm font-bold">{content.total_clicks}</p>
                          <p className="text-xs text-muted-foreground">Clicks</p>
                        </div>
                      </div>
                    )}
                    {content.total_conversions != null && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <ShoppingCart className="h-4 w-4 text-success" />
                        <div>
                          <p className="text-sm font-bold">{content.total_conversions}</p>
                          <p className="text-xs text-muted-foreground">Conversions</p>
                        </div>
                      </div>
                    )}
                    {content.total_commission != null && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <DollarSign className="h-4 w-4 text-warning" />
                        <div>
                          <p className="text-sm font-bold">{formatCurrency(content.total_commission)}</p>
                          <p className="text-xs text-muted-foreground">Commission</p>
                        </div>
                      </div>
                    )}
                    {content.total_revenue != null && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-bold">{formatCurrency(content.total_revenue)}</p>
                          <p className="text-xs text-muted-foreground">Revenue</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {content.top_product && (
                    <p className="text-xs text-muted-foreground">
                      🏆 Top product: <span className="font-medium text-foreground">{content.top_product}</span>
                    </p>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
