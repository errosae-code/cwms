import { createClient } from "@/lib/supabase/server";
import { addContribution, deleteContribution, updateContribution } from "./actions";
import Modal from "@/components/Modal";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";

const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const memberNo = (v: unknown) => Number(String(v ?? "").replace(/\D/g, "")) || Number.MAX_SAFE_INTEGER;

export default async function Contributions({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {
  const sp = await searchParams;
  const s = await createClient();
  const now = new Date();
  const month = Math.min(12, Math.max(1, Number(sp.month) || now.getMonth() + 1));
  const year = Number(sp.year) || now.getFullYear();
  const [{ data: memberData }, { data: rows }, { data: settings }] = await Promise.all([
    s.from("members").select("id,membership_no,full_name").eq("status","active").is("deleted_at",null),
    s.from("contributions").select("id,member_id,amount,contribution_month,contribution_year,payment_date,reference,members(full_name,membership_no)").eq("contribution_month", month).eq("contribution_year", year).is("deleted_at",null).order("payment_date",{ascending:true}),
    s.from("settings").select("monthly_contribution").limit(1).maybeSingle(),
  ]);
  const members = [...(memberData || [])].sort((a:any,b:any)=>memberNo(a.membership_no)-memberNo(b.membership_no));
  const defaultAmount = Number(settings?.monthly_contribution || 500);

  const form = (action: typeof addContribution, row?: any) => <form action={action}>
    {row && <input type="hidden" name="id" value={row.id} />}
    <div className="formgrid">
      <div className="field"><label>Member</label><select name="member_id" defaultValue={row?.member_id || ""} required><option value="">Select member</option>{members.map((m:any)=><option key={m.id} value={m.id}>{m.membership_no} — {m.full_name}</option>)}</select></div>
      <div className="field"><label>Amount</label><input name="amount" type="number" step="0.01" defaultValue={row ? Number(row.amount) : defaultAmount} required /></div>
      <div className="field"><label>Contribution Month</label><select name="contribution_month" defaultValue={row?.contribution_month || month}>{months.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select></div>
      <div className="field"><label>Year</label><input name="contribution_year" type="number" defaultValue={row?.contribution_year || year} required /></div>
      <div className="field"><label>Payment Date</label><input name="payment_date" type="date" defaultValue={row?.payment_date || ""} required /></div>
      <div className="field"><label>Reference</label><input name="reference" defaultValue={row?.reference || ""} /></div>
    </div>
    <button className="btn success" style={{marginTop:14}}>{row ? "Save Changes" : "Save Contribution"}</button>
  </form>;

  return <>
    <div className="pagehead"><div><h1>Contributions</h1><p className="muted">Showing one contribution month at a time. Previous months remain available in statements and reports.</p></div><Modal trigger="+ Add Contribution" title="Add Contribution">{form(addContribution)}</Modal></div>
    <div className="panel" style={{marginBottom:18}}><form method="get" className="filterbar"><div className="field"><label>Month</label><select name="month" defaultValue={month}>{months.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select></div><div className="field"><label>Year</label><input name="year" type="number" defaultValue={year}/></div><button className="btn primary">View Month</button></form></div>
    <div className="panel"><h3>{months[month-1]} {year}</h3><div className="tablewrap"><table><thead><tr><th>Payment Date</th><th>Member</th><th>Amount</th><th>Reference</th><th>Actions</th></tr></thead><tbody>{rows?.length?rows.map((r:any)=><tr key={r.id}><td>{r.payment_date}</td><td>{r.members?.membership_no} — {r.members?.full_name}</td><td>KES {Number(r.amount).toLocaleString()}</td><td>{r.reference||"-"}</td><td><div className="rowactions"><Modal trigger="Edit" title="Edit Contribution">{form(updateContribution,r)}</Modal><form action={deleteContribution}><input type="hidden" name="id" value={r.id}/><ConfirmSubmitButton message="Delete this contribution? The action will be recorded in the Audit Log." /></form></div></td></tr>):<tr><td colSpan={5} className="empty">No contributions recorded for {months[month-1]} {year}.</td></tr>}</tbody></table></div></div>
  </>;
}
