import PrintButton from "@/components/PrintButton";
import { createClient } from "@/lib/supabase/server";

const money = (n: number) => `KES ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 }).format(n)}`;
const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const num = (v: unknown) => Number(v || 0);

function monthBounds(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2,"0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = `${nextYear}-${String(nextMonth).padStart(2,"0")}-01`;
  return { start, end };
}

export default async function Reports({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {
  const sp = await searchParams;
  const now = new Date();
  const month = Math.min(12, Math.max(1, Number(sp.month) || now.getMonth() + 1));
  const year = Number(sp.year) || now.getFullYear();
  const { start, end } = monthBounds(year, month);
  const s = await createClient();

  const [settingsRes, allBeforeContrib, allBeforeLoans, allBeforeReps, allBeforeWelfare, monthContrib, monthLoans, monthReps, monthWelfare, membersRes, scheduleContrib, loansToEnd, repsToEnd, joinedMonth] = await Promise.all([
    s.from("settings").select("opening_cash_balance,monthly_contribution").limit(1).single(),
    s.from("contributions").select("amount").lt("payment_date", start).is("deleted_at", null),
    s.from("loans").select("principal").lt("issue_date", start).is("deleted_at", null),
    s.from("repayments").select("amount").lt("payment_date", start).is("deleted_at", null),
    s.from("welfare_entries").select("money_in,money_out").lt("entry_date", start).is("deleted_at", null),
    s.from("contributions").select("amount,payment_date,reference,members(membership_no,full_name)").gte("payment_date", start).lt("payment_date", end).is("deleted_at", null).order("payment_date"),
    s.from("loans").select("id,loan_no,principal,interest_amount,issue_date,due_date,status,members(membership_no,full_name)").gte("issue_date", start).lt("issue_date", end).is("deleted_at", null).order("issue_date"),
    s.from("repayments").select("amount,interest_paid,principal_paid,payment_date,receipt_no,loans(loan_no,members(membership_no,full_name))").gte("payment_date", start).lt("payment_date", end).is("deleted_at", null).order("payment_date"),
    s.from("welfare_entries").select("entry_date,category,money_in,money_out,remarks,members(membership_no,full_name)").gte("entry_date", start).lt("entry_date", end).is("deleted_at", null).order("entry_date"),
    s.from("members").select("id,membership_no,full_name,status,date_joined").lt("date_joined", end).is("deleted_at", null).order("full_name"),
    s.from("contributions").select("member_id,amount").eq("contribution_month", month).eq("contribution_year", year).is("deleted_at", null),
    s.from("loans").select("id,principal,interest_amount,issue_date").lt("issue_date", end).is("deleted_at", null),
    s.from("repayments").select("loan_id,principal_paid,interest_paid,payment_date").lt("payment_date", end).is("deleted_at", null),
    s.from("members").select("registration_paid").gte("date_joined", start).lt("date_joined", end).is("deleted_at", null),
  ]);

  const openingBase = num(settingsRes.data?.opening_cash_balance);
  const beforeContrib = allBeforeContrib.data?.reduce((a,x)=>a+num(x.amount),0) || 0;
  const beforeLoans = allBeforeLoans.data?.reduce((a,x)=>a+num(x.principal),0) || 0;
  const beforeReps = allBeforeReps.data?.reduce((a,x)=>a+num(x.amount),0) || 0;
  const beforeWelfareIn = allBeforeWelfare.data?.reduce((a,x)=>a+num(x.money_in),0) || 0;
  const beforeWelfareOut = allBeforeWelfare.data?.reduce((a,x)=>a+num(x.money_out),0) || 0;
  const openingCash = openingBase + beforeContrib + beforeReps + beforeWelfareIn - beforeLoans - beforeWelfareOut;

  const contributions = monthContrib.data?.reduce((a,x)=>a+num(x.amount),0) || 0;
  const loansIssued = monthLoans.data?.reduce((a,x)=>a+num(x.principal),0) || 0;
  const repayments = monthReps.data?.reduce((a,x)=>a+num(x.amount),0) || 0;
  const principalRepaid = monthReps.data?.reduce((a,x)=>a+num(x.principal_paid),0) || 0;
  const interestEarned = monthReps.data?.reduce((a,x)=>a+num(x.interest_paid),0) || 0;
  const welfareIn = monthWelfare.data?.reduce((a,x)=>a+num(x.money_in),0) || 0;
  const welfareOut = monthWelfare.data?.reduce((a,x)=>a+num(x.money_out),0) || 0;
  const registrationRecorded = joinedMonth.data?.reduce((a,x)=>a+num(x.registration_paid),0) || 0;
  const closingCash = openingCash + contributions + repayments + welfareIn - loansIssued - welfareOut;

  const repByLoan = new Map<string,{principal:number;interest:number}>();
  repsToEnd.data?.forEach((r:any)=>{ const cur=repByLoan.get(r.loan_id)||{principal:0,interest:0}; cur.principal += num(r.principal_paid); cur.interest += num(r.interest_paid); repByLoan.set(r.loan_id,cur); });
  let outstandingPrincipal = 0;
  let outstandingInterest = 0;
  loansToEnd.data?.forEach((l:any)=>{ const paid=repByLoan.get(l.id)||{principal:0,interest:0}; outstandingPrincipal += Math.max(0,num(l.principal)-paid.principal); outstandingInterest += Math.max(0,num(l.interest_amount)-paid.interest); });
  const totalFundValue = closingCash + outstandingPrincipal;

  const contribByMember = new Map<string,number>();
  scheduleContrib.data?.forEach((c:any)=>contribByMember.set(c.member_id,(contribByMember.get(c.member_id)||0)+num(c.amount)));
  const expected = num(settingsRes.data?.monthly_contribution);
  const eligibleMembers = (membersRes.data || []).filter((m:any)=>m.status === "active" || m.status === "inactive");

  return <>
    <div className="pagehead"><div><h1>Monthly Statement</h1><p className="muted">A complete monthly view of cash movements, loans and member contribution status.</p></div></div>
    <div className="panel" style={{marginBottom:18}}><form method="get" className="filterbar"><div className="field"><label>Month</label><select name="month" defaultValue={month}>{monthNames.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select></div><div className="field"><label>Year</label><input name="year" type="number" defaultValue={year}/></div><button className="btn primary" type="submit">View Statement</button><PrintButton /></form></div>

    <div className="statement-title"><h2>{monthNames[month-1]} {year}</h2><div>Chyun Welfare Monthly Statement</div></div>

    <div className="cards"><div className="card"><div className="label">Opening Cash</div><div className="value">{money(openingCash)}</div></div><div className="card"><div className="label">Closing Cash</div><div className="value blue">{money(closingCash)}</div></div><div className="card"><div className="label">Outstanding Principal</div><div className="value red">{money(outstandingPrincipal)}</div></div><div className="card"><div className="label">Total Fund Value</div><div className="value green">{money(totalFundValue)}</div></div></div>

    <div className="grid2">
      <div className="panel"><h3>Money In</h3><table><tbody><tr><td>Member Contributions</td><td className="num">{money(contributions)}</td></tr><tr><td>Loan Repayments — Principal</td><td className="num">{money(principalRepaid)}</td></tr><tr><td>Interest Earned</td><td className="num">{money(interestEarned)}</td></tr><tr><td>Other / Welfare Income</td><td className="num">{money(welfareIn)}</td></tr><tr className="totalrow"><td>Total Cash In</td><td className="num">{money(contributions+repayments+welfareIn)}</td></tr></tbody></table></div>
      <div className="panel"><h3>Money Out</h3><table><tbody><tr><td>Loans Issued</td><td className="num">{money(loansIssued)}</td></tr><tr><td>Welfare / Other Outflow</td><td className="num">{money(welfareOut)}</td></tr><tr className="totalrow"><td>Total Cash Out</td><td className="num">{money(loansIssued+welfareOut)}</td></tr></tbody></table><p className="footnote">Registration fees recorded this month: <strong>{money(registrationRecorded)}</strong>. They are shown separately because the current dashboard formula does not include registration fees in fund cash.</p></div>
    </div>

    <div className="panel" style={{marginTop:18}}><h3>Fund Position at Month End</h3><div className="summarygrid"><div><span>Closing Cash</span><strong>{money(closingCash)}</strong></div><div><span>Outstanding Principal</span><strong>{money(outstandingPrincipal)}</strong></div><div><span>Outstanding Interest</span><strong>{money(outstandingInterest)}</strong></div><div><span>Total Fund Value</span><strong>{money(totalFundValue)}</strong></div></div></div>

    <div className="panel" style={{marginTop:18}}><h3>Member Contribution Status — {monthNames[month-1]}</h3><div className="tablewrap"><table><thead><tr><th>Member</th><th>Status</th><th>Expected</th><th>Paid</th><th>Variance</th><th>Payment Status</th></tr></thead><tbody>{eligibleMembers.map((m:any)=>{const paid=contribByMember.get(m.id)||0;const variance=paid-expected;return <tr key={m.id}><td>{m.membership_no} — {m.full_name}</td><td>{m.status}</td><td>{money(expected)}</td><td>{money(paid)}</td><td className={variance<0?"red":"green"}>{money(variance)}</td><td><span className={`badge ${paid>=expected?"active":"inactive"}`}>{paid>=expected?"Paid":"Pending"}</span></td></tr>})}</tbody></table></div></div>

    <div className="panel" style={{marginTop:18}}><h3>Transactions in {monthNames[month-1]}</h3><div className="reportsections">
      <div><h4>Contributions</h4><div className="tablewrap"><table><thead><tr><th>Date</th><th>Member</th><th>Reference</th><th>Amount</th></tr></thead><tbody>{monthContrib.data?.length?monthContrib.data.map((r:any,i:number)=><tr key={i}><td>{r.payment_date}</td><td>{r.members?.membership_no} — {r.members?.full_name}</td><td>{r.reference||"-"}</td><td>{money(num(r.amount))}</td></tr>):<tr><td colSpan={4} className="empty">No contributions.</td></tr>}</tbody></table></div></div>
      <div><h4>Loans Issued</h4><div className="tablewrap"><table><thead><tr><th>Date</th><th>Loan</th><th>Member</th><th>Principal</th><th>Interest</th></tr></thead><tbody>{monthLoans.data?.length?monthLoans.data.map((r:any)=><tr key={r.id}><td>{r.issue_date}</td><td>{r.loan_no}</td><td>{r.members?.full_name}</td><td>{money(num(r.principal))}</td><td>{money(num(r.interest_amount))}</td></tr>):<tr><td colSpan={5} className="empty">No loans issued.</td></tr>}</tbody></table></div></div>
      <div><h4>Loan Repayments</h4><div className="tablewrap"><table><thead><tr><th>Date</th><th>Loan / Member</th><th>Principal</th><th>Interest</th><th>Total</th></tr></thead><tbody>{monthReps.data?.length?monthReps.data.map((r:any,i:number)=><tr key={i}><td>{r.payment_date}</td><td>{r.loans?.loan_no} — {r.loans?.members?.full_name}</td><td>{money(num(r.principal_paid))}</td><td>{money(num(r.interest_paid))}</td><td>{money(num(r.amount))}</td></tr>):<tr><td colSpan={5} className="empty">No repayments.</td></tr>}</tbody></table></div></div>
      <div><h4>Welfare / Other Fund Movements</h4><div className="tablewrap"><table><thead><tr><th>Date</th><th>Member</th><th>Category</th><th>In</th><th>Out</th></tr></thead><tbody>{monthWelfare.data?.length?monthWelfare.data.map((r:any,i:number)=><tr key={i}><td>{r.entry_date}</td><td>{r.members?.full_name||"-"}</td><td>{r.category}</td><td>{money(num(r.money_in))}</td><td>{money(num(r.money_out))}</td></tr>):<tr><td colSpan={5} className="empty">No welfare entries.</td></tr>}</tbody></table></div></div>
    </div></div>
  </>;
}
