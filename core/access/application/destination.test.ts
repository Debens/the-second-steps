import { describe, expect, it } from "vitest";
import { resolveAccessDestination } from "./destination";

const workspace = {
  id: "workspace-id",
  slug: "oakfield-lettings-demo",
  displayName: "Oakfield Lettings (Demo)",
  membershipId: "membership-id",
};

describe("post-login access routing", () => {
  it("sends a Platform Owner with no membership to the platform shell", () => {
    expect(
      resolveAccessDestination({ isPlatformOwner: true, workspaces: [] }),
    ).toEqual({ kind: "platform", href: "/platform" });
  });

  it("sends a single-workspace Account Owner to that workspace", () => {
    expect(
      resolveAccessDestination({
        isPlatformOwner: false,
        workspaces: [workspace],
      }),
    ).toEqual({
      kind: "workspace",
      href: "/dashboard/w/oakfield-lettings-demo",
    });
  });

  it("uses a chooser for dual platform and workspace access", () => {
    expect(
      resolveAccessDestination({
        isPlatformOwner: true,
        workspaces: [workspace],
      }),
    ).toEqual({ kind: "chooser" });
  });

  it("uses a chooser for several workspaces", () => {
    expect(
      resolveAccessDestination({
        isPlatformOwner: false,
        workspaces: [workspace, { ...workspace, id: "second", slug: "second" }],
      }),
    ).toEqual({ kind: "chooser" });
  });

  it("denies an identity with no platform role or membership", () => {
    expect(
      resolveAccessDestination({ isPlatformOwner: false, workspaces: [] }),
    ).toEqual({ kind: "no_access" });
  });
});
