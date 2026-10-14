import { Building2 } from "lucide-react";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BranchUserList } from "@/components/workspace/branch-user-list";
import { requireMfaUser } from "@/core/auth/mfa";
import { listCustomerBranches } from "@/core/platform/application/platform-directory";
import { StatusPill } from "../../../status-pill";

function addressFor(branch: {
  address1: string | null;
  address2: string | null;
  townCity: string | null;
  county: string | null;
  postcode: string | null;
}) {
  return [
    branch.address1,
    branch.address2,
    branch.townCity,
    branch.county,
    branch.postcode,
  ]
    .filter(Boolean)
    .join(", ");
}

export default async function CustomerBranchesPage({
  params,
}: {
  params: Promise<{ customerSlug: string }>;
}) {
  const { customerSlug } = await params;
  const path = `/platform/customers/${customerSlug}/branches`;
  const user = await requireMfaUser(path);
  const branches = await listCustomerBranches(user.id, customerSlug);
  if (!branches) notFound();

  if (branches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Building2 aria-hidden="true" className="size-5 text-primary" />
          <CardTitle>No branches</CardTitle>
          <CardDescription>
            This customer does not have any branch records yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:hidden">
        {branches.map((branch) => (
          <Card key={branch.id}>
            <CardHeader>
              <CardTitle>{branch.name}</CardTitle>
              <CardDescription>
                {addressFor(branch) || "Address not recorded"}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <StatusPill
                label={branch.status === "ACTIVE" ? "Active" : "Inactive"}
                tone={branch.status === "ACTIVE" ? "active" : "inactive"}
              />
              <div className="text-sm">
                <p>{branch.email ?? "Email not recorded"}</p>
                <p>{branch.telephone ?? "Telephone not recorded"}</p>
              </div>
              <BranchUserList users={branch.users} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden md:block">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telephone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Users with access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">{branch.name}</TableCell>
                  <TableCell>
                    <StatusPill
                      label={branch.status === "ACTIVE" ? "Active" : "Inactive"}
                      tone={branch.status === "ACTIVE" ? "active" : "inactive"}
                    />
                  </TableCell>
                  <TableCell>{branch.email ?? "Not recorded"}</TableCell>
                  <TableCell>{branch.telephone ?? "Not recorded"}</TableCell>
                  <TableCell>{addressFor(branch) || "Not recorded"}</TableCell>
                  <TableCell className="min-w-64">
                    <BranchUserList users={branch.users} divided={false} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
