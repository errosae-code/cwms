import { createClient } from "@/lib/supabase/server";
import { deleteRepayment, recordRepayment, updateRepayment } from "./actions";
import Modal from "@/components/Modal";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";

export default async function Repayments(){
  const s=await createClient();
  const [{data:loans},{data:rows}]=await Promise.all([
    s.from("loans").select("id,loan_no,outstanding_principal,outstanding_interest,members(full_name,membership_no)").neq("status","cleared").is("deleted_at",null).order("loan_no"),
    s.from("repayments").select("id,loan_id,amount,interest_paid,principal_paid,payment_date,receipt_no,loans(loan_no,members(full_name,membership_no))").is("deleted_at",null).order("payment_date",{ascending:false}),
  ]);
  const form=(action:typeof recordRepayment,row?:any)=><form action={action}>{row&&<input type="hidden" name="id" value={row.id}/>}<div className="formgrid">
    <div className="field"><label>Loan</label><select name="loan_id" defaultValue={row?.loan_id||""} required><option value="">Select loan</option>{loans?.map((l:any)=><option key={l.id} value={l.id}>{l.loan_no} — {l.members?.membership_no} {l.members?.full_name} — KES {(Number(l.outstanding_principal)+Number(l.outstanding_interest)).toLocaleString()}</option>)}</select></div>
    <div className="field"><label>Amount</label><input name="amount" type="number" step="0.01" defaultValue={row?Number(row.amount):""} required/></div>
    <div className="field"><label>Payment Date</label><input name="payment_date" type="date" defaultValue={row?.payment_date||""} required/></div>
    <div className="field"><label>Receipt No.</label><input name="receipt_no" defaultValue={row?.receipt_no||""}/></div>
  </div><button className="btn success" style={{marginTop:14}}>{row?"Save Changes":"Save Repayment"}</button></form>;
  return <>
    <div className="pagehead"><div><h1>Repayments</h1><p className="muted">Repayments are allocated to outstanding interest first, then principal.</p></div><Modal trigger="+ Add Repayment" title="Record Repayment">{form(recordRepayment)}</Modal></div>
    <div className="panel"><div className="tablewrap"><table><thead><tr><th>Loan</th><th>Member</th><th>Amount</th><th>Interest</th><th>Principal</th><th>Date</th><th>Receipt</th><th>Actions</th></tr></thead><tbody>{rows?.length?rows.map((r:any)=><tr key={r.id}><td>{r.loans?.loan_no}</td><td>{r.loans?.members?.membership_no} — {r.loans?.members?.full_name}</td><td>KES {Number(r.amount).toLocaleString()}</td><td>KES {Number(r.interest_paid).toLocaleString()}</td><td>KES {Number(r.principal_paid).toLocaleString()}</td><td>{r.payment_date}</td><td>{r.receipt_no||"-"}</td><td><div className="rowactions"><Modal trigger="Edit" title="Edit Repayment">{form(updateRepayment,r)}</Modal><form action={deleteRepayment}><input type="hidden" name="id" value={r.id}/><ConfirmSubmitButton message="Delete this repayment? Loan balances will be recalculated and the action logged."/></form></div></td></tr>):<tr><td colSpan={8} className="empty">No repayments recorded.</td></tr>}</tbody></table></div></div>
  </>;
}
