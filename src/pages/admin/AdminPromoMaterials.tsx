import { useState } from "react";
import { motion } from "framer-motion";
import { Image, Plus, Trash2, FileText } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAllPromoMaterials, useCreatePromoMaterial, useDeletePromoMaterial, PromoMaterial } from "@/hooks/usePromoMaterials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

const MATERIAL_TYPES = [
  { value: "copy", label: "Promo Copy" },
  { value: "banner", label: "Banner/Image" },
  { value: "email_template", label: "Email Template" },
];

export default function AdminPromoMaterials() {
  const { user } = useAuth();
  const { data: materials, isLoading } = useAllPromoMaterials();
  const createMaterial = useCreatePromoMaterial();
  const deleteMaterial = useDeletePromoMaterial();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", material_type: "copy", media_url: "" });

  const handleCreate = () => {
    createMaterial.mutate({
      title: form.title,
      content: form.content,
      material_type: form.material_type,
      media_url: form.media_url || null,
      created_by: user?.id,
    } as PromoMaterial, { onSuccess: () => { setShowCreate(false); setForm({ title: "", content: "", material_type: "copy", media_url: "" }); } });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Promo Materials</h1>
            <p className="text-muted-foreground text-sm">Manage affiliate marketing materials</p>
          </div>
          <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Add Material</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><AnimatedLoading size="lg" /></div>
        ) : !materials?.length ? (
          <div className="text-center py-12">
            <Image className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold">No materials</h3>
            <p className="text-sm text-muted-foreground">Add promo copy, banners, and email templates for affiliates.</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {materials.map((mat) => (
              <motion.div key={mat.id} variants={staggerItem} className="glass-card p-4 space-y-3">
                {mat.media_url && (
                  <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                    <img src={mat.media_url} alt={mat.title} className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">{mat.title}</h3>
                  <Badge variant="outline" className="text-xs">{MATERIAL_TYPES.find(t => t.value === mat.material_type)?.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{mat.content}</p>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMaterial.mutate(mat.id)}>
                  <Trash2 className="h-4 w-4 mr-1" />Delete
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Promo Material</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g., Holiday Sale Banner" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.material_type} onValueChange={v => setForm({...form, material_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MATERIAL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Content / Copy Text</Label>
                <Textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={4} placeholder="Write the promo copy..." />
              </div>
              <div className="space-y-2">
                <Label>Media URL (optional)</Label>
                <Input value={form.media_url} onChange={e => setForm({...form, media_url: e.target.value})} placeholder="https://..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!form.title || !form.content || createMaterial.isPending}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
