import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Trash2, Eye, EyeOff } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";

export default function AdminMessaging() {
  const { data: announcements, isLoading } = useAnnouncements();
  const queryClient = useQueryClient();

  // Fetch vendor profiles for display
  const vendorIds = [...new Set((announcements || []).map(a => a.vendor_id))];
  const { data: profiles } = useQuery({
    queryKey: ["vendor-profiles-messaging", vendorIds.join(",")],
    queryFn: async () => {
      if (vendorIds.length === 0) return {};
      const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", vendorIds);
      const map: Record<string, { full_name: string | null; email: string }> = {};
      data?.forEach(p => { map[p.id] = p; });
      return map;
    },
    enabled: vendorIds.length > 0,
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase.from("vendor_announcements").update({ is_published, is_moderated: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["announcements"] }); toast.success("Updated"); },
  });

  const deleteAnn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendor_announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["announcements"] }); toast.success("Deleted"); },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Message Moderation</h1>
          <p className="text-muted-foreground text-sm">Review vendor announcements to affiliates</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><AnimatedLoading size="lg" /></div>
        ) : !announcements?.length ? (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold">No announcements</h3>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
            {announcements.map((ann) => {
              const vendor = profiles?.[ann.vendor_id];
              return (
                <motion.div key={ann.id} variants={staggerItem} className="glass-card p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{ann.title}</h3>
                        <Badge variant="outline">{ann.announcement_type}</Badge>
                        {!ann.is_published && <Badge variant="secondary">Hidden</Badge>}
                        {ann.is_moderated && <Badge variant="default">Moderated</Badge>}
                      </div>
                      <p className="text-sm text-foreground">{ann.content}</p>
                      <p className="text-xs text-muted-foreground">
                        By {vendor?.full_name || vendor?.email || "Unknown"} · {formatDateTime(ann.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => togglePublish.mutate({ id: ann.id, is_published: !ann.is_published })}>
                        {ann.is_published ? <><EyeOff className="h-4 w-4 mr-1" />Hide</> : <><Eye className="h-4 w-4 mr-1" />Publish</>}
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteAnn.mutate(ann.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
