"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { InviteMemberDialog } from "./InviteMemberDialog";

export function InviteMemberButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Invite Member
      </Button>
      <InviteMemberDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
