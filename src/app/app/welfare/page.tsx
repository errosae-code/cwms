import { createClient } from "@/lib/supabase/server";
import { addWelfare } from "./actions";
import Modal from "@/components/Modal";

const memberNo=(v:unknown)=>Number(String(v??"").replace(/\D/g,""))||Number.MAX_SAFE_INTEGER;

export default async function Welfare(){
  const s=await createClient();
  const [{data:memberData},{data:rows}]=await Promise.all([
    s.from("members").select("id,membership_no,full_name").eq("status","active").is("deleted_at",null),
    s.from("welfare_entries").select("*,members(full_name,membership_no)").is("deleted_at",null).order("entry_date",{ascending:false}),
  ]);
  const members=[...(memberData||[])].sort((a:any,b:any)=>memberNo(a.membership_no)-memberNo(b.membership_no));
  const form=<form action={addWelfare}><div className="formgrid"><div className="field"><label>Member (optional)</label><select name="member_id"><option value="">None</option>{members.map((m:any)=><option key={m.id} value={m.id}>{m.membership_no} — {m.full_name}</option>)}</select></div><div className="field"><label>Date</label><input name="entry_date" type="date" required/></div><div className="field"><label>Category</label><input name="category" placeholder="Hospital, funeral, emergency..." required/></div><div className="field"><label>Money In</label><input name="money_in" type="number" step="0.01" defaultValue="0"/></div><div className="field"><label>Money Out</label><input name="money_out" type="number" step="0.01" defaultValue="0"/></div><div className="field"><label>Remarks</label><input name="remarks"/></div></div><button className="btn success" style={{marginTop:14}}>Save Entry</button></form>;
  return <>
    <div className="pagehead"><div><h1>Welfare</h1><p className="muted">Welfare is blank for now. New entries can be added when required.</p></div><Modal trigger="+ Add Welfare Entry" title="Add Welfare Entry">{form}</Modal></div>
    <div className="panel"><div className="tablewrap"><table><thead><tr><th>Date</th><th>Member</th><th>Category</th><th>In</th><th>Out</th><th>Remarks</th></tr></thead><tbody>{rows?.length?rows.map((r:any)=><tr key={r.id}><td>{r.entry_date}</td><td>{r.members?.membership_no?`${r.members.membership_no} — `:""}{r.members?.full_name||"-"}</td><td>{r.category}</td><td>KES {Number(r.money_in).toLocaleString()}</td><td>KES {Number(r.money_out).toLocaleString()}</td><td>{r.remarks||"-"}</td></tr>):<tr><td colSpan={6} className="empty">No welfare entries.</td></tr>}</tbody></table></div></div>
  </>;
}
