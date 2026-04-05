import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Search, Filter, Package, TrendingUp } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useMarketplaceProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/format";
import { staggerContainer, staggerItem, fadeInUp } from "@/lib/animations";
import { AnimatedLoading } from "@/components/ui/animated-loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Marketplace() {
  const [page, setPage] = useState(1);
  const { data: productsData, isLoading } = useMarketplaceProducts(page, 50);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const products = productsData?.products || [];
  const totalProducts = productsData?.total || 0;

  const filteredProducts = products
    .filter(
      (product) =>
        product.title.toLowerCase().includes(search.toLowerCase()) ||
        product.description?.toLowerCase().includes(search.toLowerCase())
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Blur input to dismiss mobile keyboard
    searchInputRef.current?.blur();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      searchInputRef.current?.blur();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 py-16 sm:py-24">
          <div className="container mx-auto px-4">
            <motion.div
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              className="mx-auto max-w-3xl text-center"
            >
              <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Discover Premium{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Digital Products
                </span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Browse our curated collection of high-quality digital products and start earning
                commissions as an affiliate.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Filters */}
        <section className="border-b bg-card/50 py-6">
          <div className="container mx-auto px-4">
            <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="pl-10"
                  enterKeyHint="search"
                />
              </div>
              <div className="flex items-center gap-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="commission">Highest Commission</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </form>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-12 sm:py-16">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="flex justify-center py-20">
                <AnimatedLoading size="lg" text="Loading products..." />
              </div>
            ) : !filteredProducts?.length ? (
              <EmptyState
                icon={Package}
                title="No products found"
                description={
                  search
                    ? "Try adjusting your search terms."
                    : "Check back soon for new products."
                }
              />
            ) : (
              <>
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                >
                  {filteredProducts.map((product) => (
                    <motion.div key={product.id} variants={staggerItem}>
                      <Link
                        to={`/product/${product.id}`}
                        className="group block glass-card overflow-hidden hover-lift"
                      >
                        {/* Cover Image */}
                        <div className="aspect-video overflow-hidden bg-muted">
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
                        </div>

                        {/* Content */}
                        <div className="p-5">
                          <h3 className="font-serif text-lg font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                            {product.title}
                          </h3>
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                            {product.description || "No description available"}
                          </p>

                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-xl font-bold text-primary">
                              {formatCurrency(product.price)}
                            </span>
                            {product.affiliate_enabled && (
                              <Badge variant="secondary" className="gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {product.commission_percent}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
                
                {products.length < totalProducts && (
                  <div className="flex justify-center mt-8">
                    <Button
                      onClick={() => setPage(p => p + 1)}
                      disabled={isLoading}
                      variant="outline"
                    >
                      {isLoading ? "Loading..." : `Load More (${totalProducts - products.length} remaining)`}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
