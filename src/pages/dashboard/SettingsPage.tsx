import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, Mail, Lock, Save, Upload, Moon, Sun, PenTool, Trash2, BadgeCheck, Shield } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

export default function SettingsPage() {
  const { user, profile, isLoading, isAdmin, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ full_name: "", email: "" });
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Signature pad state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);

  // Verification
  const [applyingVerification, setApplyingVerification] = useState(false);

  const { data: verificationRequest } = useQuery({
    queryKey: ["my-verification", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: wallet } = useQuery({
    queryKey: ["my-wallet-for-verify", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallets")
        .select("total_earned")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: ranks } = useQuery({
    queryKey: ["affiliate-ranks-verify"],
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_ranks")
        .select("rank_name, min_earnings")
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const totalEarned = wallet?.total_earned || 0;
  const goldRank = ranks?.find(r => r.rank_name === "Gold");
  const isGoldPlus = goldRank ? totalEarned >= goldRank.min_earnings : false;

  useEffect(() => {
    if (profile) {
      setFormData({ full_name: profile.full_name || "", email: profile.email || user?.email || "" });
    }
  }, [profile, user]);

  useEffect(() => {
    if (isAdmin) {
      supabase.from("platform_settings").select("value").eq("key", "admin_signature").maybeSingle().then(({ data }) => {
        const url = (data?.value as Record<string, string>)?.url;
        if (url) setSavedSignature(url);
      });
    }
  }, [isAdmin]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ full_name: formData.full_name }).eq("id", user?.id);
      if (error) throw error;
      toast.success("Profile updated successfully");
      refreshProfile();
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Only JPEG and PNG are allowed");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);
      if (updateError) throw updateError;

      toast.success("Profile photo updated!");
      refreshProfile();
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) { toast.error("Passwords do not match"); return; }
    if (passwordData.new.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.new });
      if (error) throw error;
      toast.success("Password updated successfully");
      setPasswordData({ current: "", new: "", confirm: "" });
    } catch {
      toast.error("Failed to update password");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyVerification = async () => {
    if (!user) return;
    setApplyingVerification(true);
    try {
      const { error } = await supabase.from("verification_requests").insert({
        user_id: user.id,
        path: "earned",
        status: "pending",
      });
      if (error) {
        if (error.code === "23505") toast.info("Verification request already submitted");
        else throw error;
      } else {
        toast.success("Verification request submitted! You'll be notified once reviewed.");
      }
    } catch {
      toast.error("Failed to submit verification request");
    } finally {
      setApplyingVerification(false);
    }
  };

  // Signature pad handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = theme === "dark" ? "#fff" : "#000";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    try {
      await supabase.from("platform_settings").upsert(
        { key: "admin_signature", value: { url: dataUrl } as Record<string, unknown>, updated_by: user?.id },
        { onConflict: "key" }
      );
      setSavedSignature(dataUrl);
      toast.success("Signature saved! Certificates can now be generated.");
    } catch {
      toast.error("Failed to save signature");
    }
  };

  if (isLoading) {
    return <DashboardLayout><div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div></DashboardLayout>;
  }

  const initials = profile?.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || user?.email?.[0].toUpperCase() || "?";

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ] as const;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your account settings</p>
        </div>

        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
          {/* Profile Section */}
          <motion.div variants={staggerItem} className="glass-card p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-6">Profile Information</h2>
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xl bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    title="Upload profile picture"
                    aria-label="Upload profile picture"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <LoadingSpinner size="sm" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{profile?.full_name || "Add your name"}</p>
                    {profile?.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">JPEG/PNG, max 2MB</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="full_name" placeholder="Your full name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" value={formData.email} className="pl-10" disabled />
                </div>
                <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
              </div>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <LoadingSpinner size="sm" className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </form>
          </motion.div>

          {/* Verification Badge */}
          {!isAdmin && (
            <motion.div variants={staggerItem} className="glass-card p-4 sm:p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-primary" />
                Verification Badge
              </h2>
              {profile?.is_verified ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/30">
                  <BadgeCheck className="h-6 w-6 text-success" />
                  <div>
                    <p className="font-semibold text-success">Verified Account</p>
                    <p className="text-sm text-muted-foreground">Your account has been verified. The badge is visible on your profile.</p>
                  </div>
                </div>
              ) : verificationRequest?.status === "pending" ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
                  <Shield className="h-6 w-6 text-warning" />
                  <div>
                    <p className="font-semibold">Verification Pending</p>
                    <p className="text-sm text-muted-foreground">Your verification request is under review. You'll be notified once approved.</p>
                  </div>
                </div>
              ) : isGoldPlus ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    You've reached Gold rank or above! You're eligible for a free verification badge.
                  </p>
                  <Button onClick={handleApplyVerification} disabled={applyingVerification} className="min-h-[44px]">
                    <BadgeCheck className="h-4 w-4 mr-2" />
                    Apply for Verification (Free)
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Get verified to build trust with vendors and buyers. Available through two paths:
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border p-3 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Earn It</p>
                      <p className="text-sm">Reach Gold rank to qualify for free verification.</p>
                      <p className="text-xs text-muted-foreground">
                        Progress: {totalEarned > 0 ? `₦${totalEarned.toLocaleString()}` : "₦0"}
                        {goldRank && ` / ₦${goldRank.min_earnings.toLocaleString()}`}
                      </p>
                    </div>
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide">Pay for It</p>
                      <p className="text-sm">Purchase a verification badge for a one-time fee.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full min-h-[44px]"
                        onClick={async () => {
                          if (!user) return;
                          setApplyingVerification(true);
                          try {
                            const { error } = await supabase.from("verification_requests").insert({
                              user_id: user.id,
                              path: "paid",
                              status: "pending",
                            });
                            if (error) {
                              if (error.code === "23505") toast.info("Verification request already submitted");
                              else throw error;
                            } else {
                              toast.success("Paid verification request submitted! You'll be notified once reviewed.");
                            }
                          } catch {
                            toast.error("Failed to submit verification request");
                          } finally {
                            setApplyingVerification(false);
                          }
                        }}
                        disabled={applyingVerification}
                      >
                        <BadgeCheck className="h-4 w-4 mr-2" />
                        Request Paid Verification
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Admin Signature Pad */}
          {isAdmin && (
            <motion.div variants={staggerItem} className="glass-card p-4 sm:p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <PenTool className="h-5 w-5 text-primary" />
                Admin Signature
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Draw your signature below. This will appear on all certificates issued by the platform.
              </p>
              {savedSignature && (
                <div className="mb-4 p-3 rounded-lg border bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-2">Current signature:</p>
                  <img src={savedSignature} alt="Admin signature" className="h-16 object-contain" />
                </div>
              )}
              <div className="border rounded-lg overflow-hidden mb-3 touch-none bg-slate-50 dark:bg-slate-900">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={150}
                  className="w-full cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearCanvas} className="min-h-[44px]">
                  <Trash2 className="h-4 w-4 mr-1" />Clear
                </Button>
                <Button size="sm" onClick={saveSignature} className="min-h-[44px]">
                  <Save className="h-4 w-4 mr-1" />Save Signature
                </Button>
              </div>
            </motion.div>
          )}

          {/* Appearance Section */}
          <motion.div variants={staggerItem} className="glass-card p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-6">Appearance</h2>
            <div className="space-y-4">
              <Label>Theme</Label>
              <div className="grid grid-cols-2 gap-3">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all min-h-[56px]",
                      theme === option.value ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <option.icon className={cn("h-5 w-5", theme === option.value ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("font-medium", theme === option.value ? "text-primary" : "text-muted-foreground")}>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Password Section */}
          <motion.div variants={staggerItem} className="glass-card p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-6">Change Password</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="new_password" type="password" placeholder="Enter new password" value={passwordData.new} onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="confirm_password" type="password" placeholder="Confirm new password" value={passwordData.confirm} onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} className="pl-10" required />
                </div>
              </div>
              <Button type="submit" variant="outline" disabled={isSaving}>
                {isSaving ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </motion.div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
