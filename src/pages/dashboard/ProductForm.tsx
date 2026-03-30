import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, CreditCard } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useProduct, useCreateProduct, useUpdateProduct } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { PaymentModal } from "@/components/PaymentModal";
import { LISTING_FEE } from "@/hooks/useListingPayment";
import { formatCurrency } from "@/lib/format";
import {
  DEFAULT_COMMISSION_PERCENT,
  MIN_COMMISSION_PERCENT,
  MAX_COMMISSION_PERCENT,
} from "@/lib/constants";
import { ProductStatus } from "@/types/database";
import { toast } from "sonner";

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: existingProduct, isLoading: loadingProduct } = useProduct(id || "");
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const isEditing = !!id;
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingProductData, setPendingProductData] = useState<Partial<Product> | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    commission_percent: DEFAULT_COMMISSION_PERCENT,
    external_url: "",
    cover_image_url: "",
    status: "draft" as ProductStatus,
    affiliate_enabled: true,
  });

  useEffect(() => {
    if (existingProduct) {
      setFormData({
        title: existingProduct.title,
        description: existingProduct.description || "",
        price: existingProduct.price.toString(),
        commission_percent: existingProduct.commission_percent,
        external_url: existingProduct.external_url || "",
        cover_image_url: existingProduct.cover_image_url || "",
        status: existingProduct.status,
        affiliate_enabled: existingProduct.affiliate_enabled,
      });
    }
  }, [existingProduct]);

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a product title");
      return false;
    }
    if (!formData.price || parseFloat(formData.price) < 100) {
      toast.error("Please enter a valid price (minimum ₦100)");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!validateForm()) return;

    const productData = {
      vendor_id: user.id,
      title: formData.title,
      description: formData.description || null,
      price: parseFloat(formData.price),
      commission_percent: formData.commission_percent,
      external_url: formData.external_url || null,
      cover_image_url: formData.cover_image_url || null,
      status: formData.status,
      affiliate_enabled: formData.affiliate_enabled,
    };

    if (isEditing && id) {
      // No payment required for editing
      await updateProduct.mutateAsync({ id, ...productData });
      navigate("/dashboard/products");
    } else {
      // New product requires payment
      setPendingProductData(productData);
      setShowPaymentModal(true);
    }
  };

  const handlePaymentComplete = async (paymentReference: string) => {
    if (!pendingProductData) return;

    try {
      // Create product with draft status (will be activated after admin approval)
      await createProduct.mutateAsync({
        ...pendingProductData,
        status: "draft", // Will be activated after admin verifies payment
      });
      navigate("/dashboard/products");
    } catch (error) {
      console.error("Failed to create product:", error);
    }
  };

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditing ? "Edit Product" : "Create Product"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update your product details" : "Add a new digital product"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>The main details about your product</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Product Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Complete Web Development Course"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your product..."
                    rows={4}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₦) *</Label>
                    <Input
                      id="price"
                      type="number"
                      min="100"
                      step="100"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="5000"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: ProductStatus) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Media */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Media & Links</CardTitle>
                <CardDescription>Add images and external links</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cover_image_url">Cover Image URL</Label>
                  <Input
                    id="cover_image_url"
                    type="url"
                    value={formData.cover_image_url}
                    onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="external_url">Product/Sales Page URL</Label>
                  <Input
                    id="external_url"
                    type="url"
                    value={formData.external_url}
                    onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                    placeholder="https://yoursite.com/product"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Affiliate Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Affiliate Settings</CardTitle>
                <CardDescription>Configure affiliate commission and availability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Affiliate Program</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow affiliates to promote this product
                    </p>
                  </div>
                  <Switch
                    checked={formData.affiliate_enabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, affiliate_enabled: checked })
                    }
                  />
                </div>

                {formData.affiliate_enabled && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Commission Rate</Label>
                        <span className="font-semibold text-primary">
                          {formData.commission_percent}%
                        </span>
                      </div>
                      <Slider
                        value={[formData.commission_percent]}
                        onValueChange={([value]) =>
                          setFormData({ ...formData, commission_percent: value })
                        }
                        min={MIN_COMMISSION_PERCENT}
                        max={MAX_COMMISSION_PERCENT}
                        step={5}
                        className="py-4"
                      />
                      <p className="text-xs text-muted-foreground">
                        Affiliates will earn {formData.commission_percent}% of each sale they
                        generate.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Listing Fee Notice (for new products only) */}
          {!isEditing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-primary/10 p-3">
                      <CreditCard className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Listing Fee Required</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        A one-time listing fee of <strong>{formatCurrency(LISTING_FEE)}</strong> is
                        required to publish your product. Your product will be reviewed and
                        activated within 24 hours after payment verification.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Continue to Payment
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Payment Modal */}
        {user && (
          <PaymentModal
            open={showPaymentModal}
            onOpenChange={setShowPaymentModal}
            onPaymentComplete={handlePaymentComplete}
            vendorId={user.id}
            amount={LISTING_FEE}
            title="Product Listing Fee"
            description={`Pay ${formatCurrency(LISTING_FEE)} to list "${formData.title}"`}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
