import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, MailOpen, CheckCheck } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { EmptyState } from "@/components/ui/empty-state";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export default function InboxPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["user-messages", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_messages")
        .select("*")
        .eq("to_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Realtime for live message updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("user-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_messages", filter: `to_user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["user-messages"] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("user_messages").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-messages"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from("user_messages")
        .update({ is_read: true })
        .eq("to_user_id", user!.id)
        .eq("is_read", false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-messages"] });
      toast.success("All messages marked as read");
    },
  });

  const unreadCount = messages?.filter((m) => !m.is_read).length || 0;

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Mail className="h-7 w-7 text-primary" />
              Inbox
            </h1>
            <p className="text-muted-foreground text-sm">
              Messages from the platform admin
              {unreadCount > 0 && <Badge variant="destructive" className="ml-2">{unreadCount} unread</Badge>}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()} className="min-h-[44px]">
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark All Read
            </Button>
          )}
        </div>

        {!messages?.length ? (
          <EmptyState icon={Mail} title="No messages" description="You don't have any messages yet." />
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
            {messages.map((msg) => (
              <motion.div key={msg.id} variants={staggerItem}>
                <Card
                  className={msg.is_read ? "opacity-75" : "border-primary/30 bg-primary/5"}
                  onClick={() => !msg.is_read && markRead.mutate(msg.id)}
                >
                  <CardContent className="p-4 flex items-start gap-3 cursor-pointer">
                    {msg.is_read ? (
                      <MailOpen className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    ) : (
                      <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground">Admin</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{formatDate(msg.created_at)}</span>
                        {!msg.is_read && <Badge variant="default" className="text-[10px] px-1.5 py-0">New</Badge>}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
