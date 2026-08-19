import {createServerClient} from "@supabase/ssr";
import {NextResponse,type NextRequest} from "next/server";
export async function middleware(request:NextRequest){
 let response=NextResponse.next({request});
 const s=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{
  cookies:{getAll(){return request.cookies.getAll()},setAll(items){items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,options))}}
 });
 const {data:{user}}=await s.auth.getUser();
 if(!user&&request.nextUrl.pathname.startsWith("/app")){const u=request.nextUrl.clone();u.pathname="/login";return NextResponse.redirect(u)}
 if(user&&request.nextUrl.pathname==="/login"){const u=request.nextUrl.clone();u.pathname="/app";return NextResponse.redirect(u)}
 return response;
}
export const config={matcher:["/app/:path*","/login"]};
