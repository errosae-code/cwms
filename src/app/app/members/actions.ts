"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function addMember(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const nationalId = String(formData.get("national_id") ?? "").trim();

  const enteredDate = String(formData.get("date_joined") ?? "").trim();
  const dateJoined =
    enteredDate || new Date().toISOString().slice(0, 10);

  const registrationPaid = Number(
    String(formData.get("registration_paid") ?? "0")
  );

  if (
    fullName.length < 2 ||
    !Number.isFinite(registrationPaid) ||
    registrationPaid < 0
  ) {
    redirect("/app/members?error=invalid-member-details");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/app/members?error=administrator-profile-not-found");
  }

  const { data: member, error: memberError } = await supabase
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

  if (memberError || !member) {
    redirect(
      `/app/members?error=${encodeURIComponent(
        memberError?.message || "member-save-failed"
      )}`
    );
  }

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

  redirect("/app/members");
}