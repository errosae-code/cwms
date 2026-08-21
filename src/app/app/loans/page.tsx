import { createClient } from "@/lib/supabase/server";
import { deleteLoan, issueLoan, updateLoan } from "./actions";
import Modal from "@/components/Modal";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";

const memberNo=(v:unknown)=>Number(String(v??"").replace(/\D/g,""))||Number.MAX_SAFE_INTEGER;

export default async function Loans(){
  const s=await createClient();
  const [{data:memberData},{data:rows}]=await Promise.all([
    s.from("members").select("id,membership_no,full_name").eq("status","active").is("deleted_at",null),
    s.from("loans").select("*,members(full_name,membership_no)").is("deleted_at",null).order("issue_date",{ascending:false}),
  ]);
  const members=[...(memberData||[])].sort((a:any,b:any)=>memberNo(a.membership_no)-memberNo(b.membership_no));
  const form=(action:typeof issueLoan,row?:any)=><form action={action}>{row&&<input type="hidden" name="id" value={row.id}/>}<div className="formgrid">
    <div className="field"><label>Member</label><select name="member_id" defaultValue={row?.member_id||""} required><option value="">Select member</option>{members.map((m:any)=><option key={m.id} value={m.id}>{m.membership_no} — {m.full_name}</option>)}</select></div>
    <div className="field"><label>Principal</label><input name="principal" type="number" step="0.01" defaultValue={row?Number(row.principal):""} required/></div>
    <div className="field"><label>Issue Date</label><input name="issue_date" type="date" defaultValue={row?.issue_date||""} required/></div>
    <div className="field"><label>Due Date</label><input name="due_date" type="date" defaultValue={row?.due_date||""} required/></div>
  </div><button className="btn success" style={{marginTop:14}}>{row?"Save Changes":"Issue Loan"}</button></form>;
  return <>
    <div className="pagehead"><div><h1>Loans</h1><p className="muted">View loan dates, balances and status. Historical cleared loans remain available for audit.</p></div><Modal trigger="+ Issue Loan" title="Issue Loan">{form(issueLoan)}</Modal></div>
    <div className="panel"><div className="tablewrap"><table><thead><tr><th>Loan</th><th>Member</th><th>Issue Date</th><th>Due Date</th><th>Principal Outstanding</th><th>Interest Outstanding</th><th>Total Outstanding</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows?.length?rows.map((r:any)=><tr key={r.id}><td>{r.loan_no}</td><td>{r.members?.membership_no} — {r.members?.full_name}</td><td>{r.issue_date}</td><td>{r.due_date}</td><td>KES {Number(r.outstanding_principal).toLocaleString()}</td><td>KES {Number(r.outstanding_interest).toLocaleString()}</td><td>KES {(Number(r.outstanding_principal)+Number(r.outstanding_interest)).toLocaleString()}</td><td><span className={`badge ${r.status}`}>{r.status}</span></td><td><div className="rowactions"><Modal trigger="Edit" title={`Edit ${r.loan_no}`}>{form(updateLoan,r)}</Modal><form action={deleteLoan}><input type="hidden" name="id" value={r.id}/><ConfirmSubmitButton message="Delete this loan? Loans with repayments cannot be deleted."/></form></div></td></tr>):<tr><td colSpan={9} className="empty">No loans recorded.</td></tr>}</tbody></table></div></div>
  </>;
}
