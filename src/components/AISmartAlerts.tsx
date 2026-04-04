import { useState } from "react";
import { Bell, Check, X, TrendingUp, AlertTriangle, Lightbulb, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  useAISmartAlerts,
  useMarkAlertRead,
  useDismissAlert,
  useUnreadAlertCount,
  AISmartAlert,
} from "@/hooks/useAIAutonomous";

interface AISmartAlertsProps {
  compact?: boolean;
  maxAlerts?: number;
}

export function AISmartAlerts({ compact = false, maxAlerts }: AISmartAlertsProps) {
  const { data: alerts, isLoading } = useAISmartAlerts(!compact);
  const markRead = useMarkAlertRead();
  const dismiss = useDismissAlert();
  const [showAll, setShowAll] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium":
        return "bg-warning/10 text-warning border-warning/20";
      case "low":
        return "bg-primary/10 text-primary border-primary/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "opportunity":
        return <TrendingUp className="h-4 w-4 text-success" />;
      case "trend":
        return <TrendingUp className="h-4 w-4 text-primary" />;
      case "optimization":
        return <Lightbulb className="h-4 w-4 text-warning" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const displayAlerts = showAll
    ? alerts
    : alerts?.slice(0, maxAlerts || (compact ? 3 : 10));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  const unreadCount = alerts?.filter((a) => !a.is_read).length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Smart Alerts
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            {!compact && (
              <CardDescription>AI-powered insights and opportunities</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!alerts?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No alerts yet.</p>
            <p className="text-sm">AI is monitoring for opportunities...</p>
          </div>
        ) : (
          <div className={`space-y-3 ${compact ? "max-h-64 overflow-y-auto" : ""}`}>
            {displayAlerts?.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border transition-colors ${
                  alert.is_read ? "bg-muted/50" : "bg-card border-l-4 border-l-primary"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getAlertIcon(alert.alert_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`font-medium ${alert.is_read ? "text-muted-foreground" : ""}`}>
                        {alert.title}
                      </h4>
                      <Badge className={getSeverityColor(alert.severity)} variant="outline">
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>

                    {/* AI Analysis */}
                    {alert.ai_analysis && !compact && (
                      <div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground">
                        {alert.ai_analysis.conversion_rate && (
                          <span className="mr-3">
                            Conversion: {(alert.ai_analysis.conversion_rate as number).toFixed(1)}%
                          </span>
                        )}
                        {alert.ai_analysis.sales_count && (
                          <span className="mr-3">
                            Sales: {alert.ai_analysis.sales_count as number}
                          </span>
                        )}
                        {alert.ai_analysis.trend_direction && (
                          <span>
                            Trend: {alert.ai_analysis.trend_direction as string}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Button */}
                    {alert.action_url && (
                      <div className="mt-3">
                        <Button size="sm" variant="outline" asChild>
                          <Link to={alert.action_url}>{alert.action_text || "View"}</Link>
                        </Button>
                      </div>
                    )}
                  </div>

                  {!compact && (
                    <div className="flex gap-1">
                      {!alert.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markRead.mutate(alert.id)}
                          disabled={markRead.isPending}
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismiss.mutate(alert.id)}
                        disabled={dismiss.isPending}
                        title="Dismiss"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {maxAlerts && alerts && alerts.length > maxAlerts && !showAll && (
              <Button variant="ghost" className="w-full" onClick={() => setShowAll(true)}>
                Show {alerts.length - maxAlerts} more alerts
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact alert bell for navbar
export function AIAlertBell() {
  const { data: count } = useUnreadAlertCount();

  return (
    <Link to="/dashboard/alerts" className="relative">
      <Bell className="h-5 w-5" />
      {count && count > 0 && (
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
