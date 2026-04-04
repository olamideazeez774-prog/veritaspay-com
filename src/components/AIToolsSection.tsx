import { useState } from "react";
import { Sparkles, Type, Zap, Star, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAIInsight } from "@/hooks/useAIInsights";
import { toast } from "sonner";

export function AICaptionGenerator() {
  const [productName, setProductName] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [result, setResult] = useState("");
  const ai = useAIInsight();

  const generate = () => {
    if (!productName) { toast.error("Enter a product name"); return; }
    ai.mutate(
      { type: "caption_generator", data: { product_name: productName, description: productDesc, platform } },
      { onSuccess: (r) => setResult(r) }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Type className="h-5 w-5" />AI Caption Generator</CardTitle>
        <CardDescription>Generate compelling social media captions for your affiliate products</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Product Name</Label>
            <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g., Web Dev Course" />
          </div>
          <div className="space-y-2">
            <Label>Platform</Label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" title="Select social media platform">
              <option value="instagram">Instagram</option>
              <option value="twitter">Twitter/X</option>
              <option value="facebook">Facebook</option>
              <option value="linkedin">LinkedIn</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Product Description (optional)</Label>
          <Textarea value={productDesc} onChange={(e) => setProductDesc(e.target.value)} placeholder="Brief description of the product..." rows={2} />
        </div>
        <Button onClick={generate} disabled={ai.isPending}>
          {ai.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Generate Captions
        </Button>
        {result && (
          <div className="p-4 rounded-lg bg-muted/50 border space-y-2" role="region" aria-label="AI Generated Captions">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">AI Generated Captions</span>
              <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(result); toast.success("Copied!"); }}>
                <Copy className="h-3 w-3 mr-1" />Copy
              </Button>
            </div>
            <p className="text-sm whitespace-pre-wrap">{result}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AIHeadlineTester() {
  const [headlines, setHeadlines] = useState("");
  const [result, setResult] = useState("");
  const ai = useAIInsight();

  const test = () => {
    const lines = headlines.split("\n").filter(Boolean);
    if (lines.length < 2) { toast.error("Enter at least 2 headlines to compare"); return; }
    ai.mutate(
      { type: "headline_tester", data: { headlines: lines } },
      { onSuccess: (r) => setResult(r) }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />AI Headline Tester</CardTitle>
        <CardDescription>Compare headline variants and get AI scoring on which will convert best</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Headlines (one per line, min 2)</Label>
          <Textarea value={headlines} onChange={(e) => setHeadlines(e.target.value)} placeholder={"Unlock Your Earning Potential Today\nStart Earning Passive Income Now\nThe #1 Way to Make Money Online"} rows={4} />
        </div>
        <Button onClick={test} disabled={ai.isPending}>
          {ai.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
          Analyze Headlines
        </Button>
        {result && (
          <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
            <span className="text-xs font-medium text-muted-foreground">AI Analysis</span>
            <p className="text-sm whitespace-pre-wrap">{result}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AIBestProductToday({ products }: { products: any[] }) {
  const [result, setResult] = useState("");
  const ai = useAIInsight();

  const analyze = () => {
    if (!products?.length) { toast.error("No products available"); return; }
    ai.mutate(
      { type: "best_product_today", data: { products: products.slice(0, 20).map(p => ({ title: p.title, price: p.price, commission_percent: p.commission_percent, description: p.description?.slice(0, 100) })) } },
      { onSuccess: (r) => setResult(r) }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Star className="h-5 w-5" />Best Product Today</CardTitle>
        <CardDescription>AI analyzes available products to recommend what to promote right now</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={analyze} disabled={ai.isPending || !products?.length}>
          {ai.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Star className="h-4 w-4 mr-2" />}
          Find Best Product
        </Button>
        {result && (
          <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
            <span className="text-xs font-medium text-muted-foreground">AI Recommendation</span>
            <p className="text-sm whitespace-pre-wrap">{result}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
