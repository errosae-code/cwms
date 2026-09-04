import {login} from "./actions";

export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){
  const p=await searchParams;
  return <div className="loginWrap" style={{minHeight:"100vh",display:"grid",gridTemplateColumns:"1.1fr .9fr",background:"#F4F7FB"}}>
    <section className="loginHero" style={{background:"linear-gradient(135deg,#102A43,#1F4D78)",color:"white",padding:"64px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
      <div style={{maxWidth:620}}>
        <div style={{fontSize:14,fontWeight:800,letterSpacing:2,textTransform:"uppercase",opacity:.8,marginBottom:18}}>CWMS</div>
        <h1 style={{fontSize:44,lineHeight:1.1,margin:"0 0 16px",fontWeight:900}}>Chyun Welfare<br/>Management System</h1>
        <p style={{fontSize:18,lineHeight:1.6,color:"#DCE7F3",margin:0,maxWidth:500}}>Simple, accurate and transparent welfare management.</p>
        <div style={{marginTop:38,display:"flex",gap:12,flexWrap:"wrap"}}>
          <span style={{padding:"8px 12px",border:"1px solid rgba(255,255,255,.25)",borderRadius:999,fontSize:12}}>Member Management</span>
          <span style={{padding:"8px 12px",border:"1px solid rgba(255,255,255,.25)",borderRadius:999,fontSize:12}}>Loans & Repayments</span>
          <span style={{padding:"8px 12px",border:"1px solid rgba(255,255,255,.25)",borderRadius:999,fontSize:12}}>Statements & Receipts</span>
        </div>
      </div>
    </section>
    <section className="loginSide" style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"40px"}}>
      <form className="loginCard" action={login} style={{width:"100%",maxWidth:430,background:"#fff",border:"1px solid #E3E8EF",borderRadius:16,padding:32,boxShadow:"0 18px 50px rgba(15,23,42,.10)"}}>
        <div style={{marginBottom:26}}>
          <div style={{fontSize:12,fontWeight:800,letterSpacing:1,textTransform:"uppercase",color:"#2F75B5",marginBottom:7}}>Secure Access</div>
          <h2 style={{margin:0,fontSize:28,color:"#102A43"}}>Welcome back</h2>
          <p style={{margin:"7px 0 0",fontSize:13,color:"#6B7280"}}>Sign in to your welfare management account.</p>
        </div>
        {p.error&&<div className="notice">{p.error}</div>}
        <div className="field" style={{marginBottom:16}}><label>Email</label><input name="email" type="email" required/></div>
        <div className="field" style={{marginBottom:20}}><label>Password</label><input name="password" type="password" required/></div>
        <button className="btn primary" style={{width:"100%",padding:"12px 16px",fontSize:14}}>Sign In</button>
        <div style={{marginTop:20,paddingTop:16,borderTop:"1px solid #E3E8EF",textAlign:"center",fontSize:11,color:"#6B7280"}}>Chyun Welfare Management System</div>
      </form>
    </section>
  </div>
}