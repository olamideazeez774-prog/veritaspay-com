import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_NAME } from "@/lib/constants";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { validateReferralCode, recordPlatformReferral } from "@/hooks/useReferrals";

const REF_STORAGE_KEY = "vp_referral_code";
const REF_ID_STORAGE_KEY = "vp_referrer_id";

// Referral code validation regex - alphanumeric only, 6-20 chars
const REFERRAL_CODE_REGEX = /^[A-Z0-9]{6,20}$/;

function validateReferralCodeFormat(code: string): boolean {
  return REFERRAL_CODE_REGEX.test(code);
}

function setRefCookie(code: string) {
  // Validate code before setting cookie
  if (!validateReferralCodeFormat(code)) {
    console.warn("Invalid referral code format rejected");
    return;
  }
  
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
  const secure = window.location.protocol === "https:" ? ";Secure" : "";
  document.cookie = `vp_ref=${encodeURIComponent(code)};expires=${expires};path=/;SameSite=Strict${secure}`;
}

function getRefCookie(): string {
  const match = document.cookie.match(/(?:^|;\s*)vp_ref=([^;]*)/);
  const value = match ? decodeURIComponent(match[1]) : "";
  // Validate on retrieval too
  return validateReferralCodeFormat(value) ? value : "";
}

function clearRefCookie() {
  document.cookie = "vp_ref=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Strict";
}

export default function Register() {
  const [searchParams] = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referrerId, setReferrerId] = useState<string | null>(null);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  // Persist ref param to localStorage + cookie immediately on page load
  const paramRef = searchParams.get("ref");
  const [referralCode, setReferralCode] = useState(() => {
    if (paramRef) {
      const upper = paramRef.toUpperCase();
      localStorage.setItem(REF_STORAGE_KEY, upper);
      setRefCookie(upper);
      return upper;
    }
    return localStorage.getItem(REF_STORAGE_KEY) || getRefCookie() || "";
  });

  // Validate referral code when it changes
  useEffect(() => {
    const checkCode = async () => {
      const trimmed = referralCode.trim();
      if (trimmed.length >= 6) {
        const result = await validateReferralCode(trimmed);
        setReferralValid(result.valid);
        setReferrerId(result.referrerId || null);
        if (result.valid && result.referrerId) {
          localStorage.setItem(REF_STORAGE_KEY, trimmed);
          localStorage.setItem(REF_ID_STORAGE_KEY, result.referrerId);
          setRefCookie(trimmed);
        }
      } else {
        setReferralValid(null);
        setReferrerId(null);
      }
    };

    const debounce = setTimeout(checkCode, 500);
    return () => clearTimeout(debounce);
  }, [referralCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error, data } = await signUp(email, password, fullName);

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    } else {
      // Record referral if valid
      const storedReferrerId = referrerId || localStorage.getItem(REF_ID_STORAGE_KEY);
      const storedCode = referralCode.trim().toUpperCase() || localStorage.getItem(REF_STORAGE_KEY) || getRefCookie() || "";
      
      if (storedReferrerId && data?.user?.id && storedReferrerId !== data.user.id) {
        await recordPlatformReferral(storedReferrerId, data.user.id, storedCode);
      }

      // Clean up storage
      localStorage.removeItem(REF_STORAGE_KEY);
      localStorage.removeItem(REF_ID_STORAGE_KEY);
      clearRefCookie();

      toast.success("Account created successfully! Please check your email to verify.");
      navigate("/login");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="mb-4 inline-block">
            <span className="text-2xl font-bold text-gradient-primary">{PLATFORM_NAME}</span>
          </Link>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Join as a vendor or affiliate</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referralCode">Referral Code (optional)</Label>
              <div className="relative">
                <Input
                  id="referralCode"
                  type="text"
                  placeholder="e.g., VP1A2B3C"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className={
                    referralValid === true
                      ? "border-success focus-visible:ring-success"
                      : referralValid === false
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }
                />
                {referralValid === true && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-success text-sm">
                    ✓ Valid
                  </span>
                )}
                {referralValid === false && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive text-sm">
                    Invalid
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a referral code if someone invited you
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Create Account
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
