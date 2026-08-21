import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { changeMemberStatus, updateMember } from "../actions";

const money = (n: number) => `KES ${new Intl.NumberFormat("en-KE").format(n)}`;

export default async function MemberDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const qs = await searchParams;
  const s = await createClient();
  const [{ data: member }, { data: contributions }, { data: loans }, { data: welfare }] = await Promise.all([
    s.from("members").select("*").eq("id", id).is("deleted_at", null).maybeSingle(),
    s.from("contributions").select("amount").eq("member_id", id).is("deleted_at", null),
    s.from("loans").select("principal,outstanding_principal,outstanding_interest,status").eq("member_id", id).is("deleted_at", null),
    s.from("welfare_entries").select("money_in,money_out").eq("member_id", id).is("deleted_at", null),
  ]);
  if (!member) notFound();
  const totalContrib = contributions?.reduce((a, x) => a + Number(x.amount), 0) || 0;
  const outstandingPrincipal = loans?.reduce((a, x) => a + Number(x.outstanding_principal), 0) || 0;
  const outstandingInterest = loans?.reduce((a, x) => a + Number(x.outstanding_interest), 0) || 0;
  const welfareOut = welfare?.reduce((a, x) => a + Number(x.money_out), 0) || 0;

  return <>
    <div className="pagehead"><div><Link className="textlink" href="/app/members">← Back to Members</Link><h1>{member.full_name}</h1><p className="muted">{member.membership_no} · <span className={`badge ${member.status}`}>{member.status}</span></p></div><Link className="btn primary" href={`/app/member-statement?member=${member.id}`}>Member Statement</Link></div>
    {qs.saved && <div className="notice successnote">Changes saved successfully.</div>}
    {qs.error && <div className="notice">{decodeURIComponent(qs.error)}</div>}

    <div className="cards"><div className="card"><div className="label">Total Contributions</div><div className="value blue">{money(totalContrib)}</div></div><div className="card"><div className="label">Outstanding Principal</div><div className="value red">{money(outstandingPrincipal)}</div></div><div className="card"><div className="label">Outstanding Interest</div><div className="value red">{money(outstandingInterest)}</div></div><div className="card"><div className="label">Welfare Support Paid</div><div className="value">{money(welfareOut)}</div></div></div>

    <div className="panel" style={{ marginBottom: 18 }}><h3>Edit Member</h3><form action={updateMember}><input type="hidden" name="member_id" value={member.id} /><div className="formgrid">
      <div className="field"><label>Full Name</label><input name="full_name" defaultValue={member.full_name} required /></div>
      <div className="field"><label>Phone</label><input name="phone" defaultValue={member.phone || ""} /></div>
      <div className="field"><label>National ID</label><input name="national_id" defaultValue={member.national_id || ""} /></div>
      <div className="field"><label>Date Joined</label><input name="date_joined" type="date" defaultValue={member.date_joined} required /></div>
      <div className="field"><label>Registration Paid (KES)</label><input name="registration_paid" type="number" min="0" step="0.01" defaultValue={Number(member.registration_paid)} /></div>
    </div><button className="btn success" style={{ marginTop: 14 }}>Save Changes</button></form></div>

    <div className="panel dangerpanel"><h3>Member Status</h3><p className="muted">Deactivate or withdraw a member instead of deleting them. Their contributions, loans and history remain available for reporting and audit.</p><form action={changeMemberStatus} className="inlineform"><input type="hidden" name="member_id" value={member.id} /><select name="status" defaultValue={member.status}><option value="active">Active</option><option value="inactive">Inactive</option><option value="withdrawn">Withdrawn</option></select><button className="btn light">Update Status</button></form></div>
  </>;
}
