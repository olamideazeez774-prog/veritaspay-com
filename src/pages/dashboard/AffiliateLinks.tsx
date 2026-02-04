import { useState } from "react";
import { motion } from "framer-motion";
import { Link2, Copy, Trash2, ExternalLink, MousePointer, Target } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useAffiliateLinks, useDeleteAffiliateLink } from "@/hooks/useAffiliateLinks";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { Link } from "react-router-dom";
import { ShareMenu } from "@/components/ui/share-menu";
import { AnimatedLoading } from "@/components/ui/animated-loading";

export default function AffiliateLinks() {
  const { user } = useAuth();
  const { data: links, isLoading } = useAffiliateLinks(user?.id);
  const deleteLink = useDeleteAffiliateLink();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/ref/${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const getShareUrl = (code: string) => `${window.location.origin}/ref/${code}`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Affiliate Links</h1>
            <p className="text-muted-foreground">Manage and track your affiliate links</p>
          </div>
          <Link to="/dashboard/browse">
            <Button>
              <Link2 className="mr-2 h-4 w-4" />
              Browse Products
            </Button>
          </Link>
        </div>

        {/* Links Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <AnimatedLoading size="lg" text="Loading your links..." />
          </div>
        ) : !links?.length ? (
          <EmptyState
            icon={Link2}
            title="No affiliate links yet"
            description="Browse the marketplace and generate links for products you want to promote."
            action={
              <Link to="/dashboard/browse">
                <Button>Browse Products</Button>
              </Link>
            }
          />
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid gap-4"
          >
            {links.map((link) => (
              <motion.div
                key={link.id}
                variants={staggerItem}
                className="glass-card p-4 sm:p-6"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  {/* Product Info */}
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {link.products?.cover_image_url ? (
                        <img
                          src={link.products.cover_image_url}
                          alt={link.products.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                          <Link2 className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif font-semibold">{link.products?.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatCurrency(link.products?.price || 0)} •{" "}
                        {link.products?.commission_percent}% commission
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {link.unique_code}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-2xl font-bold">
                        <MousePointer className="h-5 w-5 text-muted-foreground" />
                        {link.clicks_count}
                      </div>
                      <p className="text-xs text-muted-foreground">Clicks</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-2xl font-bold text-success">
                        <Target className="h-5 w-5" />
                        {link.conversions_count}
                      </div>
                      <p className="text-xs text-muted-foreground">Conversions</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {link.clicks_count > 0
                          ? ((link.conversions_count / link.clicks_count) * 100).toFixed(1)
                          : 0}
                        %
                      </div>
                      <p className="text-xs text-muted-foreground">Conv. Rate</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {/* Share Menu with multiple options */}
                    <ShareMenu
                      url={getShareUrl(link.unique_code)}
                      title={`Check out ${link.products?.title}!`}
                      variant="destructive"
                      size="sm"
                    />
                    <Button variant="outline" size="sm" onClick={() => copyLink(link.unique_code)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <a
                        href={link.products?.external_url || `/product/${link.product_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(link.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Delete Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Link</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this affiliate link? Your tracking data will be
                lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteId) {
                    deleteLink.mutate(deleteId);
                    setDeleteId(null);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
