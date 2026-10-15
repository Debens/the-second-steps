import {
  ArrowLeft,
  Ban,
  BriefcaseBusiness,
  Building2,
  GitBranch,
  Hash,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ReceiptText,
  Signature,
  Type,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ContactArchiveControl,
  ContactEditor,
} from "@/components/contacts/contact-record-actions";
import type { InitialContact } from "@/components/contacts/contact-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getWorkspaceAccessContext } from "@/core/access/application/access-context";
import { requireMfaUser } from "@/core/auth/mfa";
import { getContact } from "@/core/contacts/application/contacts";
import { getWorkspaceBranches } from "@/core/workspace/application/workspace-branches";
import { changeContactArchiveAction, updateContactAction } from "../actions";

function displayName(contact: {
  kind: string;
  title: string | null;
  firstName: string | null;
  lastName: string | null;
  legalName: string | null;
}) {
  return contact.kind === "PERSON"
    ? [contact.title, contact.firstName, contact.lastName]
        .filter(Boolean)
        .join(" ")
    : (contact.legalName ?? "Unnamed organisation");
}
function addressLabel(address: {
  addressLine1: string;
  addressLine2: string | null;
  locality: string | null;
  townCity: string;
  county: string | null;
  postcode: string;
}) {
  return [
    address.addressLine1,
    address.addressLine2,
    address.locality,
    address.townCity,
    address.county,
    address.postcode,
  ]
    .filter(Boolean)
    .join(", ");
}

export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string; contactId: string }>;
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { workspaceSlug, contactId } = await params;
  const listPath = `/dashboard/w/${workspaceSlug}/contacts`;
  const path = `${listPath}/${contactId}`;
  const user = await requireMfaUser(path, { workspaceSlug });
  const [contact, context, branches] = await Promise.all([
    getContact({ authSubject: user.id, workspaceSlug, contactId }),
    getWorkspaceAccessContext(user.id, workspaceSlug),
    getWorkspaceBranches(user.id, workspaceSlug),
  ]);
  if (!context || !branches) redirect("/access-denied");
  if (!contact) notFound();
  const kind = contact.kind === "PERSON" ? "person" : "organisation";
  const activeAddresses = contact.addresses;
  const addressByKind = (addressKind: string) =>
    activeAddresses.find(({ kind }) => kind === addressKind);
  const mapAddress = (address: (typeof activeAddresses)[number] | undefined) =>
    address
      ? {
          id: address.id,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2 ?? "",
          locality: address.locality ?? "",
          townCity: address.townCity,
          county: address.county ?? "",
          postcode: address.postcode,
        }
      : undefined;
  const initial: InitialContact = {
    title: contact.title ?? "",
    firstName: contact.firstName ?? "",
    middleNames: contact.middleNames ?? "",
    lastName: contact.lastName ?? "",
    preferredName: contact.preferredName ?? "",
    organisationType: contact.organisationType?.toLowerCase(),
    legalName: contact.legalName ?? "",
    tradingName: contact.tradingName ?? "",
    registrationNumber: contact.registrationNumber ?? "",
    vatNumber: contact.vatNumber ?? "",
    emails: contact.contactPoints
      .filter(({ kind: pointKind }) => pointKind === "EMAIL")
      .map((point) => ({
        id: point.id,
        label: point.label ?? "",
        value: point.value,
        isPreferred: point.isPreferred,
      })),
    telephones: contact.contactPoints
      .filter(({ kind: pointKind }) => pointKind === "TELEPHONE")
      .map((point) => ({
        id: point.id,
        label: point.label ?? "",
        value: point.value,
        isPreferred: point.isPreferred,
      })),
    individualAddress: mapAddress(addressByKind("INDIVIDUAL")),
    registeredAddress: mapAddress(addressByKind("REGISTERED")),
    correspondenceAddress: mapAddress(addressByKind("CORRESPONDENCE")),
    preferredCommunication:
      contact.preferredCommunicationChannel?.toLowerCase(),
    doNotEmail: contact.doNotEmail,
    doNotTelephone: contact.doNotTelephone,
    doNotSms: contact.doNotSms,
    doNotWhatsApp: contact.doNotWhatsApp,
    doNotPost: contact.doNotPost,
    branchId: contact.branchLinks.find(({ isPrimary }) => isPrimary)?.branchId,
  };
  const canEdit =
    context.permissions.has("contact.update") && contact.status === "ACTIVE";
  const canArchive =
    context.permissions.has("contact.archive") && contact.status !== "MERGED";
  const activeBranches = branches.filter(({ status }) => status === "ACTIVE");
  const preferredChannel =
    contact.preferredCommunicationChannel?.toLowerCase() ?? "No preference";
  const archiveFailed = (await searchParams).error === "archive";

  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        render={<Link href={listPath} />}
        nativeButton={false}
      >
        <ArrowLeft aria-hidden="true" />
        Back to contacts
      </Button>
      {archiveFailed && (
        <div
          className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive"
          role="alert"
        >
          The contact status could not be changed. Check your access and try
          again.
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {displayName(contact)}
            </h1>
            <Badge variant="secondary">
              {kind === "person" ? "Person" : "Organisation"}
            </Badge>
            {contact.status === "ARCHIVED" && (
              <StatusBadge label="Archived" tone="inactive" />
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {contact.reference}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <ContactEditor
              action={updateContactAction.bind(
                null,
                workspaceSlug,
                contactId,
                kind,
              )}
              branches={activeBranches}
              initial={initial}
              kind={kind}
              canManageIdentity={context.permissions.has(
                "contact.sensitive.manage",
              )}
            />
          )}
          {canArchive && (
            <ContactArchiveControl
              action={changeContactArchiveAction.bind(
                null,
                workspaceSlug,
                contactId,
                contact.status === "ARCHIVED",
              )}
              archived={contact.status === "ARCHIVED"}
            />
          )}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact methods</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {contact.contactPoints.length ? (
              contact.contactPoints.map((point) => (
                <div key={point.id} className="flex gap-3">
                  {point.kind === "EMAIL" ? (
                    <Mail
                      className="mt-0.5 size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  ) : (
                    <Phone
                      className="mt-0.5 size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                  <div>
                    <p className="text-sm font-medium">{point.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {point.label ??
                        (point.kind === "EMAIL" ? "Email" : "Telephone")}
                      {point.isPreferred ? " · Preferred" : ""}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No contact methods recorded.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Address details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {activeAddresses.length ? (
              activeAddresses.map((address) => (
                <div key={address.id} className="flex gap-3">
                  <MapPin
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {addressLabel(address)}
                    </p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {address.kind.toLowerCase()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No address recorded.
              </p>
            )}
          </CardContent>
        </Card>
        {kind === "person" && (
          <Card>
            <CardHeader>
              <CardTitle>Person details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Detail label="Title" value={contact.title} icon={Type} />
              <Detail
                label="First name"
                value={contact.firstName}
                icon={UserRound}
              />
              <Detail
                label="Middle names"
                value={contact.middleNames}
                icon={Signature}
              />
              <Detail
                label="Surname"
                value={contact.lastName}
                icon={Signature}
              />
            </CardContent>
          </Card>
        )}
        {kind === "organisation" && (
          <Card>
            <CardHeader>
              <CardTitle>Organisation details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Detail
                label="Trading name"
                value={contact.tradingName}
                icon={Building2}
              />
              <Detail
                label="Organisation type"
                value={contact.organisationType?.replaceAll("_", " ")}
                icon={BriefcaseBusiness}
              />
              <Detail
                label="Registration number"
                value={contact.registrationNumber}
                icon={Hash}
              />
              <Detail
                label="VAT number"
                value={contact.vatNumber}
                icon={ReceiptText}
              />
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Preferences and branch</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Detail
              label="Preferred contact"
              value={preferredChannel}
              icon={MessageCircle}
            />
            <Detail
              label="Responsible branch"
              value={
                contact.branchLinks.find(({ isPrimary }) => isPrimary)?.branch
                  .name
              }
              icon={GitBranch}
            />
            <Detail
              label="Do not use"
              value={
                [
                  contact.doNotEmail && "Email",
                  contact.doNotTelephone && "Telephone",
                  contact.doNotSms && "SMS",
                  contact.doNotWhatsApp && "WhatsApp",
                  contact.doNotPost && "Post",
                ]
                  .filter(Boolean)
                  .join(", ") || "None"
              }
              icon={Ban}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex gap-3">
      {Icon && (
        <Icon
          className="mt-0.5 size-4 text-muted-foreground"
          aria-hidden="true"
        />
      )}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-medium capitalize">
          {value || "Not recorded"}
        </p>
      </div>
    </div>
  );
}
