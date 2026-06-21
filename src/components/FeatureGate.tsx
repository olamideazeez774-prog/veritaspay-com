import { useFeatureFlag } from "@/hooks/useFeatureFlag";

interface FeatureGateProps {
  flag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** If true, render children while flags are loading instead of fallback. Default true. */
  optimisticWhileLoading?: boolean;
}

/**
 * Hides UI completely when a feature flag is OFF. Use this instead of just
 * blocking a route — when a flag is disabled, the corresponding UI should
 * cease to exist (no nav entry, no button, no card).
 */
export function FeatureGate({ flag, children, fallback = null, optimisticWhileLoading = true }: FeatureGateProps) {
  const { enabled, isLoading } = useFeatureFlag(flag);
  if (isLoading) return <>{optimisticWhileLoading ? children : fallback}</>;
  if (!enabled) return <>{fallback}</>;
  return <>{children}</>;
}

export default FeatureGate;