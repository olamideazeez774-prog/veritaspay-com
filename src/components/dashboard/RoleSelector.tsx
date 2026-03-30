import { useState } from "react";
import { motion } from "framer-motion";
import { Package, Link2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const roles = [
  {
    id: "vendor",
    title: "Become a Vendor",
    description: "Sell digital products and recruit affiliates to scale your revenue.",
    icon: Package,
    features: ["List unlimited products", "Set your commission rates", "Track sales & earnings"],
  },
  {
    id: "affiliate",
    title: "Become an Affiliate",
    description: "Promote products and earn commissions on every sale you generate.",
    icon: Link2,
    features: ["Generate affiliate links", "Track clicks & conversions", "Earn recurring commissions"],
  },
];

export function RoleSelector() {
  const { user, refreshProfile } = useAuth();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = async () => {
    if (!user || selectedRoles.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const rolesToInsert = selectedRoles.map((role) => ({
        user_id: user.id,
        role: role as "vendor" | "affiliate",
      }));

      const { error } = await supabase.from("user_roles").insert(rolesToInsert);

      if (error) throw error;

      toast.success("Roles assigned successfully!");
      await refreshProfile();
    } catch (error: any) {
      toast.error(error.message);
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
        {roles.map((role) => {
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
                  <Check className="h-4 w-4" />
                </motion.div>
              )}
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <role.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-serif text-lg font-semibold">{role.title}</h3>
              <p className="mb-4 text-sm text-muted-foreground">{role.description}</p>
              <ul className="space-y-2">
                {role.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
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
