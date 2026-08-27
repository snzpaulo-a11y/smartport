import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type PageSkeletonVariant = "list" | "form" | "grid" | "details" | "dashboard" | "nav";

interface PageSkeletonProps {
  variant?: PageSkeletonVariant;
  count?: number;
  className?: string;
  inline?: boolean;
}

function Card({ className }: { className?: string }) {
  return (
    <div className={cn("glass-card rounded-2xl border border-border p-5", className)}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

function BackHeader({ showSub = true }: { showSub?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-6">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          {showSub && <Skeleton className="h-3 w-16" />}
        </div>
      </div>
      <Skeleton className="w-14 h-7 rounded-full" />
    </div>
  );
}

export function PageSkeleton({ variant = "details", count = 3, className, inline }: PageSkeletonProps) {
  if (variant === "grid") {
    return (
      <div className={cn("min-h-screen p-6", className)}>
        {!inline && <BackHeader showSub={false} />}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl border border-border p-5 space-y-3">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("min-h-screen p-6 pb-24", className)}>
        {!inline && <BackHeader />}
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, i) => (
            <Card key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className={cn("min-h-screen p-6", className)}>
        {!inline && <BackHeader />}
        <div className="glass-card rounded-2xl border border-border p-5 space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (variant === "dashboard") {
    return (
      <div className={cn("min-h-screen p-6", className)}>
        {!inline && (
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="w-24 h-9 rounded-xl" />
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-4 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, i) => (
            <Card key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "nav") {
    return (
      <div className={cn("min-h-screen p-6", className)}>
        {!inline && (
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="w-10 h-10 rounded-xl" />
          </div>
        )}
        <div className="flex flex-col gap-10">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="glass-card rounded-[2rem] border border-border p-8 space-y-4">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-10 w-24 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // default: details (ticket-style card)
  return (
    <div className={cn("min-h-screen p-6", className)}>
      {!inline && <BackHeader />}
      <div className="glass-card rounded-2xl overflow-hidden border border-border">
        <div className="bg-gradient-to-r from-primary/20 to-secondary/10 p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-5 w-12" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-12 w-full rounded-xl mt-4" />
    </div>
  );
}
