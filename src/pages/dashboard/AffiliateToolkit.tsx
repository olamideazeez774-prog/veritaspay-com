import { useState } from "react";
import { motion } from "framer-motion";
import { QrCode, Link2, Copy, Tag, Megaphone, FileText, Calculator, TrendingUp, Lightbulb, Type, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useAffiliateLinks } from "@/hooks/useAffiliateLinks";
import { useAffiliateCampaigns, useCreateCampaign } from "@/hooks/useAffiliateCampaigns";
import { usePromoMaterials } from "@/hooks/usePromoMaterials";
import { usePublishedAnnouncements } from "@/hooks/useAnnouncements";
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CURRENCY } from "@/lib/constants";
import { AICaptionGenerator, AIHeadlineTester, AIBestProductToday } from "@/components/AIToolsSection";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function AffiliateToolkit() {
  const { user } = useAuth();
  const { data: links } = useAffiliateLinks(user?.id);
  const { data: campaigns } = useAffiliateCampaigns(user?.id);
  const { data: materials, isLoading: materialsLoading } = usePromoMaterials();
  const { data: announcements } = usePublishedAnnouncements();
  const createCampaign = useCreateCampaign();

  // Get all approved products for AI Best Product Today
  const { data: allProducts } = useQuery({
    queryKey: ["all-active-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, price, commission_percent, description")
        .eq("status", "active")
        .eq("is_approved", true)
        .eq("affiliate_enabled", true)
        .limit(50);
      return data || [];
    },
  });

  // UTM Builder state
  const [selectedLink, setSelectedLink] = useState("");
  const [utm, setUtm] = useState({ source: "", medium: "", campaign: "", content: "" });
  const [qrLink, setQrLink] = useState("");

  // Profit Estimator state
  const [estClicks, setEstClicks] = useState(1000);
  const [estConvRate, setEstConvRate] = useState(3);
  const [estAvgPrice, setEstAvgPrice] = useState(10000);
  const [estCommission, setEstCommission] = useState(30);

  const estSales = Math.floor(estClicks * (estConvRate / 100));
  const estRevenue = estSales * estAvgPrice;
  const estProfit = estRevenue * (estCommission / 100);

  const selectedLinkData = links?.find((l: any) => l.id === selectedLink);
  const baseUrl = selectedLinkData ? `${window.location.origin}/ref/${selectedLinkData.unique_code}` : "";
  const utmUrl = baseUrl ? `${baseUrl}${utm.source ? `?utm_source=${utm.source}&utm_medium=${utm.medium}&utm_campaign=${utm.campaign}${utm.content ? `&utm_content=${utm.content}` : ""}` : ""}` : "";

  const handleCreateCampaign = () => {
    if (!selectedLink || !utm.campaign) { toast.error("Select a link and enter campaign name"); return; }
    createCampaign.mutate({
      affiliate_id: user!.id,
      link_id: selectedLink,
      campaign_name: utm.campaign,
      utm_source: utm.source,
      utm_medium: utm.medium,
      utm_campaign: utm.campaign,
      utm_content: utm.content || null,
    } as Partial<AffiliateCampaign>, { onSuccess: () => setUtm({ source: "", medium: "", campaign: "", content: "" }) });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const qrCodeUrl = qrLink ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrLink)}` : "";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Affiliate Toolkit</h1>
          <p className="text-muted-foreground text-sm">QR codes, UTM campaigns, AI tools, and promo materials</p>
        </div>

        <Tabs defaultValue="ai">
          <TabsList className="w-full sm:w-auto flex-wrap">
            <TabsTrigger value="ai" className="flex-1 sm:flex-none">AI Tools</TabsTrigger>
            <TabsTrigger value="qr" className="flex-1 sm:flex-none">QR Codes</TabsTrigger>
            <TabsTrigger value="utm" className="flex-1 sm:flex-none">UTM Builder</TabsTrigger>
            <TabsTrigger value="tools" className="flex-1 sm:flex-none">Calculators</TabsTrigger>
            <TabsTrigger value="materials" className="flex-1 sm:flex-none">Materials</TabsTrigger>
            <TabsTrigger value="news" className="flex-1 sm:flex-none">Updates</TabsTrigger>
          </TabsList>

          {/* AI Tools */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            <AICaptionGenerator />
            <AIHeadlineTester />
            <AIBestProductToday products={allProducts || []} />
          </TabsContent>

          {/* QR Code Generator */}
          <TabsContent value="qr" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" />QR Code Generator</CardTitle>
                <CardDescription>Generate QR codes for your affiliate links</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={qrLink} onValueChange={setQrLink}>
                  <SelectTrigger><SelectValue placeholder="Select an affiliate link" /></SelectTrigger>
                  <SelectContent>
                    {links?.map(l => (
                      <SelectItem key={l.id} value={`${window.location.origin}/ref/${l.unique_code}`}>
                        {l.products?.title || l.unique_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {qrCodeUrl && (
                  <div className="flex flex-col items-center gap-4 p-6 rounded-lg bg-muted/50">
                    <img src={qrCodeUrl} alt="QR Code" className="h-48 w-48 rounded-lg border bg-white p-2" />
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground break-all">{qrLink}</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => copyToClipboard(qrLink)}>
                        <Copy className="h-4 w-4 mr-1" />Copy Link
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* UTM Campaign Builder */}
          <TabsContent value="utm" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5" />UTM Campaign Builder</CardTitle>
                <CardDescription>Create trackable campaign links</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Affiliate Link</Label>
                  <Select value={selectedLink} onValueChange={setSelectedLink}>
                    <SelectTrigger><SelectValue placeholder="Select link" /></SelectTrigger>
                    <SelectContent>
                      {links?.map(l => <SelectItem key={l.id} value={l.id}>{l.products?.title || l.unique_code}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Source</Label><Input value={utm.source} onChange={e => setUtm({...utm, source: e.target.value})} placeholder="e.g., facebook" /></div>
                  <div className="space-y-2"><Label>Medium</Label><Input value={utm.medium} onChange={e => setUtm({...utm, medium: e.target.value})} placeholder="e.g., social" /></div>
                  <div className="space-y-2"><Label>Campaign</Label><Input value={utm.campaign} onChange={e => setUtm({...utm, campaign: e.target.value})} placeholder="e.g., summer_sale" /></div>
                  <div className="space-y-2"><Label>Content (optional)</Label><Input value={utm.content} onChange={e => setUtm({...utm, content: e.target.value})} placeholder="e.g., banner_v2" /></div>
                </div>
                {utmUrl && (
                  <div className="p-3 rounded-lg bg-muted font-mono text-xs break-all">{utmUrl}</div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => copyToClipboard(utmUrl)} disabled={!utmUrl}><Copy className="h-4 w-4 mr-1" />Copy URL</Button>
                  <Button onClick={handleCreateCampaign} disabled={!selectedLink || !utm.campaign}>Save Campaign</Button>
                </div>
              </CardContent>
            </Card>

            {campaigns && campaigns.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Your Campaigns</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {campaigns.map(c => (
                    <div key={c.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{c.campaign_name}</p>
                        <p className="text-xs text-muted-foreground">{c.utm_source}/{c.utm_medium} · {formatDate(c.created_at)}</p>
                      </div>
                      <div className="flex gap-3 text-sm">
                        <span>{c.clicks} clicks</span>
                        <span className="text-success">{c.conversions} conv</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Calculators */}
          <TabsContent value="tools" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Profit Estimator</CardTitle>
                <CardDescription>Estimate your potential commission earnings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Expected Clicks</Label>
                    <Input type="number" value={estClicks} onChange={e => setEstClicks(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Conversion Rate (%)</Label>
                    <Input type="number" value={estConvRate} onChange={e => setEstConvRate(Number(e.target.value))} step="0.5" />
                  </div>
                  <div className="space-y-2">
                    <Label>Avg Product Price ({CURRENCY.symbol})</Label>
                    <Input type="number" value={estAvgPrice} onChange={e => setEstAvgPrice(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Commission Rate (%)</Label>
                    <Input type="number" value={estCommission} onChange={e => setEstCommission(Number(e.target.value))} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-4 rounded-lg bg-muted/50 border">
                    <p className="text-2xl font-bold text-primary">{estSales}</p>
                    <p className="text-xs text-muted-foreground mt-1">Est. Sales</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50 border">
                    <p className="text-2xl font-bold">{formatCurrency(estRevenue)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Revenue</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-success/10 border border-success/30">
                    <p className="text-2xl font-bold text-success">{formatCurrency(estProfit)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Your Commission</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Quick Tips</CardTitle>
                <CardDescription>Boost your affiliate earnings with these strategies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: Lightbulb, title: "Promote High-Commission Products", desc: "Focus on products with 30%+ commission rates to maximize earnings per sale." },
                    { icon: TrendingUp, title: "Leverage UTM Tracking", desc: "Use UTM parameters to identify which channels convert best and double down." },
                    { icon: Type, title: "Write Compelling Captions", desc: "Use the AI Caption Generator to create platform-optimized promotional content." },
                    { icon: QrCode, title: "Use QR Codes Offline", desc: "Print QR codes on business cards, flyers, or packaging to drive offline traffic." },
                  ].map((tip, i) => (
                    <div key={i} className="p-4 rounded-lg bg-muted/50 border space-y-2">
                      <div className="flex items-center gap-2">
                        <tip.icon className="h-4 w-4 text-primary shrink-0" />
                        <p className="font-medium text-sm">{tip.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{tip.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Promo Materials */}
          <TabsContent value="materials" className="space-y-4 mt-4">
            {materialsLoading ? (
              <AnimatedLoading size="lg" />
            ) : !materials?.length ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 font-semibold">No materials available</h3>
                <p className="text-sm text-muted-foreground">Check back soon for promo materials from vendors.</p>
              </div>
            ) : (
              <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid gap-4 sm:grid-cols-2">
                {materials.map(mat => (
                  <motion.div key={mat.id} variants={staggerItem} className="glass-card p-4 space-y-3">
                    {mat.media_url && <img src={mat.media_url} alt={mat.title} className="rounded-lg aspect-video object-cover w-full" />}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{mat.material_type}</Badge>
                      <h3 className="font-semibold text-sm">{mat.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{mat.content}</p>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(mat.content)}>
                      <Copy className="h-4 w-4 mr-1" />Copy Text
                    </Button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>

          {/* Vendor Updates */}
          <TabsContent value="news" className="space-y-4 mt-4">
            {!announcements?.length ? (
              <div className="text-center py-12">
                <Megaphone className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 font-semibold">No updates</h3>
              </div>
            ) : (
              <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
                {announcements.map(ann => (
                  <motion.div key={ann.id} variants={staggerItem} className="glass-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{ann.announcement_type}</Badge>
                      <h3 className="font-semibold text-sm">{ann.title}</h3>
                    </div>
                    <p className="text-sm text-foreground">{ann.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      By {ann.vendor_profile?.full_name || "Vendor"} · {formatDate(ann.created_at)}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
