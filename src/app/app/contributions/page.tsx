import { createClient } from "@/lib/supabase/server";
import { addContribution } from "./actions";

const months=["January","February","March","April","May","June","July","August","September","October","November","December"];

export default async function Contributions(){
  const s=await createClient();
  const {data:members}=await s.from("members").select("id,membership_no,full_name").eq("status","active").is("deleted_at",null).order("full_name");
  const {data:rows}=await s.from("contributions").select("id,amount,contribution_month,contribution_year,payment_date,reference,members(full_name,membership_no)").is("deleted_at",null).order("created_at",{ascending:false}).limit(50);
  const now=new Date();
  return <><div className="pagehead"><div><h1>Contributions</h1><p className="muted">Record monthly contributions and view recent payments.</p></div></div>
  <div className="panel" style={{marginBottom:18}}><form action={addContribution}><div className="formgrid">
    <div className="field"><label>Member</label><select name="member_id" required><option value="">Select member</option>{members?.map(m=><option key={m.id} value={m.id}>{m.membership_no} — {m.full_name}</option>)}</select></div>
    <div className="field"><label>Amount</label><input name="amount" type="number" step="0.01" defaultValue="3000" required/></div>
    <div className="field"><label>Contribution Month</label><select name="contribution_month" defaultValue={now.getMonth()+1}>{months.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select></div>
    <div className="field"><label>Year</label><input name="contribution_year" type="number" defaultValue={now.getFullYear()}/></div>
    <div className="field"><label>Payment Date</label><input name="payment_date" type="date" required/></div>
    <div className="field"><label>Reference</label><input name="reference"/></div>
  </div><button className="btn success" style={{marginTop:14}}>Save Contribution</button></form></div>
  <div className="panel"><div className="tablewrap"><table><thead><tr><th>Payment Date</th><th>Member</th><th>Contribution Month</th><th>Amount</th><th>Reference</th></tr></thead><tbody>{rows?.length?rows.map((r:any)=><tr key={r.id}><td>{r.payment_date}</td><td>{r.members?.membership_no} — {r.members?.full_name}</td><td>{months[r.contribution_month-1]} {r.contribution_year}</td><td>KES {Number(r.amount).toLocaleString()}</td><td>{r.reference||"-"}</td></tr>):<tr><td colSpan={5} className="empty">No contributions recorded.</td></tr>}</tbody></table></div></div></>;
}
