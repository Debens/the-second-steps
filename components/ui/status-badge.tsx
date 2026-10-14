import { CircleCheck, CircleMinus, CircleX } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANTS = {
  active: "success",
  suspended: "warning",
  inactive: "secondary",
  closed: "secondary",
} as const;

export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: keyof typeof STATUS_VARIANTS;
}) {
  const Icon =
    tone === "active"
      ? CircleCheck
      : tone === "suspended"
        ? CircleMinus
        : CircleX;

  return (
    <Badge variant={STATUS_VARIANTS[tone]}>
      <Icon aria-hidden="true" data-icon="inline-start" />
      {label}
    </Badge>
  );
}
