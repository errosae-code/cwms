import PrintButton from "@/components/PrintButton";
import { createClient } from "@/lib/supabase/server";

const monthNames=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const money=(n:number)=>`KES ${new Intl.NumberFormat("en-KE",{maximumFractionDigits:2}).format(n)}`;
const num=(v:unknown)=>Number(v||0);
const memberNo=(v:unknown)=>Number(String(v??"").replace(/\D/g,""))||Number.MAX_SAFE_INTEGER;

export default async function MemberStatement({searchParams}:{searchParams:Promise<{member?:string;year?:string}>}){
  const sp=await searchParams;const year=Number(sp.year)||new Date().getFullYear();const s=await createClient();
  const {data:memberData}=await s.from("members").select("id,membership_no,full_name,status,date_joined,registration_paid").is("deleted_at",null);
  const members=[...(memberData||[])].sort((a:any,b:any)=>memberNo(a.membership_no)-memberNo(b.membership_no));
  const memberId=sp.member || members?.[0]?.id;
  if(!memberId)return <><h1>Member Statement</h1><div className="panel">No members are available.</div></>;
  const member=members?.find((m:any)=>m.id===memberId);
  const [{data:contributions},{data:loans},{data:welfare},{data:refunds}]=await Promise.all([
    s.from("contributions").select("id,amount,contribution_month,contribution_year,payment_date,reference").eq("member_id",memberId).is("deleted_at",null).order("payment_date"),
    s.from("loans").select("id,loan_no,principal,interest_amount,total_due,outstanding_principal,outstanding_interest,issue_date,due_date,status").eq("member_id",memberId).is("deleted_at",null).order("issue_date"),
    s.from("welfare_entries").select("id,entry_date,category,money_in,money_out,remarks").eq("member_id",memberId).is("deleted_at",null).order("entry_date"),
    s.from("member_refunds").select("id,amount,refund_date,reason,reference").eq("member_id",memberId).is("deleted_at",null).order("refund_date"),
  ]);
  const loanIds=(loans||[]).map((l:any)=>l.id);
  let repayments:any[]=[];
  if(loanIds.length){const {data}=await s.from("repayments").select("id,loan_id,amount,interest_paid,principal_paid,payment_date,receipt_no").in("loan_id",loanIds).is("deleted_at",null).order("payment_date");repayments=data||[];}
  const contribTotal=(contributions||[]).reduce((a:any,x:any)=>a+num(x.amount),0);const refundTotal=(refunds||[]).reduce((a:any,x:any)=>a+num(x.amount),0);const netContrib=contribTotal-refundTotal;const firstRefund=(refunds||[])[0]?.refund_date;const loanTotal=(loans||[]).reduce((a:any,x:any)=>a+num(x.principal),0);const repayTotal=repayments.reduce((a,x)=>a+num(x.amount),0);const outPrincipal=(loans||[]).reduce((a:any,x:any)=>a+num(x.outstanding_principal),0);const outInterest=(loans||[]).reduce((a:any,x:any)=>a+num(x.outstanding_interest),0);const welfareOut=(welfare||[]).reduce((a:any,x:any)=>a+num(x.money_out),0);
  const yearContrib=(contributions||[]).filter((c:any)=>c.contribution_year===year);const byMonth=new Map<number,number>();yearContrib.forEach((c:any)=>byMonth.set(c.contribution_month,(byMonth.get(c.contribution_month)||0)+num(c.amount)));
  const loanMap=new Map((loans||[]).map((l:any)=>[l.id,l]));
  return <><div className="pagehead"><div><h1>Member Statement</h1><p className="muted">Contribution, loan, repayment and welfare history for one member.</p></div></div>
  <div className="panel" style={{marginBottom:18}}><form method="get" className="filterbar"><div className="field grow"><label>Member</label><select name="member" defaultValue={memberId}>{members?.map((m:any)=><option key={m.id} value={m.id}>{m.membership_no} — {m.full_name}</option>)}</select></div><div className="field"><label>Contribution Year</label><input name="year" type="number" defaultValue={year}/></div><button className="btn primary">View Statement</button><PrintButton /></form></div>
  {member&&<><div className="statement-title"><h2>{member.full_name}</h2><div>{member.membership_no} · {member.status} · Joined {member.date_joined}</div></div><div className="cards"><div className="card"><div className="label">Total Contributions</div><div className="value blue">{money(contribTotal)}</div></div><div className="card"><div className="label">Contribution Refunds</div><div className="value red">{money(refundTotal)}</div><div className="muted" style={{fontSize:12}}>Net retained: {money(netContrib)}</div></div><div className="card"><div className="label">Loans Issued</div><div className="value">{money(loanTotal)}</div></div><div className="card"><div className="label">Outstanding Principal</div><div className="value red">{money(outPrincipal)}</div></div><div className="card"><div className="label">Outstanding Interest</div><div className="value red">{money(outInterest)}</div></div></div>
  <div className="panel" style={{marginBottom:18}}><h3>{year} Contribution Status</h3><div className="monthgrid">{monthNames.map((m,i)=>{
    const paid=byMonth.get(i+1)||0;
    const now=new Date();
    const monthStart=new Date(year,i,1);
    const joinDate=new Date(`${member.date_joined}T00:00:00`);
    const monthEnd=new Date(year,i+1,0,23,59,59);
    const refundDate=firstRefund?new Date(`${firstRefund}T00:00:00`):null;
    const withdrawnBeforeMonth=member.status==="withdrawn"&&refundDate?monthStart>new Date(refundDate.getFullYear(),refundDate.getMonth(),1):false;
    const notDue=monthStart>new Date(now.getFullYear(),now.getMonth(),1)||joinDate>monthEnd||withdrawnBeforeMonth;
    const state=notDue?"notdue":paid>0?"paid":"pending";
    return <div key={m} className={`monthbox ${state}`}><span>{m}</span><strong>{money(paid)}</strong><small>{notDue?"Not Yet Due":paid>0?"Recorded":"Unpaid"}</small></div>})}</div></div>
  <div className="grid2"><div className="panel"><h3>Summary</h3><table><tbody><tr><td>Registration Paid</td><td className="num">{money(num(member.registration_paid))}</td></tr><tr><td>Gross Contributions</td><td className="num">{money(contribTotal)}</td></tr><tr><td>Contribution Refunds</td><td className="num">{money(refundTotal)}</td></tr><tr><td>Net Contributions Retained</td><td className="num">{money(netContrib)}</td></tr><tr><td>Total Loan Repayments</td><td className="num">{money(repayTotal)}</td></tr><tr><td>Welfare Support Paid</td><td className="num">{money(welfareOut)}</td></tr></tbody></table></div><div className="panel"><h3>Current Loan Position</h3><table><tbody><tr><td>Outstanding Principal</td><td className="num">{money(outPrincipal)}</td></tr><tr><td>Outstanding Interest</td><td className="num">{money(outInterest)}</td></tr><tr><td>Total Outstanding</td><td className="num">{money(outPrincipal+outInterest)}</td></tr></tbody></table></div></div>
  <div className="panel" style={{marginTop:18}}><h3>Contribution History</h3><div className="tablewrap"><table><thead><tr><th>Payment Date</th><th>Contribution Month</th><th>Reference</th><th>Amount</th></tr></thead><tbody>{contributions?.length?contributions.map((c:any)=><tr key={c.id}><td>{c.payment_date}</td><td>{monthNames[c.contribution_month-1]} {c.contribution_year}</td><td>{c.reference||"-"}</td><td>{money(num(c.amount))}</td></tr>):<tr><td colSpan={4} className="empty">No contributions.</td></tr>}</tbody></table></div></div>
  <div className="panel" style={{marginTop:18}}><h3>Contribution Refund / Withdrawal History</h3><div className="tablewrap"><table><thead><tr><th>Date</th><th>Amount</th><th>Reason</th><th>Reference</th></tr></thead><tbody>{refunds?.length?refunds.map((r:any)=><tr key={r.id}><td>{r.refund_date}</td><td>{money(num(r.amount))}</td><td>{r.reason||"-"}</td><td>{r.reference||"-"}</td></tr>):<tr><td colSpan={4} className="empty">No contribution refunds.</td></tr>}</tbody></table></div></div>
  <div className="panel" style={{marginTop:18}}><h3>Loans</h3><div className="tablewrap"><table><thead><tr><th>Loan</th><th>Issue Date</th><th>Principal</th><th>Interest</th><th>Outstanding</th><th>Status</th></tr></thead><tbody>{loans?.length?loans.map((l:any)=><tr key={l.id}><td>{l.loan_no}</td><td>{l.issue_date}</td><td>{money(num(l.principal))}</td><td>{money(num(l.interest_amount))}</td><td>{money(num(l.outstanding_principal)+num(l.outstanding_interest))}</td><td>{l.status}</td></tr>):<tr><td colSpan={6} className="empty">No loans.</td></tr>}</tbody></table></div></div>
  <div className="panel" style={{marginTop:18}}><h3>Repayments</h3><div className="tablewrap"><table><thead><tr><th>Date</th><th>Loan</th><th>Principal</th><th>Interest</th><th>Total</th><th>Receipt</th></tr></thead><tbody>{repayments.length?repayments.map((r:any)=><tr key={r.id}><td>{r.payment_date}</td><td>{(loanMap.get(r.loan_id) as any)?.loan_no||"-"}</td><td>{money(num(r.principal_paid))}</td><td>{money(num(r.interest_paid))}</td><td>{money(num(r.amount))}</td><td>{r.receipt_no||"-"}</td></tr>):<tr><td colSpan={6} className="empty">No repayments.</td></tr>}</tbody></table></div></div>
  <div className="panel" style={{marginTop:18}}><h3>Welfare History</h3><div className="tablewrap"><table><thead><tr><th>Date</th><th>Category</th><th>In</th><th>Out</th><th>Remarks</th></tr></thead><tbody>{welfare?.length?welfare.map((w:any)=><tr key={w.id}><td>{w.entry_date}</td><td>{w.category}</td><td>{money(num(w.money_in))}</td><td>{money(num(w.money_out))}</td><td>{w.remarks||"-"}</td></tr>):<tr><td colSpan={5} className="empty">No welfare entries.</td></tr>}</tbody></table></div></div></>}
  </>;
}
