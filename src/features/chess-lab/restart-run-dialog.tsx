"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

type RestartRunDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function RestartRunDialog({ open, onCancel, onConfirm }: RestartRunDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>("button")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
      opener.current?.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="import-dialog"
      aria-labelledby="restart-run-title"
      aria-describedby="restart-run-description"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id="restart-run-title">Start a new practice run?</h2>
      <p id="restart-run-description">
        Your current run has answers, hints, or a recap. Starting a new run replaces them in this
        tab. Keep the current run to continue where you left off.
      </p>
      <div className="modal-actions">
        <Button tone="secondary" onClick={onCancel}>
          Keep current run
        </Button>
        <Button tone="primary" onClick={onConfirm}>
          Start new run
        </Button>
      </div>
    </dialog>
  );
}
