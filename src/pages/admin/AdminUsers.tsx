import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Search, Shield, ShoppingBag, Link2, Crown, BadgeCheck } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatDate } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string | null;
  vendor_tier: string;
  is_verified: boolean;
  created_at: string;
  roles: AppRole[];
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles").select("*").order("created_at", { ascending: false });
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase.from("user_roles").select("*");
      if (rolesError) throw rolesError;

      return profiles.map((profile) => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        vendor_tier: profile.vendor_tier || "normal",
        is_verified: profile.is_verified || false,
        created_at: profile.created_at,
        roles: roles.filter((r) => r.user_id === profile.id).map((r) => r.role),
      })) as UserWithRoles[];
    },
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Role added"); },
    onError: () => { toast.error("Failed to add role"); },
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Role removed"); },
    onError: () => { toast.error("Failed to remove role"); },
  });

  const updateVendorTier = useMutation({
    mutationFn: async ({ userId, tier }: { userId: string; tier: string }) => {
      const { error } = await supabase.from("profiles").update({ vendor_tier: tier } as any).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Vendor tier updated"); },
    onError: () => { toast.error("Failed to update tier"); },
  });

  const toggleVerified = useMutation({
    mutationFn: async ({ userId, verified }: { userId: string; verified: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_verified: verified } as any).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Verification updated"); },
    onError: () => { toast.error("Failed to update"); },
  });

  const filteredUsers = users?.filter(
    (user) =>
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case "admin": return <Shield className="h-3 w-3" />;
      case "vendor": return <ShoppingBag className="h-3 w-3" />;
      case "affiliate": return <Link2 className="h-3 w-3" />;
    }
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case "admin": return "destructive" as const;
      case "vendor": return "default" as const;
      case "affiliate": return "secondary" as const;
    }
  };

  const allRoles: AppRole[] = ["admin", "vendor", "affiliate"];

  const ManageMenu = ({ user }: { user: UserWithRoles }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="min-h-[44px]">Manage</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {allRoles.map((role) => {
          const hasRole = user.roles.includes(role);
          return (
            <DropdownMenuItem key={role} onClick={() =>
              hasRole ? removeRole.mutate({ userId: user.id, role }) : addRole.mutate({ userId: user.id, role })
            }>
              {hasRole ? `Remove ${role}` : `Add ${role}`}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => updateVendorTier.mutate({ userId: user.id, tier: user.vendor_tier === "premium" ? "normal" : "premium" })}>
          <Crown className="h-4 w-4 mr-2" />
          {user.vendor_tier === "premium" ? "Remove Premium" : "Set Premium"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toggleVerified.mutate({ userId: user.id, verified: !user.is_verified })}>
          <BadgeCheck className="h-4 w-4 mr-2" />
          {user.is_verified ? "Remove Verified" : "Set Verified"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Manage Users</h1>
          <p className="text-muted-foreground text-sm">View and manage user accounts, roles, and vendor tiers</p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
        ) : !filteredUsers?.length ? (
          <EmptyState icon={Users} title="No users found" description="No users match your search." />
        ) : (
          <>
            {/* Mobile cards */}
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3 sm:hidden">
              {filteredUsers.map((user) => (
                <motion.div key={user.id} variants={staggerItem} className="glass-card p-4 space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.full_name || "No name"}</p>
                      {user.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                      {user.vendor_tier === "premium" && <Crown className="h-4 w-4 text-warning" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.length > 0 ? user.roles.map((role) => (
                      <Badge key={role} variant={getRoleBadgeVariant(role)} className="gap-1">
                        {getRoleIcon(role)} {role}
                      </Badge>
                    )) : <span className="text-sm text-muted-foreground">No roles</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{formatDate(user.created_at)}</span>
                    <ManageMenu user={user} />
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Desktop table */}
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="glass-card overflow-hidden hidden sm:block">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <motion.tr key={user.id} variants={staggerItem}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium">{user.full_name || "No name"}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                            {user.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.length > 0 ? user.roles.map((role) => (
                              <Badge key={role} variant={getRoleBadgeVariant(role)} className="gap-1">
                                {getRoleIcon(role)} {role}
                              </Badge>
                            )) : <span className="text-sm text-muted-foreground">No roles</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {user.vendor_tier === "premium" && <Crown className="h-4 w-4 text-warning" />}
                            <span className="capitalize text-sm">{user.vendor_tier}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <ManageMenu user={user} />
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
