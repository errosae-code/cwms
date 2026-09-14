import PrintButton from "@/components/PrintButton";
import { createClient } from "@/lib/supabase/server";

const money = (n: number) => `KES ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 }).format(n)}`;
const num = (v: unknown) => Number(v || 0);

export default async function Reports({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.year) || now.getFullYear();
  const start = `${year}-01-01`;
  const yearEnd = `${year + 1}-01-01`;
  const currentDayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString().slice(0, 10);
  const end = year === now.getFullYear() ? currentDayEnd : yearEnd;
  const displayEnd = year === now.getFullYear()
    ? now.toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" })
    : `31 December ${year}`;
  const s = await createClient();

  const [settingsRes, beforeContribRes, beforeLoansRes, beforeRepsRes, beforeWelfareRes, beforeRefundsRes, contribRes, loansRes, repsRes, welfareRes, refundsRes, membersRes, loansToEndRes, repsToEndRes] = await Promise.all([
    s.from("settings").select("opening_cash_balance,monthly_contribution,include_registration_in_cash,include_outstanding_interest_in_fund,report_title").limit(1).single(),
    s.from("contributions").select("amount").lt("payment_date", start).is("deleted_at", null),
    s.from("loans").select("principal").lt("issue_date", start).is("deleted_at", null),
    s.from("repayments").select("amount,principal_paid,interest_paid").lt("payment_date", start).is("deleted_at", null),
    s.from("welfare_entries").select("money_in,money_out").lt("entry_date", start).is("deleted_at", null),
    s.from("member_refunds").select("amount").lt("refund_date", start).is("deleted_at", null),
    s.from("contributions").select("member_id,amount,payment_date,reference,members(membership_no,full_name)").gte("payment_date", start).lt("payment_date", end).is("deleted_at", null).order("payment_date"),
    s.from("loans").select("id,loan_no,principal,interest_amount,issue_date,due_date,status,members(id,membership_no,full_name)").gte("issue_date", start).lt("issue_date", end).is("deleted_at", null).order("issue_date"),
    s.from("repayments").select("loan_id,amount,interest_paid,principal_paid,payment_date,receipt_no,loans(loan_no,members(id,membership_no,full_name))").gte("payment_date", start).lt("payment_date", end).is("deleted_at", null).order("payment_date"),
    s.from("welfare_entries").select("entry_date,category,money_in,money_out,remarks,members(membership_no,full_name)").gte("entry_date", start).lt("entry_date", end).is("deleted_at", null).order("entry_date"),
    s.from("member_refunds").select("amount,refund_date,reason,reference,members(membership_no,full_name)").gte("refund_date", start).lt("refund_date", end).is("deleted_at", null).order("refund_date"),
    s.from("members").select("id,membership_no,full_name,status,date_joined,registration_paid").lt("date_joined", end).is("deleted_at", null),
    s.from("loans").select("id,principal,interest_amount,issue_date,members(id,membership_no,full_name)").lt("issue_date", end).is("deleted_at", null),
    s.from("repayments").select("loan_id,principal_paid,interest_paid,payment_date,loans(members(id,membership_no,full_name))").lt("payment_date", end).is("deleted_at", null),
  ]);

  const sum = (rows: any[] | null | undefined, field: string) => rows?.reduce((a, x) => a + num(x[field]), 0) || 0;
  const openingBase = num(settingsRes.data?.opening_cash_balance);
  const beforeContrib = sum(beforeContribRes.data, "amount");
  const beforeLoans = sum(beforeLoansRes.data, "principal");
  const beforeReps = sum(beforeRepsRes.data, "amount");
  const beforeWelfareIn = sum(beforeWelfareRes.data, "money_in");
  const beforeWelfareOut = sum(beforeWelfareRes.data, "money_out");
  const beforeRefunds = sum(beforeRefundsRes.data, "amount");
  const openingCash = openingBase + beforeContrib + beforeReps + beforeWelfareIn - beforeLoans - beforeWelfareOut - beforeRefunds;

  const contributions = sum(contribRes.data, "amount");
  const loansIssued = sum(loansRes.data, "principal");
  const repayments = sum(repsRes.data, "amount");
  const principalRepaid = sum(repsRes.data, "principal_paid");
  const interestReceived = sum(repsRes.data, "interest_paid");
  const welfareIn = sum(welfareRes.data, "money_in");
  const welfareOut = sum(welfareRes.data, "money_out");
  const refunds = sum(refundsRes.data, "amount");
  const registrationTotal = sum(membersRes.data, "registration_paid");
  const registrationCash = settingsRes.data?.include_registration_in_cash ? registrationTotal : 0;
  const closingCash = openingCash + contributions + repayments + welfareIn + registrationCash - loansIssued - welfareOut - refunds;

  const repByLoan = new Map<string, { principal: number; interest: number }>();
  repsToEndRes.data?.forEach((r: any) => {
    const cur = repByLoan.get(r.loan_id) || { principal: 0, interest: 0 };
    cur.principal += num(r.principal_paid);
    cur.interest += num(r.interest_paid);
    repByLoan.set(r.loan_id, cur);
  });
  let outstandingPrincipal = 0;
  let outstandingInterest = 0;
  loansToEndRes.data?.forEach((l: any) => {
    const paid = repByLoan.get(l.id) || { principal: 0, interest: 0 };
    outstandingPrincipal += Math.max(0, num(l.principal) - paid.principal);
    outstandingInterest += Math.max(0, num(l.interest_amount) - paid.interest);
  });
  const totalFundValue = closingCash + outstandingPrincipal + (settingsRes.data?.include_outstanding_interest_in_fund ? outstandingInterest : 0);

  const memberMap = new Map<string, any>();
  (membersRes.data || []).forEach((m: any) => memberMap.set(m.id, { ...m, contributions: 0, loans: 0, interestCharged: 0, principalRepaid: 0, interestRepaid: 0, repayments: 0, outstandingPrincipal: 0, outstandingInterest: 0 }));
  contribRes.data?.forEach((r: any) => {
    const m = memberMap.get(r.member_id);
    if (m) m.contributions += num(r.amount);
  });
  loansToEndRes.data?.forEach((l: any) => {
    const memberId = l.members?.id;
    const m = memberId ? memberMap.get(memberId) : null;
    if (m) {
      m.loans += num(l.principal);
      m.interestCharged += num(l.interest_amount);
      const paid = repByLoan.get(l.id) || { principal: 0, interest: 0 };
      m.outstandingPrincipal += Math.max(0, num(l.principal) - paid.principal);
      m.outstandingInterest += Math.max(0, num(l.interest_amount) - paid.interest);
    }
  });
  repsToEndRes.data?.forEach((r: any) => {
    const memberId = r.loans?.members?.id;
    const m = memberId ? memberMap.get(memberId) : null;
    if (m) {
      m.principalRepaid += num(r.principal_paid);
      m.interestRepaid += num(r.interest_paid);
      m.repayments += num(r.principal_paid) + num(r.interest_paid);
    }
  });
  const memberRows = Array.from(memberMap.values()).sort((a, b) => String(a.membership_no).localeCompare(String(b.membership_no), undefined, { numeric: true }));
  const expectedMonthly = num(settingsRes.data?.monthly_contribution) || 500;

  return <>
    <div className="pagehead"><div><h1>Annual Financial Statement</h1><p className="muted">Financial statement from 1 January through {displayEnd}, with annual totals for every member.</p></div></div>

    <div className="panel" style={{ marginBottom: 18 }}>
      <form method="get" className="filterbar">
        <div className="field"><label>Statement Year</label><input name="year" type="number" defaultValue={year} /></div>
        <button className="btn primary" type="submit">View Statement</button>
        <PrintButton />
      </form>
    </div>

    <div className="statement-title">
      <h2>Annual Statement — January to December {year}</h2>
      <div>{settingsRes.data?.report_title || "Chyun Welfare Annual Statement"}</div>
    </div>

    <div className="cards">
      <div className="card"><div className="label">Opening Cash</div><div className="value">{money(openingCash)}</div></div>
      <div className="card"><div className="label">Closing Cash</div><div className="value blue">{money(closingCash)}</div></div>
      <div className="card"><div className="label">Outstanding Principal</div><div className="value red">{money(outstandingPrincipal)}</div></div>
      <div className="card"><div className="label">Interest Received</div><div className="value green">{money(interestReceived)}</div></div>
      <div className="card"><div className="label">Total Fund Value</div><div className="value green">{money(totalFundValue)}</div></div>
    </div>

    <div className="grid2">
      <div className="panel"><h3>Annual Money In</h3><table><tbody>
        <tr><td>Member Contributions</td><td className="num">{money(contributions)}</td></tr>
        <tr><td>Loan Repayments — Principal</td><td className="num">{money(principalRepaid)}</td></tr>
        <tr><td>Interest Received</td><td className="num">{money(interestReceived)}</td></tr>
        <tr><td>Other / Welfare Income</td><td className="num">{money(welfareIn)}</td></tr>
        <tr><td>Registration Fees</td><td className="num">{money(registrationTotal)}</td></tr>
        <tr className="totalrow"><td>Total Cash In</td><td className="num">{money(contributions + repayments + welfareIn + registrationCash)}</td></tr>
      </tbody></table></div>
      <div className="panel"><h3>Annual Money Out</h3><table><tbody>
        <tr><td>Loans Issued</td><td className="num">{money(loansIssued)}</td></tr>
        <tr><td>Contribution Refunds / Withdrawal Payouts</td><td className="num">{money(refunds)}</td></tr>
        <tr><td>Welfare / Other Outflow</td><td className="num">{money(welfareOut)}</td></tr>
        <tr className="totalrow"><td>Total Cash Out</td><td className="num">{money(loansIssued + welfareOut + refunds)}</td></tr>
      </tbody></table></div>
    </div>

    <div className="panel" style={{ marginTop: 18 }}><h3>Annual Fund Position — {year} Year End / Current Date</h3><div className="summarygrid">
      <div><span>Opening Cash</span><strong>{money(openingCash)}</strong></div>
      <div><span>Closing Cash</span><strong>{money(closingCash)}</strong></div>
      <div><span>Outstanding Principal</span><strong>{money(outstandingPrincipal)}</strong></div>
      <div><span>Outstanding Interest</span><strong>{money(outstandingInterest)}</strong></div>
      <div><span>Total Fund Value</span><strong>{money(totalFundValue)}</strong></div>
    </div><p className="reconcile"><strong>Cash reconciliation:</strong> {money(openingCash)} opening + {money(contributions + repayments + welfareIn + registrationCash)} cash in − {money(loansIssued + welfareOut + refunds)} cash out = <strong>{money(closingCash)} closing cash</strong>.</p></div>

    <div className="panel contribution-status-panel" style={{ marginTop: 18 }}>
      <div className="contribution-status-head"><div><h3>Annual Member Summary</h3><span>1 January to {displayEnd} — consolidated totals per member</span></div></div>
      <div className="tablewrap contribution-status-wrap"><table className="contribution-status-table"><thead><tr>
        <th>Member</th><th>Contribution Expected</th><th>Contribution Paid</th><th>Variance</th><th>Loans Issued</th><th>Principal Repaid</th><th>Interest Repaid</th><th>Total Repaid</th><th>Loan Balance Owed</th>
      </tr></thead><tbody>
        {memberRows.map((m: any) => {
          const joined = new Date(`${m.date_joined}T00:00:00`);
          const activeMonths = joined.getFullYear() < year ? 12 : joined.getFullYear() > year ? 0 : Math.max(0, 13 - (joined.getMonth() + 1));
          const expected = expectedMonthly * activeMonths;
          const variance = m.contributions - expected;
          const outstanding = m.outstandingPrincipal + m.outstandingInterest;
          return <tr key={m.id}>
            <td className="member-cell"><strong>{m.membership_no}</strong><span>{m.full_name}</span></td>
            <td className="num">{money(expected)}</td><td className="num">{money(m.contributions)}</td>
            <td className={`num ${variance < 0 ? "red" : variance > 0 ? "green" : ""}`}>{money(variance)}</td>
            <td className="num">{money(m.loans)}</td><td className="num">{money(m.principalRepaid)}</td><td className="num">{money(m.interestRepaid)}</td>
            <td className="num">{money(m.repayments)}</td><td className={`num ${outstanding > 0 ? "red" : "green"}`}>{money(outstanding)}</td>
          </tr>;
        })}
        {!memberRows.length && <tr><td colSpan={9} className="empty">No members found for this statement period.</td></tr>}
      </tbody></table></div>
    </div>

    <div className="panel transactions-panel" style={{ marginTop: 18 }}><h3>Transactions — {year} through {displayEnd}</h3><div className="reportsections">
      <div><h4>Contributions</h4><div className="tablewrap"><table><thead><tr><th>Date</th><th>Member</th><th>Reference</th><th>Amount</th></tr></thead><tbody>{contribRes.data?.length ? contribRes.data.map((r: any, i: number) => <tr key={i}><td>{r.payment_date}</td><td>{r.members?.membership_no} — {r.members?.full_name}</td><td>{r.reference || "-"}</td><td>{money(num(r.amount))}</td></tr>) : <tr><td colSpan={4} className="empty">No contributions.</td></tr>}</tbody></table></div></div>
      <div><h4>Loans Issued</h4><div className="tablewrap"><table><thead><tr><th>Date</th><th>Loan</th><th>Member</th><th>Principal</th><th>Interest</th></tr></thead><tbody>{loansRes.data?.length ? loansRes.data.map((r: any) => <tr key={r.id}><td>{r.issue_date}</td><td>{r.loan_no}</td><td>{r.members?.full_name}</td><td>{money(num(r.principal))}</td><td>{money(num(r.interest_amount))}</td></tr>) : <tr><td colSpan={5} className="empty">No loans issued.</td></tr>}</tbody></table></div></div>
      <div><h4>Loan Repayments</h4><div className="tablewrap"><table><thead><tr><th>Date</th><th>Loan / Member</th><th>Principal</th><th>Interest</th><th>Total</th></tr></thead><tbody>{repsRes.data?.length ? repsRes.data.map((r: any, i: number) => <tr key={i}><td>{r.payment_date}</td><td>{r.loans?.loan_no} — {r.loans?.members?.full_name}</td><td>{money(num(r.principal_paid))}</td><td>{money(num(r.interest_paid))}</td><td>{money(num(r.amount))}</td></tr>) : <tr><td colSpan={5} className="empty">No repayments.</td></tr>}</tbody></table></div></div>
      <div><h4>Contribution Refunds / Withdrawal Payouts</h4><div className="tablewrap"><table><thead><tr><th>Date</th><th>Member</th><th>Amount</th><th>Reason</th><th>Reference</th></tr></thead><tbody>{refundsRes.data?.length ? refundsRes.data.map((r: any, i: number) => <tr key={i}><td>{r.refund_date}</td><td>{r.members?.membership_no} — {r.members?.full_name}</td><td>{money(num(r.amount))}</td><td>{r.reason || "-"}</td><td>{r.reference || "-"}</td></tr>) : <tr><td colSpan={5} className="empty">No contribution refunds.</td></tr>}</tbody></table></div></div>
      <div><h4>Welfare / Other Fund Movements</h4><div className="tablewrap"><table><thead><tr><th>Date</th><th>Member</th><th>Category</th><th>In</th><th>Out</th></tr></thead><tbody>{welfareRes.data?.length ? welfareRes.data.map((r: any, i: number) => <tr key={i}><td>{r.entry_date}</td><td>{r.members?.full_name || "-"}</td><td>{r.category}</td><td>{money(num(r.money_in))}</td><td>{money(num(r.money_out))}</td></tr>) : <tr><td colSpan={5} className="empty">No welfare entries.</td></tr>}</tbody></table></div></div>
    </div></div>
  </>;
}
