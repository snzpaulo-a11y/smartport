import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md border border-black/20 dark:border-white/20",
        "bg-[linear-gradient(110deg,rgba(140,150,165,0.45)_30%,rgba(205,215,230,0.65)_50%,rgba(140,150,165,0.45)_70%)] bg-[length:200%_100%]",
        "animate-shimmer",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
