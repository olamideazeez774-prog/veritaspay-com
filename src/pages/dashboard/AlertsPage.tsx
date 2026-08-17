import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AISmartAlerts } from "@/components/AISmartAlerts";

export default function AlertsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Smart Alerts</h1>
          <p className="text-sm text-muted-foreground">
            Review AI-generated opportunities, trends, and optimization reminders.
          </p>
        </div>
        <AISmartAlerts />
      </div>
    </DashboardLayout>
  );
}
