"use client";

export default function ConfirmSubmitButton({ label = "Delete", message = "Are you sure?" }: { label?: string; message?: string }) {
  return <button className="btn danger" type="submit" onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>{label}</button>;
}
