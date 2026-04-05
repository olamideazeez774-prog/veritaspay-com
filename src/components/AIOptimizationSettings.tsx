import { useState } from "react";
import { Settings, Sparkles, Bell, Calendar, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import {
  useAIOptimizationSettings,
  useUpdateAIOptimizationSettings,
} from "@/hooks/useAIAutonomous";

export function AIOptimizationSettingsPanel() {
  const { data: settings, isLoading } = useAIOptimizationSettings();
  const updateSettings = useUpdateAIOptimizationSettings();
  const [localSettings, setLocalSettings] = useState(settings);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  const handleToggle = (key: keyof typeof localSettings, value: boolean) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    updateSettings.mutate({ [key]: value });
  };

  const handlePlatformToggle = (platform: string) => {
    const current = settings?.preferred_platforms || [];
    const newPlatforms = current.includes(platform)
      ? current.filter((p) => p !== platform)
      : [...current, platform];
    updateSettings.mutate({ preferred_platforms: newPlatforms });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          AI Automation Settings
        </CardTitle>
        <CardDescription>Configure how AI assists your affiliate marketing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Content Generation */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Content Generation
          </h4>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-generate captions</Label>
              <p className="text-sm text-muted-foreground">
                AI creates promotional content for your products
              </p>
            </div>
            <Switch
              checked={settings?.auto_generate_captions || false}
              onCheckedChange={(v) => handleToggle("auto_generate_captions", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-schedule posts</Label>
              <p className="text-sm text-muted-foreground">
                AI schedules content at optimal times
              </p>
            </div>
            <Switch
              checked={settings?.auto_schedule_posts || false}
              onCheckedChange={(v) => handleToggle("auto_schedule_posts", v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Preferred platforms</Label>
            <div className="flex flex-wrap gap-2">
              {["instagram", "twitter", "facebook", "linkedin", "whatsapp"].map((platform) => (
                <Button
                  key={platform}
                  variant={settings?.preferred_platforms?.includes(platform) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePlatformToggle(platform)}
                >
                  {platform}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Smart Alerts */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Smart Alerts
          </h4>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable smart alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about opportunities and trends
              </p>
            </div>
            <Switch
              checked={settings?.smart_alerts_enabled || false}
              onCheckedChange={(v) => handleToggle("smart_alerts_enabled", v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Minimum alert severity</Label>
            <div className="flex gap-2">
              {["low", "medium", "high"].map((severity) => (
                <Button
                  key={severity}
                  variant={settings?.alert_min_severity === severity ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateSettings.mutate({ alert_min_severity: severity as "low" | "medium" | "high" })}
                >
                  {severity}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Auto-Optimization */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Auto-Optimization
          </h4>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-optimize commission rates</Label>
              <p className="text-sm text-muted-foreground">
                AI suggests optimal commission structures
              </p>
            </div>
            <Switch
              checked={settings?.auto_optimize_commissions || false}
              onCheckedChange={(v) => handleToggle("auto_optimize_commissions", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-adjust pricing suggestions</Label>
              <p className="text-sm text-muted-foreground">
                Get AI pricing recommendations for your products
              </p>
            </div>
            <Switch
              checked={settings?.auto_adjust_prices || false}
              onCheckedChange={(v) => handleToggle("auto_adjust_prices", v)}
            />
          </div>
        </div>

        {/* Scheduling Preferences */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Scheduling Preferences
          </h4>
          
          <div className="space-y-2">
            <Label>Content frequency</Label>
            <div className="flex gap-2">
              {["daily", "weekly", "monthly"].map((freq) => (
                <Button
                  key={freq}
                  variant={settings?.content_frequency === freq ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateSettings.mutate({ content_frequency: freq })}
                >
                  {freq}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
