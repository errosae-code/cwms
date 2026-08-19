import {login} from "./actions";
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){const p=await searchParams;return <div className="loginWrap">
<section className="loginHero"><h1>Chyun Welfare Management System</h1><p>Simple, accurate and transparent welfare management.</p></section>
<section className="loginSide"><form className="loginCard" action={login}><h2>Sign in</h2>{p.error&&<div className="notice">{p.error}</div>}
<div className="field"><label>Email</label><input name="email" type="email" required/></div><div className="field"><label>Password</label><input name="password" type="password" required/></div>
<button className="btn primary" style={{width:"100%"}}>Sign In</button></form></section></div>}
