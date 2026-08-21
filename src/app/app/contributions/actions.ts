"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const S = z.object({
  member_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  contribution_month: z.coerce.number().int().min(1).max(12),
  contribution_year: z.coerce.number().int().min(2000).max(2100),
  payment_date: z.string().min(1),
  reference: z.string().optional(),
});

async function context() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await s.from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile) throw new Error("Profile missing");
  return { s, user, profile };
}

function refresh(memberId?: string) {
  revalidatePath("/app/contributions");
  revalidatePath("/app/reports");
  revalidatePath("/app/member-statement");
  if (memberId) revalidatePath(`/app/members/${memberId}`);
  revalidatePath("/app");
}

export async function addContribution(fd: FormData) {
  const p = S.parse({ member_id: fd.get("member_id"), amount: fd.get("amount"), contribution_month: fd.get("contribution_month"), contribution_year: fd.get("contribution_year"), payment_date: fd.get("payment_date"), reference: fd.get("reference") || undefined });
  const { s, user, profile } = await context();
  const { data: item, error } = await s.from("contributions").insert({ organization_id: profile.organization_id, entered_by: user.id, ...p }).select("id").single();
  if (error) throw new Error(error.message);
  await s.from("audit_logs").insert({ organization_id: profile.organization_id, user_id: user.id, action: "contribution.created", module: "contributions", entity_id: item.id, description: `KES ${p.amount}; month ${p.contribution_month}/${p.contribution_year}` });
  refresh(p.member_id);
}

export async function updateContribution(fd: FormData) {
  const id = String(fd.get("id") || "");
  if (!id) throw new Error("Contribution missing");
  const p = S.parse({ member_id: fd.get("member_id"), amount: fd.get("amount"), contribution_month: fd.get("contribution_month"), contribution_year: fd.get("contribution_year"), payment_date: fd.get("payment_date"), reference: fd.get("reference") || undefined });
  const { s, user, profile } = await context();
  const { data: old } = await s.from("contributions").select("member_id").eq("id", id).eq("organization_id", profile.organization_id).single();
  const { error } = await s.from("contributions").update({ ...p }).eq("id", id).eq("organization_id", profile.organization_id).is("deleted_at", null);
  if (error) throw new Error(error.message);
  await s.from("audit_logs").insert({ organization_id: profile.organization_id, user_id: user.id, action: "contribution.updated", module: "contributions", entity_id: id, description: `Updated contribution to KES ${p.amount}; month ${p.contribution_month}/${p.contribution_year}` });
  refresh(p.member_id);
  if (old?.member_id && old.member_id !== p.member_id) refresh(old.member_id);
}

export async function deleteContribution(fd: FormData) {
  const id = String(fd.get("id") || "");
  if (!id) throw new Error("Contribution missing");
  const { s, user, profile } = await context();
  const { data: row } = await s.from("contributions").select("member_id,amount,contribution_month,contribution_year").eq("id", id).eq("organization_id", profile.organization_id).single();
  const { error } = await s.from("contributions").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("organization_id", profile.organization_id).is("deleted_at", null);
  if (error) throw new Error(error.message);
  await s.from("audit_logs").insert({ organization_id: profile.organization_id, user_id: user.id, action: "contribution.deleted", module: "contributions", entity_id: id, description: `Deleted contribution KES ${Number(row?.amount || 0)}; month ${row?.contribution_month}/${row?.contribution_year}` });
  refresh(row?.member_id);
}
