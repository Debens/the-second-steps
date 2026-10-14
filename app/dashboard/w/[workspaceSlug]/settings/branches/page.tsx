import { Building2 } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function WorkspaceBranchesPage() {
  return (
    <Card>
      <CardHeader>
        <Building2 aria-hidden="true" className="size-5 text-primary" />
        <CardTitle>Branches</CardTitle>
        <CardDescription>
          Branch details and associated users will be managed here in the next
          access-management section.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
