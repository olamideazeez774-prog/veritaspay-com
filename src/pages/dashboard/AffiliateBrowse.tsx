import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Search, Package, TrendingUp, Link2, Percent, DollarSign } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useMarketplaceProducts } from "@/hooks/useProducts";
import { useCreateAffiliateLink, useAffiliateLinks } from "@/hooks/useAffiliateLinks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatCurrency } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AffiliateBrowse() {
  const { user } = useAuth();
  const { data: products, isLoading } = useMarketplaceProducts();
  const { data: existingLinks } = useAffiliateLinks(user?.id);
  const createAffiliateLink = useCreateAffiliateLink();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("commission");

  // Get list of product IDs user already has links for
  const existingProductIds = new Set(existingLinks?.map((link) => link.product_id) || []);

  const filteredProducts = products
    ?.filter(
      (product) =>
        product.affiliate_enabled &&
        (product.title.toLowerCase().includes(search.toLowerCase()) ||
          product.description?.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "commission":
          return b.commission_percent - a.commission_percent;
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const handleGenerateLink = (productId: string) => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }
    createAffiliateLink.mutate(
      { affiliateId: user.id, productId },
      {
        onSuccess: () => {
          toast.success("Affiliate link created! View it in My Links.");
        },
      }
    );
  };

  const calculateEarnings = (price: number, commission: number) => {
    return Math.round((price * commission) / 100);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Browse Products</h1>
            <p className="text-muted-foreground">
              Find products to promote and generate affiliate links
            </p>
          </div>
          <Link to="/dashboard/links">
            <Button variant="outline">
              <Link2 className="mr-2 h-4 w-4" />
              My Links
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="commission">Highest Commission</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : !filteredProducts?.length ? (
          <EmptyState
            icon={Package}
            title="No products available"
            description="There are no affiliate-enabled products available at the moment. Check back soon!"
          />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filteredProducts.map((product) => {
              const hasLink = existingProductIds.has(product.id);
              const potentialEarnings = calculateEarnings(
                product.price,
                product.commission_percent
              );

              return (
                <motion.div
                  key={product.id}
                  variants={staggerItem}
                  className="glass-card overflow-hidden hover-lift group"
                >
                  {/* Cover Image */}
                  <div className="aspect-video overflow-hidden bg-muted relative">
                    {product.cover_image_url ? (
                      <img
                        src={product.cover_image_url}
                        alt={product.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                        <Package className="h-12 w-12 text-muted-foreground/40" />
                      </div>
                    )}
                    {/* Commission Badge */}
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-success text-success-foreground gap-1">
                        <Percent className="h-3 w-3" />
                        {product.commission_percent}% Commission
                      </Badge>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 space-y-4">
                    <div>
                      <h3 className="font-serif text-lg font-semibold line-clamp-1">
                        {product.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {product.description || "No description available"}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground">Price</p>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(product.price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Your Earnings</p>
                        <p className="text-lg font-bold text-success">
                          {formatCurrency(potentialEarnings)}
                        </p>
                      </div>
                    </div>

                    {/* Cookie Duration Info */}
                    <p className="text-xs text-muted-foreground text-center">
                      {product.cookie_duration_days}-day cookie • Instant payouts
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {hasLink ? (
                        <Link to="/dashboard/links" className="flex-1">
                          <Button variant="outline" className="w-full">
                            <Link2 className="mr-2 h-4 w-4" />
                            View Link
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          className="flex-1"
                          onClick={() => handleGenerateLink(product.id)}
                          disabled={createAffiliateLink.isPending}
                        >
                          <TrendingUp className="mr-2 h-4 w-4" />
                          {createAffiliateLink.isPending ? "Creating..." : "Generate Link"}
                        </Button>
                      )}
                      <Link to={`/product/${product.id}`}>
                        <Button variant="ghost" size="icon">
                          <DollarSign className="h-4 w-4" />
                        </Button>
                      </Link>
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
