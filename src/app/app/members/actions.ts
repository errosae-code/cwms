"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getContext() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) redirect("/app/members?error=administrator-profile-not-found");
  return { supabase, user, profile };
}

export async function addMember(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const nationalId = String(formData.get("national_id") ?? "").trim();
  const enteredDate = String(formData.get("date_joined") ?? "").trim();
  const dateJoined = enteredDate || new Date().toISOString().slice(0, 10);
  const registrationPaid = Number(String(formData.get("registration_paid") ?? "0"));

  if (fullName.length < 2 || !Number.isFinite(registrationPaid) || registrationPaid < 0) {
    redirect("/app/members?error=invalid-member-details");
  }

  const { supabase, user, profile } = await getContext();
  const { data: member, error } = await supabase
    .from("members")
    .insert({
      organization_id: profile.organization_id,
      full_name: fullName,
      phone: phone || null,
      national_id: nationalId || null,
      date_joined: dateJoined,
      registration_paid: registrationPaid,
    })
    .select("id, membership_no")
    .single();

  if (error || !member) redirect(`/app/members?error=${encodeURIComponent(error?.message || "member-save-failed")}`);

  await supabase.from("audit_logs").insert({
    organization_id: profile.organization_id,
    user_id: user.id,
    action: "member.created",
    module: "members",
    entity_id: member.id,
    description: `Created ${member.membership_no}`,
  });

  revalidatePath("/app/members");
  revalidatePath("/app");
  redirect(`/app/members/${member.id}?saved=1`);
}

export async function updateMember(formData: FormData) {
  const memberId = String(formData.get("member_id") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const nationalId = String(formData.get("national_id") ?? "").trim();
  const dateJoined = String(formData.get("date_joined") ?? "").trim();
  const registrationPaid = Number(String(formData.get("registration_paid") ?? "0"));

  if (!memberId || fullName.length < 2 || !dateJoined || !Number.isFinite(registrationPaid) || registrationPaid < 0) {
    redirect(`/app/members/${memberId}?error=invalid-member-details`);
  }

  const { supabase, user, profile } = await getContext();
  const { data: member, error } = await supabase
    .from("members")
    .update({
      full_name: fullName,
      phone: phone || null,
      national_id: nationalId || null,
      date_joined: dateJoined,
      registration_paid: registrationPaid,
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberId)
    .eq("organization_id", profile.organization_id)
    .select("membership_no")
    .single();

  if (error || !member) redirect(`/app/members/${memberId}?error=${encodeURIComponent(error?.message || "member-update-failed")}`);

  await supabase.from("audit_logs").insert({
    organization_id: profile.organization_id,
    user_id: user.id,
    action: "member.updated",
    module: "members",
    entity_id: memberId,
    description: `Updated ${member.membership_no}`,
  });

  revalidatePath("/app/members");
  revalidatePath(`/app/members/${memberId}`);
  redirect(`/app/members/${memberId}?saved=1`);
}

export async function changeMemberStatus(formData: FormData) {
  const memberId = String(formData.get("member_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!memberId || !["active", "inactive", "withdrawn"].includes(status)) {
    redirect("/app/members?error=invalid-member-status");
  }

  const { supabase, user, profile } = await getContext();
  const { data: member, error } = await supabase
    .from("members")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("organization_id", profile.organization_id)
    .select("membership_no")
    .single();

  if (error || !member) redirect(`/app/members/${memberId}?error=${encodeURIComponent(error?.message || "status-change-failed")}`);

  await supabase.from("audit_logs").insert({
    organization_id: profile.organization_id,
    user_id: user.id,
    action: `member.${status}`,
    module: "members",
    entity_id: memberId,
    description: `${member.membership_no} status changed to ${status}`,
  });

  revalidatePath("/app/members");
  revalidatePath(`/app/members/${memberId}`);
  revalidatePath("/app");
  redirect(`/app/members/${memberId}?saved=1`);
}


export async function deleteMember(formData: FormData) {
  const memberId = String(formData.get("member_id") ?? "");
  if (!memberId) redirect("/app/members?error=member-not-found");
  const { supabase, user, profile } = await getContext();
  const [c,l,w] = await Promise.all([
    supabase.from("contributions").select("id", { count: "exact", head: true }).eq("member_id", memberId).is("deleted_at", null),
    supabase.from("loans").select("id", { count: "exact", head: true }).eq("member_id", memberId).is("deleted_at", null),
    supabase.from("welfare_entries").select("id", { count: "exact", head: true }).eq("member_id", memberId).is("deleted_at", null),
  ]);
  if ((c.count || 0) + (l.count || 0) + (w.count || 0) > 0) {
    redirect("/app/members?error=" + encodeURIComponent("Member has financial history and cannot be deleted. Use Inactive or Withdrawn instead."));
  }
  const { data: member, error } = await supabase.from("members").update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", memberId).eq("organization_id", profile.organization_id).select("membership_no").single();
  if (error || !member) redirect("/app/members?error=" + encodeURIComponent(error?.message || "member-delete-failed"));
  await supabase.from("audit_logs").insert({ organization_id: profile.organization_id, user_id: user.id, action: "member.deleted", module: "members", entity_id: memberId, description: `Deleted ${member.membership_no}` });
  revalidatePath("/app/members"); revalidatePath("/app");
  redirect("/app/members");
}
