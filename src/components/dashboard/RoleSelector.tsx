import { useState } from "react";
import { motion } from "framer-motion";
import { Package, Link2, Check, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { useAllFeatureFlags } from "@/hooks/useFeatureFlag";
import {
  AFFILIATE_REGISTRATION_FEE,
  AFFILIATE_DISPLAY_MONTHLY,
} from "@/lib/constants";

const roles = [
  {
    id: "vendor",
    title: "Become a Vendor",
    description: "Register for free, list courses for ₦2,000 each, and earn through the affiliate network.",
    icon: Package,
    fee: 0,
    feeLabel: "Free vendor registration",
    platformFee: "5% platform commission per sale",
    features: ["List unlimited products", "Set commission rates (50%+)", "Track sales & earnings"],
  },
  {
    id: "affiliate",
    title: "Become an Affiliate",
    description: `₦${AFFILIATE_DISPLAY_MONTHLY}/month. Promote products and earn commissions.`,
    icon: Link2,
    fee: AFFILIATE_REGISTRATION_FEE,
    feeLabel: `₦${AFFILIATE_DISPLAY_MONTHLY}/month`,
    features: ["Generate affiliate links", "Track clicks & conversions", "Earn 50%+ commission per sale"],
  },
];

export function RoleSelector() {
  const { user } = useAuth();
  const { flags } = useAllFeatureFlags();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const visibleRoles = roles.filter((r) => {
    if (r.id === "vendor" && flags.vendor_onboarding?.enabled === false) return false;
    if (r.id === "affiliate" && flags.affiliate_rewards?.enabled === false) return false;
    return true;
  });

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = async () => {
    if (!user || selectedRoles.length === 0) return;
    
    setIsSubmitting(true);
    try {
      // Vendor registration is free and may activate immediately. Affiliate membership remains payment-gated.
      const callbackUrl = `${window.location.origin}/payment/callback`;

      // Each selected role becomes its own payment intent so partial failures
      // never accidentally activate a role the user didn't pay for.
      if (selectedRoles.includes("vendor")) {
        const { data: existingVendorRole } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", user.id)
          .eq("role", "vendor")
          .maybeSingle();
        if (!existingVendorRole) {
          const { error: roleError } = await supabase.from("user_roles").insert({ user_id: user.id, role: "vendor" });
          if (roleError) throw roleError;
        }
      }

      const intents: Array<{ purpose: "affiliate_membership"; amount: number; metadata: Record<string, unknown> }> = [];
      if (selectedRoles.includes("affiliate")) {
        intents.push({
          purpose: "affiliate_membership",
          amount: AFFILIATE_REGISTRATION_FEE,
          metadata: {},
        });
      }

      // Affiliate membership is the only paid role setup. Vendor registration is already complete if selected.
      const [first, ...rest] = intents;
      if (!first) {
        toast.success(selectedRoles.includes("vendor") ? "Vendor account activated for free." : "Role setup complete.");
        window.location.href = "/dashboard";
        return;
      }

      const { data, error: payErr } = await supabase.functions.invoke("initialize-payment", {
        body: { email: user.email, purpose: first.purpose, userId: user.id, amount: first.amount, callbackUrl, metadata: first.metadata },
      });
      if (payErr) throw payErr;
      if (data?.error) throw new Error(data.error);

      sessionStorage.setItem("payment_purpose_context", JSON.stringify({
        purpose: first.purpose,
        userId: user.id,
        reference: data.reference,
        redirect: "/dashboard",
        queue: rest.map((r) => ({ ...r, email: user.email, userId: user.id })),
      }));
      window.location.href = data.authorization_url;
      return;
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Could not start payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 lg:p-8"
    >
      <div className="mb-6 text-center">
        <h2 className="font-serif text-2xl font-bold">Choose Your Role</h2>
        <p className="mt-2 text-muted-foreground">
          Select one or both roles to get started. You can always change this later.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visibleRoles.map((role) => {
          const isSelected = selectedRoles.includes(role.id);
          return (
            <motion.button
              key={role.id}
              onClick={() => toggleRole(role.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative flex flex-col items-start rounded-xl border-2 p-6 text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                </motion.div>
              )}
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <role.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mb-2 font-serif text-lg font-semibold">{role.title}</h3>
              <p className="mb-4 text-sm text-muted-foreground">{role.description}</p>

              {/* Fee information */}
              <div className="mb-4 w-full rounded-lg bg-muted p-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Info className="h-3 w-3" aria-hidden="true" />
                  <span>{role.feeLabel}</span>
                </div>
                <p className="font-semibold text-primary">{formatCurrency(role.fee)}</p>
                {"platformFee" in role && (
                  <p className="text-xs text-muted-foreground mt-1">{role.platformFee}</p>
                )}
              </div>

              <ul className="space-y-2">
                {role.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.button>
          );
        })}
      </div>



      <div className="mt-6 flex justify-center">
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={selectedRoles.length === 0 || isSubmitting}
        >
          {isSubmitting ? "Setting up..." : "Continue"}
        </Button>
      </div>
    </motion.div>
  );
}
