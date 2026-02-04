import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Share2,
  Copy,
  MessageCircle,
  Send,
  Twitter,
  Mail,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShareMenuProps {
  url: string;
  title?: string;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  children?: React.ReactNode;
}

export function ShareMenu({
  url,
  title = "Check this out!",
  className,
  variant = "destructive",
  size = "sm",
  children,
}: ShareMenuProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "bg-green-500 hover:bg-green-600",
      onClick: () => {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
          "_blank"
        );
        setIsOpen(false);
      },
    },
    {
      name: "Telegram",
      icon: Send,
      color: "bg-blue-500 hover:bg-blue-600",
      onClick: () => {
        window.open(
          `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
          "_blank"
        );
        setIsOpen(false);
      },
    },
    {
      name: "Twitter/X",
      icon: Twitter,
      color: "bg-black hover:bg-gray-800",
      onClick: () => {
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
          "_blank"
        );
        setIsOpen(false);
      },
    },
    {
      name: "Email",
      icon: Mail,
      color: "bg-orange-500 hover:bg-orange-600",
      onClick: () => {
        window.open(
          `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
          "_blank"
        );
        setIsOpen(false);
      },
    },
  ];

  // Try native share first if available
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        });
        setIsOpen(false);
      } catch (err) {
        // User cancelled or share failed, fall back to menu
      }
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button
            variant={variant}
            size={size}
            className={cn("gap-2", className)}
            onClick={(e) => {
              // On mobile, try native share first
              if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
                e.preventDefault();
                handleNativeShare();
              }
            }}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <div className="grid gap-1">
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Share via
          </p>
          {shareOptions.map((option) => (
            <button
              key={option.name}
              onClick={option.onClick}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white transition-colors",
                option.color
              )}
            >
              <option.icon className="h-4 w-4" />
              {option.name}
            </button>
          ))}
          <div className="my-1 border-t" />
          <button
            onClick={handleCopy}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            {copied ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
