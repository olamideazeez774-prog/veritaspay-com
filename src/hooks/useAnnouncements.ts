import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VendorAnnouncement {
  id: string;
  vendor_id: string;
  title: string;
  content: string;
  announcement_type: string;
  product_id: string | null;
  is_published: boolean;
  is_moderated: boolean;
  moderated_by: string | null;
  created_at: string;
  updated_at: string;
  vendor_profile?: { full_name: string | null; email: string };
}

export function useAnnouncements(vendorId?: string) {
  return useQuery({
    queryKey: ["announcements", vendorId],
    queryFn: async () => {
      let query = supabase.from("vendor_announcements").select("*").order("created_at", { ascending: false });
      if (vendorId) query = query.eq("vendor_id", vendorId);
      const { data, error } = await query;
      if (error) throw error;
      return data as VendorAnnouncement[];
    },
  });
}

export function usePublishedAnnouncements() {
  return useQuery({
    queryKey: ["published-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_announcements")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      // Fetch vendor profiles
      const vendorIds = [...new Set((data || []).map(a => a.vendor_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", vendorIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      return (data || []).map(a => ({ ...a, vendor_profile: profileMap.get(a.vendor_id) })) as VendorAnnouncement[];
    },
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ann: Partial<VendorAnnouncement>) => {
      const { data, error } = await supabase.from("vendor_announcements").insert(ann as { announcement_type: string; content: string; created_at?: string; id?: string; is_moderated?: boolean; is_published?: boolean; moderated_by?: string; product_id?: string; title: string; updated_at?: string; vendor_id: string }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["announcements"] }); toast.success("Announcement posted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendor_announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["announcements"] }); toast.success("Announcement deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}
