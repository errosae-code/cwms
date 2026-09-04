"use client";

const formatMoney=(n:number)=>`KES ${new Intl.NumberFormat("en-KE",{maximumFractionDigits:2}).format(n)}`;
const normalizeKenyaPhone=(raw:string)=>{const digits=String(raw||"").replace(/\D/g,"");if(digits.startsWith("254"))return digits;if(digits.startsWith("0"))return `254${digits.slice(1)}`;return digits;};

export default function OverdueReminderButtons({name,phone,loanNo,dueDate,daysOverdue,principal,interest,total}:{name:string;phone:string;loanNo:string;dueDate:string;daysOverdue:number;principal:number;interest:number;total:number}){
  const message=`CHYUN WELFARE – LOAN REMINDER\n\nDear ${name}, this is a reminder that your loan ${loanNo} was due on ${dueDate} and is currently ${daysOverdue} day${daysOverdue===1?"":"s"} overdue.\n\nOutstanding Principal: ${formatMoney(principal)}\nOutstanding Interest: ${formatMoney(interest)}\nTotal Outstanding: ${formatMoney(total)}\n\nKindly make the required repayment at your earliest convenience. If you have already made the payment, please disregard this reminder or share the payment details with the Welfare office for updating.\n\nCHYUN WELFARE\nWelfare Management System`;
  const encoded=encodeURIComponent(message);const wa=normalizeKenyaPhone(phone);
  const copy=async()=>{try{await navigator.clipboard.writeText(message);window.alert("Reminder message copied.");}catch{window.prompt("Copy the reminder message:",message)}};
  const base={borderRadius:6,padding:"6px 9px",fontSize:10,fontWeight:800,textDecoration:"none" as const,display:"inline-block"};
  return <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}><button type="button" className="btn" style={{...base,background:"#EEF2F7",color:"#334155"}} onClick={copy}>Copy</button>{wa?<a style={{...base,background:"#DCFCE7",color:"#166534"}} href={`https://wa.me/${wa}?text=${encoded}`} target="_blank" rel="noreferrer">WhatsApp</a>:<button type="button" className="btn" style={{...base,background:"#F1F5F9",color:"#94A3B8"}} disabled title="Add a phone number for this member">WhatsApp</button>}{phone?<a style={{...base,background:"#DBEAFE",color:"#1D4ED8"}} href={`sms:${phone}?body=${encoded}`}>SMS</a>:<button type="button" className="btn" style={{...base,background:"#F1F5F9",color:"#94A3B8"}} disabled title="Add a phone number for this member">SMS</button>}</div>;
}
