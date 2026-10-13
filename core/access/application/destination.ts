import type { AccessDestinations } from "./access-context";

export type AccessDestination =
  | { kind: "platform"; href: "/platform" }
  | { kind: "workspace"; href: string }
  | { kind: "chooser" }
  | { kind: "no_access" };

export function resolveAccessDestination(
  access: AccessDestinations,
): AccessDestination {
  const workspaceCount = access.workspaces.length;

  if (access.isPlatformOwner && workspaceCount > 0) return { kind: "chooser" };
  if (access.isPlatformOwner) return { kind: "platform", href: "/platform" };
  if (workspaceCount > 1) return { kind: "chooser" };
  if (workspaceCount === 1) {
    return {
      kind: "workspace",
      href: `/dashboard/w/${access.workspaces[0].slug}`,
    };
  }

  return { kind: "no_access" };
}
