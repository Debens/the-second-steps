import { SettingsTabs } from "./settings-tabs";

export default async function WorkspaceSettingsLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}>) {
  const { workspaceSlug } = await params;

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Customer workspace</p>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Manage customer details, user access, and branches.
        </p>
      </div>

      <SettingsTabs workspaceSlug={workspaceSlug} />
      {children}
    </div>
  );
}
