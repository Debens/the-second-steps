import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function WorkspaceSettingsPage() {
  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Workspace settings</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Workspace details
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Settings foundation</CardTitle>
          <CardDescription>
            Workspace settings are protected by membership and server-side
            permissions. MFA is staged behind a feature flag during development
            and is mandatory for release. Editing details and commercial
            settings will be added as separate, permission-checked actions.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
