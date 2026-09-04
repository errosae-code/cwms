"use client";

const formatMoney=(n:number)=>`KES ${new Intl.NumberFormat("en-KE",{maximumFractionDigits:2}).format(n)}`;
const normalizeKenyaPhone=(raw:string)=>{const digits=String(raw||"").replace(/\D/g,"");if(digits.startsWith("254"))return digits;if(digits.startsWith("0"))return `254${digits.slice(1)}`;return digits;};

export default function OverdueReminderButtons({name,memberNo,phone,loanNo,dueDate,daysOverdue,principal,interest,total}:{name:string;memberNo:string;phone:string;loanNo:string;dueDate:string;daysOverdue:number;principal:number;interest:number;total:number}){
  const message=`CHYUN WELFARE – LOAN REMINDER\n\nDear ${name}, this is a reminder that your loan ${loanNo} was due on ${dueDate} and is currently ${daysOverdue} day${daysOverdue===1?"":"s"} overdue.\n\nOutstanding Principal: ${formatMoney(principal)}\nOutstanding Interest: ${formatMoney(interest)}\nTotal Outstanding: ${formatMoney(total)}\n\nKindly make the required repayment at your earliest convenience. If you have already made the payment, please disregard this reminder or share the payment details with the Welfare office for updating.\n\nCHYUN WELFARE\nWelfare Management System`;
  const encoded=encodeURIComponent(message);const wa=normalizeKenyaPhone(phone);
  const copy=async()=>{try{await navigator.clipboard.writeText(message);window.alert("Reminder message copied.");}catch{window.prompt("Copy the reminder message:",message)}};
  return <div className="reminder-actions"><button type="button" className="btn reminder-copy" onClick={copy}>Copy</button>{wa?<a className="btn reminder-whatsapp" href={`https://wa.me/${wa}?text=${encoded}`} target="_blank" rel="noreferrer">WhatsApp</a>:<button type="button" className="btn light" disabled title="Add a phone number for this member">WhatsApp</button>}{phone?<a className="btn reminder-sms" href={`sms:${phone}?body=${encoded}`}>SMS</a>:<button type="button" className="btn light" disabled title="Add a phone number for this member">SMS</button>}</div>;
}
