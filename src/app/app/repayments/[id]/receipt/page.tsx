import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import { createClient } from "@/lib/supabase/server";

export const dynamic="force-dynamic";
export const revalidate=0;

const money=(n:number)=>`KES ${new Intl.NumberFormat("en-KE",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)}`;
const dateText=(v:unknown)=>v?new Date(`${String(v)}T00:00:00`).toLocaleDateString("en-KE",{day:"2-digit",month:"short",year:"numeric"}):"-";
const kenyaToday=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Nairobi",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());

export default async function RepaymentReceipt({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const s=await createClient();
  const {data:r}=await s.from("repayments").select("id,amount,interest_paid,principal_paid,payment_date,receipt_no,created_at,loans(loan_no,principal,interest_amount,due_date,members(full_name,membership_no))").eq("id",id).is("deleted_at",null).single();
  if(!r)return <><div className="pagehead"><div><h1>Receipt Not Found</h1><p className="muted">The repayment receipt could not be found.</p></div><Link href="/app/repayments" className="btn light">Back to Repayments</Link></div></>;
  const loan:any=r.loans||{};const member:any=loan.members||{};
  const {data:allReps}=await s.from("repayments").select("id,amount,interest_paid,principal_paid,payment_date,created_at").eq("loan_id",loan.id||"").is("deleted_at",null).order("payment_date",{ascending:true}).order("created_at",{ascending:true});
  const ordered=allReps||[];const idx=ordered.findIndex((x:any)=>x.id===r.id);const through=idx>=0?ordered.slice(0,idx+1):[r];
  const interestPaidThrough=through.reduce((a:number,x:any)=>a+Number(x.interest_paid||0),0);const principalPaidThrough=through.reduce((a:number,x:any)=>a+Number(x.principal_paid||0),0);
  const outstandingPrincipal=Math.max(0,Number(loan.principal||0)-principalPaidThrough);const outstandingInterest=Math.max(0,Number(loan.interest_amount||0)-interestPaidThrough);const today=kenyaToday();const dueStatus=outstandingPrincipal+outstandingInterest<=0?"cleared":String(loan.due_date||"")<today?"overdue":"active";
  return <div className="receipt-page">
    <div className="receipt-actions"><Link href="/app/repayments" className="btn light">← Repayments</Link><PrintButton label="Print / Save PDF"/></div>
    <div className="receipt-paper">
      <header className="receipt-header"><div><div className="receipt-brand">CHYUN WELFARE</div><div className="receipt-subtitle">Welfare Management System</div></div><div className="receipt-heading"><strong>REPAYMENT RECEIPT</strong><span>{r.receipt_no||"-"}</span></div></header>
      <div className="receipt-rule"/>
      <section className="receipt-meta">
        <div><span>Received From</span><strong>{member.full_name||"-"}</strong><small>{member.membership_no||"-"}</small></div>
        <div><span>Payment Date</span><strong>{dateText(r.payment_date)}</strong></div>
        <div><span>Loan No.</span><strong>{loan.loan_no||"-"}</strong></div>
        <div><span>Loan Due Date</span><strong>{dateText(loan.due_date)}</strong></div>
        <div><span>Loan Status</span><strong className="capitalize">{dueStatus}</strong></div>
      </section>
      <section className="receipt-amount"><span>AMOUNT RECEIVED</span><strong>{money(Number(r.amount||0))}</strong></section>
      <section className="receipt-table"><div className="receipt-row receipt-row-head"><span>Allocation</span><span>Amount</span></div><div className="receipt-row"><span>Interest Paid</span><strong>{money(Number(r.interest_paid||0))}</strong></div><div className="receipt-row"><span>Principal Paid</span><strong>{money(Number(r.principal_paid||0))}</strong></div><div className="receipt-row receipt-total"><span>Total Received</span><strong>{money(Number(r.amount||0))}</strong></div></section>
      <section className="receipt-balance"><h3>Loan Balance After This Payment</h3><div><span>Outstanding Principal</span><strong>{money(outstandingPrincipal)}</strong></div><div><span>Outstanding Interest</span><strong>{money(outstandingInterest)}</strong></div><div className="balance-total"><span>Total Outstanding</span><strong>{money(outstandingPrincipal+outstandingInterest)}</strong></div></section>
      <p className="receipt-note">This receipt confirms the repayment recorded against the above loan. The balance shown is the balance immediately after this payment, based on repayments recorded up to this receipt.</p>
      <footer className="receipt-footer"><span>Chyun Welfare Management System</span><span>Generated {new Date().toLocaleDateString("en-KE")}</span></footer>
    </div>
  </div>;
}
