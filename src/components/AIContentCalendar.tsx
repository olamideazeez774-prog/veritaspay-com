import { useState } from "react";
import { Calendar, Clock, CheckCircle, X, Copy, ExternalLink, Sparkles, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import {
  useAIContentCalendar,
  useUpdateContentStatus,
  useDeleteContentItem,
  AIContentCalendarItem,
} from "@/hooks/useAIAutonomous";

interface AIContentCalendarProps {
  linkId?: string;
}

export function AIContentCalendar({ linkId }: AIContentCalendarProps) {
  const { data: items, isLoading } = useAIContentCalendar();
  const updateStatus = useUpdateContentStatus();
  const deleteItem = useDeleteContentItem();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const filteredItems = linkId
    ? items?.filter((item) => item.affiliate_link_id === linkId)
    : items;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-success/10 text-success border-success/20";
      case "scheduled":
        return "bg-primary/10 text-primary border-primary/20";
      case "draft":
        return "bg-muted text-muted-foreground";
      case "cancelled":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted";
    }
  };

  const getPlatformIcon = (platform: string | null) => {
    switch (platform?.toLowerCase()) {
      case "instagram":
        return "📸";
      case "twitter":
        return "🐦";
      case "facebook":
        return "📘";
      case "linkedin":
        return "💼";
      case "email":
        return "📧";
      default:
        return "📝";
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Content Calendar
            </CardTitle>
            <CardDescription>Your AI-generated and scheduled content</CardDescription>
          </div>
          <Badge variant="outline">
            {filteredItems?.filter((i) => i.status === "scheduled").length || 0} scheduled
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!filteredItems?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No content scheduled yet.</p>
            <p className="text-sm">Enable auto-generation in AI settings to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getPlatformIcon(item.platform)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium truncate">{item.title}</h4>
                      <Badge className={getStatusColor(item.status)} variant="outline">
                        {item.status}
                      </Badge>
                      {item.ai_generated && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          <Sparkles className="h-3 w-3 mr-1" />
                          AI
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(item.scheduled_at)}
                      </span>
                      <span className="capitalize">{item.content_type}</span>
                    </div>

                    {expandedItem === item.id && item.content && (
                      <div className="mt-3 p-3 bg-muted rounded text-sm">
                        <p className="whitespace-pre-wrap">{item.content}</p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(item.content!)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Performance metrics for published content */}
                    {item.status === "published" && item.performance_metrics && (
                      <div className="flex gap-4 mt-3 text-sm">
                        <span className="text-muted-foreground">
                          👆 {item.performance_metrics.clicks || 0} clicks
                        </span>
                        <span className="text-success">
                          💰 ₦{(item.performance_metrics.revenue || 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpandedItem(expandedItem === item.id ? null : item.id)
                      }
                    >
                      {expandedItem === item.id ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                    </Button>
                    {item.status === "scheduled" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateStatus.mutate({ id: item.id, status: "published" })
                          }
                          disabled={updateStatus.isPending}
                        >
                          <CheckCircle className="h-4 w-4 text-success" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteItem.mutate(item.id)}
                          disabled={deleteItem.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
