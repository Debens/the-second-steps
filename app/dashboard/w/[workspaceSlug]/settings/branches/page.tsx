import { Building2 } from "lucide-react";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireMfaUser } from "@/core/auth/mfa";
import { getWorkspaceBranches } from "@/core/workspace/application/workspace-branches";

function valueOrFallback(value: string | null) {
  return value || <span className="text-muted-foreground">Not recorded</span>;
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">
        {valueOrFallback(value)}
      </dd>
    </div>
  );
}

export default async function WorkspaceBranchesPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const path = `/dashboard/w/${workspaceSlug}/settings/branches`;
  const user = await requireMfaUser(path, { workspaceSlug });
  const branches = await getWorkspaceBranches(user.id, workspaceSlug);
  if (!branches) redirect("/access-denied");

  if (branches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Building2 aria-hidden="true" className="size-5 text-primary" />
          <CardTitle>No branches</CardTitle>
          <CardDescription>
            There are no branch records available to you yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {branches.map((branch) => {
        const address = [
          branch.address1,
          branch.address2,
          branch.townCity,
          branch.county,
          branch.postcode,
        ]
          .filter(Boolean)
          .join(", ");

        return (
          <Card key={branch.id}>
            <CardHeader>
              <CardTitle>
                <h3>{branch.name}</h3>
              </CardTitle>
              <CardDescription>
                {branch.status === "ACTIVE"
                  ? "Active branch"
                  : "Inactive branch"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-5 sm:grid-cols-2">
                <Detail label="Email" value={branch.email} />
                <Detail label="Telephone" value={branch.telephone} />
                <div className="sm:col-span-2">
                  <Detail label="Address" value={address || null} />
                </div>
              </dl>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
