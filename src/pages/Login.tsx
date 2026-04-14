import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRateLimit } from "@/hooks/useRateLimit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_NAME } from "@/lib/constants";
import { toast } from "sonner";
import { Loader2, LogIn, Timer } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { recordAttempt, checkRateLimit, isLocked, getTimeRemaining } = useRateLimit({
    maxAttempts: 5,
    windowMs: 60 * 1000, // 1 minute
    lockoutMs: 15 * 60 * 1000, // 15 minutes
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check rate limit before attempting
    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      const minutes = Math.ceil(getTimeRemaining() / 60000);
      toast.error(`Too many failed attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`);
      return;
    }
    
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      // Record failed attempt
      recordAttempt();
      
      // Provide more helpful error messages
      if (error.message.includes("Invalid login credentials")) {
        const remaining = checkRateLimit().remainingAttempts;
        toast.error(`Invalid email or password. ${remaining > 0 ? `${remaining} attempts remaining.` : ''}`);
      } else if (error.message.includes("Email not confirmed")) {
        toast.error("Please verify your email before signing in. Check your inbox.");
      } else {
        toast.error(error.message);
      }
      setIsLoading(false);
    } else {
      toast.success("Welcome back!");
      navigate("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="mb-4 inline-block">
            <span className="text-2xl font-bold text-gradient-primary">{PLATFORM_NAME}</span>
          </Link>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Sign In
            </Button>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary hover:underline">
                Create one
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
