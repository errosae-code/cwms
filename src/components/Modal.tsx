"use client";

import { ReactNode, useRef } from "react";

export default function Modal({ trigger, title, children }: { trigger: string; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  return <>
    <button type="button" className="btn light" onClick={() => ref.current?.showModal()}>{trigger}</button>
    <dialog className="modal" ref={ref}>
      <div className="modalhead"><h3>{title}</h3><button type="button" className="iconbtn" onClick={() => ref.current?.close()} aria-label="Close">×</button></div>
      <div className="modalbody">{children}</div>
    </dialog>
  </>;
}
