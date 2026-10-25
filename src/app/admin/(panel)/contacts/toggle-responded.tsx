"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ToggleResponded({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const next = status === "new" ? "responded" : "new";

  const toggle = async () => {
    setSaving(true);
    const res = await fetch(`/api/admin/contact-submissions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Couldn't update the request");
      return;
    }
    router.refresh();
  };

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={saving}
      onClick={toggle}
      className="whitespace-nowrap"
    >
      Mark {next}
    </Button>
  );
}
