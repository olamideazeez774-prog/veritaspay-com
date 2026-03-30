import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AISmartAlerts } from "@/components/AISmartAlerts";
import { AIContentCalendar } from "@/components/AIContentCalendar";
import { AIOptimizationSettingsPanel } from "@/components/AIOptimizationSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Calendar, Settings } from "lucide-react";

export default function AIAssistantPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            AI Assistant
          </h1>
          <p className="text-muted-foreground text-sm">
            Your personal AI-powered affiliate marketing assistant
          </p>
        </div>

        <Tabs defaultValue="alerts" className="w-full">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="alerts" className="flex-1 sm:flex-none">
              <Bell className="h-4 w-4 mr-2" />
              Smart Alerts
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex-1 sm:flex-none">
              <Calendar className="h-4 w-4 mr-2" />
              Content Calendar
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 sm:flex-none">
              <Settings className="h-4 w-4 mr-2" />
              AI Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="mt-4">
            <AISmartAlerts />
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <AIContentCalendar />
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <AIOptimizationSettingsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
