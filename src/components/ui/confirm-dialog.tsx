"use client";
import { useCallback, useRef, useState } from "react";
import { buttonClass } from "./button";

type Options = { title: string; body?: string; confirmLabel: string; cancelLabel?: string };
type Pending = Options & { resolve: (ok: boolean) => void };

/**
 * Promise-based replacement for window.confirm(), in the brand's look.
 * Native <dialog>.showModal() gives focus trapping, Esc to close and inert background for free.
 *
 *   const [confirm, dialog] = useConfirm();
 *   if (await confirm({ title: "Cancelar este pedido?", confirmLabel: "Cancelar pedido" })) ...
 *   return <>{dialog}...</>
 */
export function useConfirm() {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback(
    (opts: Options) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...opts, resolve });
        requestAnimationFrame(() => ref.current?.showModal());
      }),
    [],
  );

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
    ref.current?.close();
  };

  const dialog = (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      aria-describedby={pending?.body ? "confirm-body" : undefined}
      onCancel={(e) => {
        e.preventDefault();
        close(false);
      }}
      onClick={(e) => e.target === ref.current && close(false)}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-3xl bg-fuligem p-0 text-osso shadow-2xl ring-1 ring-osso/15 backdrop:bg-carvao/75 backdrop:backdrop-blur-sm"
      data-testid="confirm-dialog"
    >
      {pending && (
        <div className="p-6 sm:p-7">
          <h2 id="confirm-title" className="display text-3xl">{pending.title}</h2>
          {pending.body && <p id="confirm-body" className="mt-3 text-sm text-fumaca">{pending.body}</p>}
          <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" autoFocus onClick={() => close(false)} className={buttonClass("outline", "md")}>
              {pending.cancelLabel ?? "Voltar"}
            </button>
            <button type="button" onClick={() => close(true)} className={buttonClass("primary", "md")}>
              {pending.confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );

  return [confirm, dialog] as const;
}
