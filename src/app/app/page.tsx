import {createClient} from "@/lib/supabase/server";
const money=(n:number)=>`KES ${new Intl.NumberFormat("en-KE").format(n)}`;
export default async function Home(){const s=await createClient();
 const [c,m,l,w,settings,reps]=await Promise.all([
  s.from("contributions").select("amount").is("deleted_at",null),
  s.from("members").select("id",{count:"exact",head:true}).eq("status","active").is("deleted_at",null),
  s.from("loans").select("principal,outstanding_principal,outstanding_interest,status").is("deleted_at",null),
  s.from("welfare_entries").select("money_in,money_out").is("deleted_at",null),
  s.from("settings").select("opening_cash_balance").limit(1).maybeSingle(),
  s.from("repayments").select("amount").is("deleted_at",null)
 ]);
 const contributions=c.data?.reduce((a,r)=>a+Number(r.amount||0),0)||0;
 const loansIssued=l.data?.reduce((a,r)=>a+Number(r.principal||0),0)||0;
 const principal=l.data?.reduce((a,r)=>a+Number(r.outstanding_principal||0),0)||0;
 const interest=l.data?.reduce((a,r)=>a+Number(r.outstanding_interest||0),0)||0;
 const moneyIn=w.data?.reduce((a,r)=>a+Number(r.money_in||0),0)||0; const moneyOut=w.data?.reduce((a,r)=>a+Number(r.money_out||0),0)||0;
 const repayments=reps.data?.reduce((a,r)=>a+Number(r.amount||0),0)||0; const opening=Number(settings.data?.opening_cash_balance||0);
 const currentCash=opening+contributions+moneyIn+repayments-loansIssued-moneyOut; const fund=currentCash+principal;
 const activeLoans=l.data?.filter(x=>x.status==="active").length||0;const overdue=l.data?.filter(x=>x.status==="overdue").length||0;
 return <><h1>Home</h1><p style={{color:"#6B7280"}}>Current welfare position.</p><div className="cards">
 <div className="card"><div className="label">Current Cash</div><div className="value blue">{money(currentCash)}</div></div>
 <div className="card"><div className="label">Total Fund Value</div><div className="value green">{money(fund)}</div></div>
 <div className="card"><div className="label">Contributions</div><div className="value blue">{money(contributions)}</div></div>
 <div className="card"><div className="label">Outstanding Principal</div><div className="value red">{money(principal)}</div></div></div>
 <div className="cards"><div className="card"><div className="label">Outstanding Interest</div><div className="value red">{money(interest)}</div></div><div className="card"><div className="label">Active Members</div><div className="value">{m.count||0}</div></div><div className="card"><div className="label">Active Loans</div><div className="value">{activeLoans}</div></div><div className="card"><div className="label">Overdue Loans</div><div className="value">{overdue}</div></div></div></>}
