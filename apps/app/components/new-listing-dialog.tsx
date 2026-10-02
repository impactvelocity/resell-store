"use client";

import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/dialog";
import { PlusIcon } from "@repo/ui/icons";
import { TextField } from "@repo/ui/text-field";
import { useToast } from "@repo/ui/toast";

export function NewListingDialog() {
  const toast = useToast();

  return (
    <Dialog>
      <DialogTrigger render={<Button size="md" />}>
        <PlusIcon size={18} />
        Add a thing
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Add a thing</DialogTitle>
        <DialogDescription>
          Give it a name. Your agent will handle the rest.
        </DialogDescription>
        <div className="mt-6 flex flex-col gap-4">
          <TextField label="What is it?" placeholder="Linen wrap dress" />
          <TextField label="Your price" placeholder="$24" hint="Fair price" />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <DialogClose render={<Button variant="ghost" size="md" />}>
            Maybe later
          </DialogClose>
          <DialogClose
            render={<Button size="md" />}
            onClick={() => toast.add({ title: "Added. Your agent is on it." })}
          >
            Add it
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
