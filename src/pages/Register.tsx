import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRateLimit } from "@/hooks/useRateLimit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_NAME } from "@/lib/constants";
import { toast } from "sonner";
import { ArrowRight, Link2, Loader2, Store, UserPlus } from "lucide-react";




export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { recordAttempt, checkRateLimit, getTimeRemaining } = useRateLimit({
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    lockoutMs: 24 * 60 * 60 * 1000, // 24 hours
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check rate limit
    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      const hours = Math.ceil(getTimeRemaining() / (60 * 60 * 1000));
      toast.error(`Too many registration attempts. Please try again in ${hours} hour${hours > 1 ? 's' : ''}.`);
      return;
    }
    
    setIsLoading(true);

    const { data, error } = await signUp(email, password, fullName);

    if (error) {
      recordAttempt();
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    const hasSession = Boolean((data as { session?: unknown } | null)?.session);

    if (hasSession) {
      toast.success("Welcome to Mirvyn! Let's set up your account.");
      navigate("/dashboard");
      return;
    }

    toast.success("Account created. Sign in to continue.");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-hero px-4 py-8 sm:flex sm:items-center sm:py-12">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_440px] lg:items-center">
        <section className="hidden lg:block">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-gradient-primary"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">M</span>{PLATFORM_NAME}</Link>
          <p className="mt-10 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Start with your goal</p>
          <h1 className="mt-3 max-w-xl font-serif text-5xl font-bold leading-tight">One account. A clear path to your next win.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">Create your account, then choose whether you want to sell digital products or earn by promoting products you trust.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-primary/20 bg-card/70 p-4"><Store className="h-5 w-5 text-primary" /><p className="mt-3 font-semibold">Sell</p><p className="mt-1 text-sm leading-5 text-muted-foreground">Register free and build your product shelf.</p></div>
            <div className="rounded-2xl border border-accent/20 bg-card/70 p-4"><Link2 className="h-5 w-5 text-accent" /><p className="mt-3 font-semibold">Promote</p><p className="mt-1 text-sm leading-5 text-muted-foreground">Find products and earn from tracked links.</p></div>
          </div>
        </section>
        <Card className="w-full">
        <CardHeader className="text-center sm:text-left">
          <Link to="/" className="mb-3 inline-block lg:hidden"><span className="text-2xl font-bold text-gradient-primary">{PLATFORM_NAME}</span></Link>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>It takes about a minute. You choose your path next.</CardDescription>
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
                placeholder="mirvynsupport@gmail.com"
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

          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Create my account <ArrowRight className="ml-2 h-4 w-4" />
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
    </div>
  );
}
