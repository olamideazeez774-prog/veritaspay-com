import { useState } from "react";
import { motion } from "framer-motion";
import { Package, Check, X, ExternalLink, Search } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAllProducts, useApproveProduct } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatCurrency, formatDate } from "@/lib/format";
import { PRODUCT_STATUS_LABELS } from "@/lib/constants";
import { staggerContainer, staggerItem } from "@/lib/animations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminProducts() {
  const { data: products, isLoading } = useAllProducts();
  const approveProduct = useApproveProduct();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filteredProducts = products?.filter((product) => {
    const matchesSearch =
      product.title.toLowerCase().includes(search.toLowerCase()) ||
      product.description?.toLowerCase().includes(search.toLowerCase());

    switch (filter) {
      case "pending":
        return matchesSearch && !product.is_approved;
      case "approved":
        return matchesSearch && product.is_approved;
      default:
        return matchesSearch;
    }
  });

  const handleApprove = (productId: string, approve: boolean) => {
    approveProduct.mutate({ productId, approve });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Products</h1>
          <p className="text-muted-foreground">Review and approve product submissions</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="pending">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : !filteredProducts?.length ? (
          <EmptyState
            icon={Package}
            title="No products found"
            description={
              filter === "pending"
                ? "No products pending approval."
                : "No products match your search."
            }
          />
        ) : (
          <>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-3 sm:hidden"
          >
            {/* Mobile card view */}
            {filteredProducts.map((product) => (
              <motion.div key={product.id} variants={staggerItem} className="glass-card p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {product.cover_image_url ? (
                      <img src={product.cover_image_url} alt={product.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><Package className="h-5 w-5 text-muted-foreground" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.title}</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(product.price)} · {product.commission_percent}% commission</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={product.status === "active" ? "default" : product.status === "paused" ? "outline" : "secondary"}>
                    {PRODUCT_STATUS_LABELS[product.status]}
                  </Badge>
                  {product.is_approved ? (
                    <Badge variant="default" className="bg-success">Approved</Badge>
                  ) : (
                    <Badge variant="destructive">Pending</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{formatDate(product.created_at)}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/product/${product.id}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    {!product.is_approved ? (
                      <Button size="sm" variant="outline" className="text-success" onClick={() => handleApprove(product.id, true)} disabled={approveProduct.isPending}>
                        <Check className="mr-1 h-4 w-4" /> Approve
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleApprove(product.id, false)} disabled={approveProduct.isPending}>
                        <X className="mr-1 h-4 w-4" /> Revoke
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Desktop table view */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="glass-card overflow-hidden hidden sm:block"
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <motion.tr key={product.id} variants={staggerItem} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                            {product.cover_image_url ? (
                              <img src={product.cover_image_url} alt={product.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center"><Package className="h-4 w-4 text-muted-foreground" /></div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium line-clamp-1">{product.title}</p>
                            <p className="text-xs text-muted-foreground">{product.commission_percent}% commission</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(product.price)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={product.status === "active" ? "default" : product.status === "paused" ? "outline" : "secondary"}>
                            {PRODUCT_STATUS_LABELS[product.status]}
                          </Badge>
                          {product.is_approved ? (
                            <Badge variant="default" className="bg-success">Approved</Badge>
                          ) : (
                            <Badge variant="destructive">Pending</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(product.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild>
                            <a href={`/product/${product.id}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          {!product.is_approved ? (
                            <Button size="sm" variant="outline" className="text-success" onClick={() => handleApprove(product.id, true)} disabled={approveProduct.isPending}>
                              <Check className="mr-1 h-4 w-4" /> Approve
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleApprove(product.id, false)} disabled={approveProduct.isPending}>
                              <X className="mr-1 h-4 w-4" /> Revoke
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </motion.div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
