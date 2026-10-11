import { cn } from "@/lib/utils";

export function ZaytoWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xl font-semibold tracking-tight",
        className,
      )}
    >
      <span aria-hidden="true" className="size-2.5 rounded-sm bg-highlight" />
      Zayto
    </span>
  );
}
