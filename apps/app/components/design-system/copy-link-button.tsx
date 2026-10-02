"use client";

import { Button } from "@repo/ui/button";
import { ShareIcon } from "@repo/ui/icons";
import { useToast } from "@repo/ui/toast";

export function CopyLinkButton() {
  const toast = useToast();

  return (
    <Button
      variant="soft"
      size="md"
      onClick={() => toast.add({ title: "Link copied. Go show it off." })}
    >
      <ShareIcon size={18} />
      Try the toast
    </Button>
  );
}
