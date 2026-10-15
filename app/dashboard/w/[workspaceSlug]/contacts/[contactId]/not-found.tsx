import { ContactRound } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ContactNotFound() {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent className="grid justify-items-center gap-4 py-12 text-center">
        <ContactRound
          className="size-8 text-muted-foreground"
          aria-hidden="true"
        />
        <div>
          <h1 className="text-lg font-semibold">Contact not found</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This record may not exist or may be outside your branch access.
          </p>
        </div>
        <Button render={<Link href="../" />} nativeButton={false}>
          Back to contacts
        </Button>
      </CardContent>
    </Card>
  );
}
