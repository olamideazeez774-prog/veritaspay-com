import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScarcityTimerProps {
  endDate: string;
  label?: string;
  className?: string;
}

export function ScarcityTimer({ endDate, label = "Offer ends in", className }: ScarcityTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const tick = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) {
        setExpired(true);
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (expired) return null;

  return (
    <div className={cn("flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2", className)}>
      <Clock className="h-4 w-4 text-destructive shrink-0" />
      <span className="text-xs font-medium text-destructive">{label}:</span>
      <div className="flex gap-1 text-xs font-mono font-bold text-destructive">
        {timeLeft.days > 0 && <span>{timeLeft.days}d</span>}
        <span>{String(timeLeft.hours).padStart(2, "0")}h</span>
        <span>{String(timeLeft.minutes).padStart(2, "0")}m</span>
        <span>{String(timeLeft.seconds).padStart(2, "0")}s</span>
      </div>
    </div>
  );
}
