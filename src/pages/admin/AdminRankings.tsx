import { motion } from "framer-motion";
import { Star, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAllProducts } from "@/hooks/useProducts";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function AdminRankings() {
  const { data: products, isLoading } = useAllProducts();

  const sortedProducts = [...(products || [])].sort((a, b) => {
    if ((a as any).is_featured !== (b as any).is_featured) return (b as any).is_featured ? 1 : -1;
    return ((b as any).ranking_score || 0) - ((a as any).ranking_score || 0);
  });

  const handleScoreUpdate = async (productId: string, score: number) => {
    const { error } = await supabase.from("products").update({ ranking_score: score } as any).eq("id", productId);
    if (error) toast.error("Failed to update score");
    else toast.success("Score updated");
  };

  const handleToggleFeatured = async (productId: string, featured: boolean) => {
    const { error } = await supabase.from("products").update({ is_featured: featured } as any).eq("id", productId);
    if (error) toast.error("Failed to update");
    else toast.success(featured ? "Product featured" : "Feature removed");
  };

  const handleToggleSponsored = async (productId: string, sponsored: boolean) => {
    const { error } = await supabase.from("products").update({ is_sponsored: sponsored } as any).eq("id", productId);
    if (error) toast.error("Failed to update");
    else toast.success(sponsored ? "Product sponsored" : "Sponsorship removed");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Marketplace Rankings</h1>
          <p className="text-muted-foreground text-sm">Manage product rankings, featured listings, and sponsored placements</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><AnimatedLoading size="lg" /></div>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
            {sortedProducts.map((product, index) => (
              <motion.div key={product.id} variants={staggerItem} className="glass-card p-4">
                <div className="flex flex-col gap-3">
                  {/* Product info row */}
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-8 shrink-0">#{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-sm truncate">{product.title}</h3>
                        {(product as any).is_featured && <Badge className="bg-warning text-warning-foreground gap-1"><Star className="h-3 w-3" />Featured</Badge>}
                        {(product as any).is_sponsored && <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" />Sponsored</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{formatCurrency(product.price)} · {product.commission_percent}% comm · Score: {(product as any).ranking_score || 0}</p>
                    </div>
                  </div>
                  {/* Controls row - stacked on mobile */}
                  <div className="flex flex-wrap items-center gap-4 pl-11">
                    <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                      <span className="text-xs text-muted-foreground">Featured</span>
                      <Switch checked={(product as any).is_featured || false} onCheckedChange={v => handleToggleFeatured(product.id, v)} />
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                      <span className="text-xs text-muted-foreground">Sponsored</span>
                      <Switch checked={(product as any).is_sponsored || false} onCheckedChange={v => handleToggleSponsored(product.id, v)} />
                    </label>
                    <Input type="number" className="w-20" defaultValue={(product as any).ranking_score || 0} onBlur={e => handleScoreUpdate(product.id, Number(e.target.value))} />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
