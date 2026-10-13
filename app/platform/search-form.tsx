import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PlatformSearchForm({
  action,
  defaultValue,
  label,
  placeholder,
}: {
  action: string;
  defaultValue: string;
  label: string;
  placeholder: string;
}) {
  return (
    <form
      action={action}
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
    >
      <div className="grid min-w-0 flex-1 gap-1.5">
        <Label htmlFor="platform-search">{label}</Label>
        <Input
          id="platform-search"
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
          maxLength={100}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit">Search</Button>
        {defaultValue && (
          <Button
            render={<Link href={action} />}
            nativeButton={false}
            variant="outline"
          >
            Clear
          </Button>
        )}
      </div>
    </form>
  );
}
