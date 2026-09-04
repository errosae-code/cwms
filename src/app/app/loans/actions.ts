"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const S = z.object({ member_id:z.string().uuid(), principal:z.coerce.number().positive(), issue_date:z.string().min(1), due_date:z.string().min(1) });

async function context(){
  const s=await createClient();
  const {data:{user}}=await s.auth.getUser();
  if(!user) throw new Error("Not authenticated");
  const {data:profile}=await s.from("profiles").select("organization_id").eq("id",user.id).single();
  if(!profile) throw new Error("Profile missing");
  return {s,user,profile};
}

const normalizedRate=(raw:unknown)=>{const n=Number(raw||0.10);return n>1?n/100:n;};
const kenyaToday=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Nairobi",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const statusFor=(principal:number,interest:number,dueDate:string)=>principal<=0&&interest<=0?"cleared":dueDate<kenyaToday()?"overdue":"active";
const validateDates=(issueDate:string,dueDate:string)=>{if(dueDate<issueDate)throw new Error("Due date cannot be earlier than the issue date.");};
function refresh(){revalidatePath("/app/loans");revalidatePath("/app/repayments");revalidatePath("/app/reports");revalidatePath("/app/member-statement");revalidatePath("/app");}

export async function issueLoan(fd:FormData){
  const p=S.parse({member_id:fd.get("member_id"),principal:fd.get("principal"),issue_date:fd.get("issue_date"),due_date:fd.get("due_date")});
  validateDates(p.issue_date,p.due_date);
  const {s,user,profile}=await context();
  const {data:settings}=await s.from("settings").select("loan_interest_rate").eq("organization_id",profile.organization_id).single();
  const rate=normalizedRate(settings?.loan_interest_rate);const interest=p.principal*rate;const total=p.principal+interest;
  const {data:item,error}=await s.from("loans").insert({organization_id:profile.organization_id,member_id:p.member_id,loan_no:"",principal:p.principal,interest_rate:rate,interest_amount:interest,total_due:total,outstanding_principal:p.principal,outstanding_interest:interest,issue_date:p.issue_date,due_date:p.due_date,status:statusFor(p.principal,interest,p.due_date),created_by:user.id}).select("id,loan_no").single();
  if(error)throw new Error(error.message);
  await s.from("audit_logs").insert({organization_id:profile.organization_id,user_id:user.id,action:"loan.created",module:"loans",entity_id:item.id,description:`${item.loan_no}: KES ${p.principal}`});
  refresh();
}

export async function updateLoan(fd:FormData){
  const id=String(fd.get("id")||"");if(!id)throw new Error("Loan missing");
  const p=S.parse({member_id:fd.get("member_id"),principal:fd.get("principal"),issue_date:fd.get("issue_date"),due_date:fd.get("due_date")});
  validateDates(p.issue_date,p.due_date);
  const {s,user,profile}=await context();
  const {data:loan}=await s.from("loans").select("loan_no,interest_rate").eq("id",id).eq("organization_id",profile.organization_id).single();
  if(!loan)throw new Error("Loan not found");
  const {data:paid}=await s.from("repayments").select("principal_paid,interest_paid").eq("loan_id",id).is("deleted_at",null);
  const principalPaid=(paid||[]).reduce((a:any,r:any)=>a+Number(r.principal_paid||0),0);const interestPaid=(paid||[]).reduce((a:any,r:any)=>a+Number(r.interest_paid||0),0);
  const rate=normalizedRate(loan.interest_rate);const interest=p.principal*rate;const outPrincipal=Math.max(0,p.principal-principalPaid);const outInterest=Math.max(0,interest-interestPaid);
  const {error}=await s.from("loans").update({member_id:p.member_id,principal:p.principal,interest_rate:rate,interest_amount:interest,total_due:p.principal+interest,outstanding_principal:outPrincipal,outstanding_interest:outInterest,issue_date:p.issue_date,due_date:p.due_date,status:statusFor(outPrincipal,outInterest,p.due_date),updated_at:new Date().toISOString()}).eq("id",id).eq("organization_id",profile.organization_id).is("deleted_at",null);
  if(error)throw new Error(error.message);
  await s.from("audit_logs").insert({organization_id:profile.organization_id,user_id:user.id,action:"loan.updated",module:"loans",entity_id:id,description:`Updated ${loan.loan_no}: principal KES ${p.principal}`});refresh();
}

export async function deleteLoan(fd:FormData){
  const id=String(fd.get("id")||"");if(!id)throw new Error("Loan missing");
  const {s,user,profile}=await context();
  const {count}=await s.from("repayments").select("id",{count:"exact",head:true}).eq("loan_id",id).is("deleted_at",null);
  if((count||0)>0)throw new Error("This loan has repayments and cannot be deleted. Correct the repayments first or keep the loan for audit history.");
  const {data:loan}=await s.from("loans").select("loan_no").eq("id",id).eq("organization_id",profile.organization_id).single();
  const {error}=await s.from("loans").update({deleted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id).eq("organization_id",profile.organization_id).is("deleted_at",null);
  if(error)throw new Error(error.message);
  await s.from("audit_logs").insert({organization_id:profile.organization_id,user_id:user.id,action:"loan.deleted",module:"loans",entity_id:id,description:`Deleted ${loan?.loan_no||"loan"}`});refresh();
}
