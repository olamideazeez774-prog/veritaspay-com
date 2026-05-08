import { useState } from "react";
import { motion } from "framer-motion";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from "@/hooks/useAnnouncements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { formatDate } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const ANN_TYPES = [
  { value: "general", label: "General" },
  { value: "promo", label: "Promo Update" },
  { value: "commission_boost", label: "Commission Boost" },
  { value: "new_creative", label: "New Creative" },
  { value: "launch", label: "Product Launch" },
];

export default function VendorAnnouncements() {
  const { user } = useAuth();
  const { data: announcements, isLoading } = useAnnouncements(user?.id);
  const createAnn = useCreateAnnouncement();
  const deleteAnn = useDeleteAnnouncement();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    announcement_type: "general",
    expires_at: "",
    banner_url: "",
    link_url: "",
  });

  const handleCreate = () => {
    createAnn.mutate({
      vendor_id: user!.id,
      title: form.title,
      content: form.content,
      announcement_type: form.announcement_type,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      banner_url: form.banner_url || null,
      link_url: form.link_url || null,
    } as Parameters<typeof createAnn.mutate>[0], {
      onSuccess: () => {
        setShowCreate(false);
        setForm({ title: "", content: "", announcement_type: "general", expires_at: "", banner_url: "", link_url: "" });
      },
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
            <p className="text-muted-foreground">Broadcast updates to your affiliates</p>
          </div>
          <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />New Announcement</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><AnimatedLoading size="lg" /></div>
        ) : !announcements?.length ? (
          <div className="text-center py-12">
            <Megaphone className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold">No announcements yet</h3>
            <p className="text-sm text-muted-foreground">Post updates for affiliates promoting your products.</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
            {announcements.map(ann => (
              <motion.div key={ann.id} variants={staggerItem} className="glass-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2 min-w-0 flex-1">
                    {ann.banner_url && (
                      <img src={ann.banner_url} alt="" className="w-full max-h-32 object-cover rounded-md" />
                    )}
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{ann.title}</h3>
                      <Badge variant="outline">{ANN_TYPES.find(t => t.value === ann.announcement_type)?.label}</Badge>
                      {!ann.is_published && <Badge variant="secondary">Hidden by admin</Badge>}
                      {ann.expires_at && new Date(ann.expires_at) < new Date() && <Badge variant="destructive">Expired</Badge>}
                    </div>
                    <p className="text-sm text-foreground break-words">{ann.content}</p>
                    {ann.link_url && (
                      <a href={ann.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline break-all">{ann.link_url}</a>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDate(ann.created_at)}
                      {ann.expires_at && ` · expires ${formatDate(ann.expires_at)}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteAnn.mutate(ann.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Announcement</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g., 50% Commission Boost This Week!" /></div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.announcement_type} onValueChange={v => setForm({...form, announcement_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ANN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Message</Label><Textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={4} placeholder="Write your announcement..." /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Expires (optional)</Label>
                  <Input type="datetime-local" value={form.expires_at} onChange={e => setForm({...form, expires_at: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Link URL (optional)</Label>
                  <Input type="url" placeholder="https://..." value={form.link_url} onChange={e => setForm({...form, link_url: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Banner Image URL (optional)</Label>
                <Input type="url" placeholder="https://..." value={form.banner_url} onChange={e => setForm({...form, banner_url: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!form.title || !form.content || createAnn.isPending}>Post</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
