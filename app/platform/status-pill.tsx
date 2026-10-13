import { CircleCheck, CircleMinus, CircleX } from "lucide-react";

const STYLES = {
  active: "bg-success-soft text-success-soft-foreground",
  suspended: "bg-warning-soft text-warning-soft-foreground",
  inactive: "bg-muted text-muted-foreground",
  closed: "bg-muted text-muted-foreground",
} as const;

export function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: keyof typeof STYLES;
}) {
  const Icon =
    tone === "active"
      ? CircleCheck
      : tone === "suspended"
        ? CircleMinus
        : CircleX;

  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${STYLES[tone]}`}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}
