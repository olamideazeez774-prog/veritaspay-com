import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, Search, Download, FileText, Printer, Calendar, Filter,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSystemLogs, useDailySummary, EVENT_TYPE_LABELS, CATEGORY_LABELS, type LogFilters } from "@/hooks/useSystemLogs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatCurrency } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { exportLogsToCSV, exportLogsToPDF } from "@/lib/exportUtils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

const getCategoryColor = (category: string) => {
  switch (category) {
    case "user": return "bg-info/10 text-info border-info/20";
    case "product": return "bg-warning/10 text-warning border-warning/20";
    case "financial": return "bg-success/10 text-success border-success/20";
    default: return "bg-muted text-muted-foreground";
  }
};

const getEventIcon = (eventType: string) => {
  if (eventType.includes("registered") || eventType.includes("role")) return "👤";
  if (eventType.includes("product")) return "📦";
  if (eventType.includes("sale") || eventType.includes("commission") || eventType.includes("earning")) return "💰";
  if (eventType.includes("payout") || eventType.includes("withdrawal")) return "🏦";
  if (eventType.includes("payment")) return "💳";
  if (eventType.includes("refund") || eventType.includes("reversed")) return "↩️";
  return "📋";
};

export default function AdminLogbook() {
  const [tab, setTab] = useState("logs");
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [filters, setFilters] = useState<LogFilters>({
    dateFrom: subDays(new Date(), 6),
    dateTo: new Date(),
    category: "all",
    eventType: "all",
    search: "",
  });

  const { data: logs, isLoading } = useSystemLogs(filters);
  const { data: dailySummary } = useDailySummary(selectedDay);

  const dailyLogs = logs?.filter(l => {
    const logDate = new Date(l.created_at);
    return logDate >= startOfDay(selectedDay) && logDate <= endOfDay(selectedDay);
  }) || [];

  const handleExportCSV = () => {
    if (tab === "daily") {
      exportLogsToCSV(dailyLogs, `logbook-${format(selectedDay, "yyyy-MM-dd")}`);
    } else {
      exportLogsToCSV(logs || [], `logbook-${format(filters.dateFrom, "yyyy-MM-dd")}-to-${format(filters.dateTo, "yyyy-MM-dd")}`);
    }
  };

  const handleExportPDF = () => {
    const targetLogs = tab === "daily" ? dailyLogs : (logs || []);
    const title = tab === "daily"
      ? `Daily Report - ${format(selectedDay, "MMMM dd, yyyy")}`
      : `System Logbook - ${format(filters.dateFrom, "MMM dd")} to ${format(filters.dateTo, "MMM dd, yyyy")}`;

    const summary = tab === "daily" && dailySummary ? {
      "Total Events": dailySummary.totalEvents.toString(),
      "Sales": dailySummary.totalSales.toString(),
      "Revenue": formatCurrency(dailySummary.totalRevenue),
      "Commissions": formatCurrency(dailySummary.totalCommissions),
      "Payouts": formatCurrency(dailySummary.totalPayouts),
    } : undefined;

    exportLogsToPDF(targetLogs, title, summary);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">System Logbook</h1>
            <p className="text-muted-foreground text-sm">Comprehensive activity ledger</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Printer className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Print/PDF</span>
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="logs" className="flex-1 sm:flex-none">All Logs</TabsTrigger>
            <TabsTrigger value="daily" className="flex-1 sm:flex-none">Daily Report</TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
              <Select value={filters.category || "all"} onValueChange={(v) => setFilters(f => ({ ...f, category: v }))}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-1" />
                    {format(filters.dateFrom, "MMM dd")} - {format(filters.dateTo, "MMM dd")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4 space-y-3" align="start">
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { label: "Today", days: 0 },
                      { label: "7d", days: 6 },
                      { label: "30d", days: 29 },
                    ].map(p => (
                      <Button key={p.label} size="sm" variant="outline" onClick={() =>
                        setFilters(f => ({ ...f, dateFrom: subDays(new Date(), p.days), dateTo: new Date() }))
                      }>
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Log Entries */}
            {isLoading ? (
              <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
            ) : !logs?.length ? (
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 font-semibold">No log entries found</h3>
                <p className="text-sm text-muted-foreground">Try adjusting your filters.</p>
              </div>
            ) : (
              <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-2">
                <p className="text-sm text-muted-foreground">{logs.length} entries</p>
                {logs.map((log) => (
                  <motion.div key={log.id} variants={staggerItem} className="glass-card p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="text-lg shrink-0">{getEventIcon(log.event_type)}</span>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={getCategoryColor(log.category)}>
                            {CATEGORY_LABELS[log.category] || log.category}
                          </Badge>
                          <span className="text-xs font-medium">
                            {EVENT_TYPE_LABELS[log.event_type] || log.event_type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-sm text-foreground truncate">{log.description}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>{formatDateTime(log.created_at)}</span>
                          {log.actor_email && <span>by {log.actor_email}</span>}
                          {log.amount != null && <span className="font-medium text-foreground">{formatCurrency(log.amount)}</span>}
                          {log.status && <Badge variant="outline" className="text-xs py-0 h-5">{log.status}</Badge>}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="daily" className="space-y-4 mt-4">
            {/* Day Picker */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    {format(selectedDay, "MMMM dd, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker mode="single" selected={selectedDay} onSelect={(d) => d && setSelectedDay(d)} />
                </PopoverContent>
              </Popover>
            </div>

            {/* Daily Summary */}
            {dailySummary && (
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
                {[
                  ["Events", dailySummary.totalEvents.toString()],
                  ["Sales", dailySummary.totalSales.toString()],
                  ["Revenue", formatCurrency(dailySummary.totalRevenue)],
                  ["Commissions", formatCurrency(dailySummary.totalCommissions)],
                  ["Payouts", formatCurrency(dailySummary.totalPayouts)],
                ].map(([label, value]) => (
                  <div key={label} className="glass-card p-3 text-center">
                    <p className="text-lg sm:text-xl font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Daily Log List */}
            {dailyLogs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No events recorded on this day.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{dailyLogs.length} events on {format(selectedDay, "MMM dd, yyyy")}</p>
                {dailyLogs.map((log) => (
                  <div key={log.id} className="glass-card p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="text-lg shrink-0">{getEventIcon(log.event_type)}</span>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={getCategoryColor(log.category)}>
                            {CATEGORY_LABELS[log.category] || log.category}
                          </Badge>
                          <span className="text-xs font-medium">
                            {EVENT_TYPE_LABELS[log.event_type] || log.event_type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{log.description}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>{formatDateTime(log.created_at)}</span>
                          {log.actor_email && <span>by {log.actor_email}</span>}
                          {log.amount != null && <span className="font-medium text-foreground">{formatCurrency(log.amount)}</span>}
                          {log.status && <Badge variant="outline" className="text-xs py-0 h-5">{log.status}</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
