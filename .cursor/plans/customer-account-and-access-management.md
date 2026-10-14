# Customer account and access management

**Status:** Confirmed product outcome and delivery sequence. The consolidated Settings structure, separate customer/contact card editing, customer user lists, read-only branch details, Platform customer Users tab, and branch-associated user views are implemented and verified against shared Supabase. The user list shows branch-scoped names/emails and uses a role-edit modal with a multi-select dropdown. The read-only Platform Owner branch-assignment policy migration was applied and verified on shared Supabase on 2026-10-14. Branch scope editing and invitations remain to be built. A reversible shared-sandbox customer-detail save remains approval-gated.

## Outcome

Give Zayto Platform Owners and authorised customer staff clear, audited administration without granting either group inappropriate access:

- Platform Owners can maintain customer-account metadata and see the users, roles, and branch scope associated with a customer.
- Customer Account Owners and Agency Admins can maintain permitted workspace details and manage their own staff access.
- Users can be invited, assigned fixed roles, and given either whole-workspace or explicit named-branch access.
- Branch views show both workspace-wide users and users assigned specifically to that branch.

This work is account and access administration, not CRM people/contact records.

## Existing foundation

- `Workspace.type` already distinguishes `AGENCY` (Letting agency) from `LANDLORD` (Independent landlord), and Platform customer screens already display it.
- `/dashboard/w/[workspaceSlug]` is the protected customer shell. Its People & roles screen can read memberships and edit roles, but currently hides names/emails and cannot edit branch scope or add users.
- `Membership`, `MembershipRole`, and `MembershipBranchAccess` already model one user's access to one customer and either the whole workspace or a non-empty set of named branches.
- The Platform customer profile has Overview, Branches, and Feature flags tabs, but no customer-centric Users tab.
- Company/contact fields exist on `Workspace` and are currently read-only. No new customer-detail columns are needed for the first editing slice.

## Boundaries

- Customer type describes the operating customer: letting agency or independent landlord. It does not say whether the legal owner is a company or an individual.
- For that reason, use **Customer details** as the general heading. Agency workspaces may show trading/legal/company information; company fields remain optional for an individual landlord workspace.
- Workspace slug, internal IDs, creation date, status, type, feature flags, and future commercial settings are not ordinary customer-editable profile fields.
- Platform access never grants standing access to customer CRM records. Customer administration remains limited to workspace, branch, membership, and access metadata.
- Applicants, tenants, guarantors, and landlords invited to see managed-property information are participants, not staff memberships, and are outside this plan.

## Recommended authority

| Action                                    | Platform Owner                    | Account Owner | Agency Admin | Other customer roles  |
| ----------------------------------------- | --------------------------------- | ------------- | ------------ | --------------------- |
| Edit trading/customer and contact details | Yes                               | Yes           | Yes          | No                    |
| Change customer type or lifecycle status  | Yes, controlled                   | No            | No           | No                    |
| View customer users and branch scope      | Yes                               | Yes           | Yes          | Existing scoped rules |
| Invite ordinary staff                     | Optional onboarding/support path  | Yes           | Yes          | No                    |
| Grant or remove Account Owner             | Existing owner protection applies | Yes           | No           | No                    |
| Change ordinary roles and branch scope    | Optional onboarding/support path  | Yes           | Yes          | No                    |

Every mutation re-verifies the actor on the server, scopes by the verified workspace, validates the complete resulting role/scope combination, and writes an audit event. Existing protections against self-role changes and removal of the final active Account Owner remain.

## Screens

### Platform customer profile

- **Overview:** read-only by default with Edit, Save, and Cancel for permitted customer/contact fields, matching the user-name interaction.
- **Users:** name, sign-in email, membership status, roles, access scope, and named branches. This is the reverse customer view of the existing Platform user directory.
- **Branches:** branch details plus assigned users. Workspace-wide users appear on each branch with an **All branches** label.
- **Feature flags:** unchanged.

### Customer shell

- The main customer navigation has one **Settings** entry rather than separate administration links in the sidebar.
- Settings uses secondary navigation for **Details**, **Users & access**, and **Branches**.
- **Details:** the permitted customer/contact fields, checked with `workspace.update`.
- **Users & access:** real names and email addresses, membership status, roles, whole-workspace/named-branch scope, and branch names rather than anonymous member numbers.
- **Branches:** branch details and the users who have whole-workspace or explicit access to each branch.
- **Branch access editor:** choose whole workspace or one or more active branches. Named-branch access can never be empty.
- **Invite user:** email, initial roles, and initial scope in one reviewed submission. Do not create a half-configured membership and repair it later.

Branch Managers and Read Only users retain the already-approved visibility rules. UI hiding does not replace server authorisation.

## Adding and associating users

Use an invitation rather than silently attaching an email address to a customer:

1. An authorised actor enters the email, initial roles, and branch scope.
2. Zayto creates a purpose-bound, expiring, single-use, revocable invitation with a hashed token and safe audit metadata.
3. The recipient signs in or creates their Supabase identity through the invite flow.
4. Claiming the invitation links an existing identity or creates one identity, then creates the membership, roles, and branch grants in one transaction.
5. The UI does not disclose whether the email already has a Zayto account.

Local Mailpit may support fictional development invites. Production invitations remain blocked until an approved email provider, rate limits, expiry/resend/revocation rules, and support/recovery behaviour exist. Public sign-up stays disabled.

## Delivery sequence

1. **Settings structure and customer detail editing — implemented locally:** customer administration is consolidated behind one sidebar Settings entry with Details, Users & access, and Branches secondary navigation. Shared validation and audited application services support read/Edit/Save/Cancel in the Platform profile and customer Settings > Details. Type, status, slug, and commercial controls remain separate.
2. **Customer-centric access views — implemented locally:** Settings > Users & access and the Platform customer Users tab show names, emails, roles, status, and branch scope. Customer and Platform branch views show workspace-wide and specifically assigned users. Customer visibility remains limited by the actor's branch scope and `membership.read` permission. The identity-directory and Platform branch-assignment policies and queries are verified against cross-workspace, cross-branch, and role denial. The new read-only Platform Owner policy migration still requires separate approval before shared Supabase application.
3. **Role and branch-scope editing:** update roles and scope atomically, preserve final-owner and self-change protections, reject inactive/cross-workspace branches, and audit old/new assignments.
4. **Invitation foundation:** after separate schema and shared-migration approval, add invitation issue, resend, revoke, expire, and claim flows with transactional membership creation.
5. **Lifecycle controls later:** user/customer suspension, reactivation, notifications, and readable audit history remain in the platform user-management roadmap and should not be smuggled into the first editing slice.

Each slice requires unit tests, disposable-database RLS/invariant tests, responsive light/dark browser coverage, `npm run check`, and `npm run build`. Shared migrations and real shared-sandbox mutations remain separate approval gates.

## Decisions before implementation

1. **Recommended:** customer type is visible but not a routine edit field. A Platform Owner may correct it only through a controlled action; once dependent records exist, changing type becomes a migration/conversion rather than a dropdown save.
2. **Recommended:** both Platform Owners and customer Account Owners/Agency Admins may edit ordinary customer/contact details; only Platform Owners control type, status, feature flags, and future commercial settings.
3. **Unresolved:** `agency_admin`, `branch_manager`, and `negotiator` are agency-specific labels. Decide whether landlord workspaces hide those roles and branches, or whether the fixed role vocabulary should become more neutral before landlord self-service is built.
4. **Recommended:** all new customer-user associations use invitations, including an email that already belongs to a Zayto identity. Do not provide an account-enumerating user search or silently add someone without acceptance.

## Main risks

- Treating customer type as legal entity type would model individual landlords incorrectly.
- Directly adding users by email would bypass acceptance, leak account existence, and complicate recovery and audit.
- Updating roles separately from branch scope could temporarily grant too much access; save them transactionally.
- The global identity table needs narrowly scoped co-member visibility. A broad identity-directory RLS policy would leak users across customers.
- Platform support actions must remain customer-account administration, not an undocumented route into CRM data.
