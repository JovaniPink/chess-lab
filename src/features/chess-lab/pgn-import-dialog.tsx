"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, Upload, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { pgnImportSchema, type PgnImportValues } from "@/lib/chess";
import type { ParsedGame } from "@/types/chess";
import { parsePgn } from "@/lib/chess";

type PgnImportDialogProps = {
  open: boolean;
  defaultPgn: string;
  onClose: () => void;
  onLoad: (game: ParsedGame) => void;
};

export function PgnImportDialog({ open, defaultPgn, onClose, onLoad }: PgnImportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const form = useForm<PgnImportValues>({
    resolver: zodResolver(pgnImportSchema),
    defaultValues: { pgn: defaultPgn },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      form.reset({ pgn: defaultPgn });
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [defaultPgn, form, open]);

  function submit(values: PgnImportValues) {
    onLoad(parsePgn(values.pgn));
  }

  return (
    <dialog
      ref={dialogRef}
      className="import-dialog"
      aria-labelledby="pgn-dialog-title"
      aria-describedby="pgn-dialog-description"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <button type="button" className="modal-close" onClick={onClose} aria-label="Close PGN dialog">
        <X size={19} />
      </button>
      <div className="modal-icon">
        <Upload size={21} />
      </div>
      <p className="eyebrow">Bring another game</p>
      <h2 id="pgn-dialog-title">Load a PGN to replay</h2>
      <p id="pgn-dialog-description">
        Player names, result, and moves are validated before the game reaches the board. Imported
        games stay in this browser session and support replay and free exploration.
      </p>
      <form onSubmit={form.handleSubmit(submit)}>
        <label htmlFor="pgn-input">PGN notation</label>
        <textarea id="pgn-input" {...form.register("pgn")} rows={10} autoFocus />
        {form.formState.errors.pgn && (
          <p className="form-error" role="alert">
            <CircleAlert size={14} /> {form.formState.errors.pgn.message}
          </p>
        )}
        <div className="modal-actions">
          <Button tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" tone="primary">
            Validate &amp; load
          </Button>
        </div>
      </form>
    </dialog>
  );
}
