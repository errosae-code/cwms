"use server";
import {createClient} from "@/lib/supabase/server";import {redirect} from "next/navigation";
export async function login(fd:FormData){
 const s=await createClient();const email=String(fd.get("email")||"");const password=String(fd.get("password")||"");
 const {error}=await s.auth.signInWithPassword({email,password});
 if(error) redirect("/login?error=Invalid%20email%20or%20password");
 redirect("/app");
}
