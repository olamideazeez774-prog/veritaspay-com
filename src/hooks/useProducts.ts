import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/database";
import { toast } from "sonner";

export function useProducts(vendorId?: string) {
  return useQuery({
    queryKey: ["products", vendorId],
    queryFn: async () => {
      let query = supabase.from("products").select("*");
      
      if (vendorId) {
        query = query.eq("vendor_id", vendorId);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useProduct(productId: string) {
  return useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .maybeSingle();
      
      if (error) throw error;
      return data as Product | null;
    },
    enabled: !!productId,
  });
}

export function useMarketplaceProducts(page: number = 1, pageSize: number = 50) {
  return useQuery({
    queryKey: ["marketplace-products", page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await supabase
        .from("products")
        .select("*", { count: "exact" })
        .eq("status", "active")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      return { products: data as Product[], total: count || 0 };
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: { vendor_id: string; title: string; price: number } & Partial<Product>) => {
      const { data, error } = await supabase
        .from("products")
        .insert({
          vendor_id: product.vendor_id,
          title: product.title,
          price: product.price,
          description: product.description,
          commission_percent: product.commission_percent,
          platform_fee_percent: product.platform_fee_percent,
          external_url: product.external_url,
          cover_image_url: product.cover_image_url,
          status: product.status,
          affiliate_enabled: product.affiliate_enabled,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product created successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", variables.id] });
      toast.success("Product updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useAllProducts() {
  return useQuery({
    queryKey: ["all-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useApproveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, approve }: { productId: string; approve: boolean }) => {
      const { error } = await supabase
        .from("products")
        .update({ is_approved: approve })
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product updated!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
