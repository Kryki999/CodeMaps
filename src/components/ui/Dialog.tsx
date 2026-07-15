"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Dialog({ open, onClose, title, children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="fixed inset-0 z-50 m-auto w-full max-w-md rounded-lg border border-slate-700 bg-[#16213e] p-0 text-slate-100 shadow-xl backdrop:bg-black/60"
    >
      <div className="border-b border-slate-700 px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="px-4 py-4">{children}</div>
    </dialog>
  );
}

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
}

export function NewProjectDialog({ open, onClose, onConfirm }: NewProjectDialogProps) {
  const [name, setName] = useState("Nowy projekt");

  useEffect(() => {
    if (open) setName("Nowy projekt");
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} title="Nowy projekt">
      <label className="block text-xs text-slate-400">Nazwa projektu</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-600 bg-[#1a1a2e] px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
        autoFocus
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Anuluj
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            if (name.trim()) onConfirm(name.trim());
          }}
        >
          Utwórz
        </Button>
      </div>
    </Dialog>
  );
}
