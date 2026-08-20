import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addMember } from "./actions";

export default async function Members({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; error?: string }> }) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const status = params.status || "all";
  const s = await createClient();

  let query = s.from("members").select("*").is("deleted_at", null).order("full_name", { ascending: true });
  if (status !== "all") query = query.eq("status", status);
  if (q) { const safeQ = q.replace(/[,%()]/g, " "); query = query.or(`full_name.ilike.%${safeQ}%,membership_no.ilike.%${safeQ}%,phone.ilike.%${safeQ}%`); }
  const { data: rows } = await query;

  return <>
    <div className="pagehead"><div><h1>Members</h1><p className="muted">Add, search, edit or deactivate members without losing their financial history.</p></div><a className="btn primary" href="#add-member">+ Add New Member</a></div>
    {params.error && <div className="notice">{decodeURIComponent(params.error)}</div>}

    <div className="panel" style={{ marginBottom: 18 }}>
      <form method="get" className="filterbar">
        <div className="field grow"><label>Search member</label><input name="q" defaultValue={q} placeholder="Name, member no. or phone" /></div>
        <div className="field"><label>Status</label><select name="status" defaultValue={status}><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="withdrawn">Withdrawn</option></select></div>
        <button className="btn light" type="submit">Search</button>
        <Link className="btn light" href="/app/members">Clear</Link>
      </form>
    </div>

    <div className="panel" style={{ marginBottom: 18 }}>
      <div className="tablewrap"><table><thead><tr><th>No.</th><th>Name</th><th>Phone</th><th>Joined</th><th>Status</th><th>Registration</th><th></th></tr></thead><tbody>
        {rows?.length ? rows.map((r: any) => <tr key={r.id}><td>{r.membership_no}</td><td><strong>{r.full_name}</strong></td><td>{r.phone || "-"}</td><td>{r.date_joined}</td><td><span className={`badge ${r.status}`}>{r.status}</span></td><td>KES {Number(r.registration_paid).toLocaleString()}</td><td><Link className="textlink" href={`/app/members/${r.id}`}>View / Edit</Link></td></tr>) : <tr><td colSpan={7} className="empty">No members found.</td></tr>}
      </tbody></table></div>
    </div>

    <div className="panel" id="add-member"><h3>Add New Member</h3><form action={addMember}><div className="formgrid">
      <div className="field"><label>Full Name</label><input name="full_name" required /></div>
      <div className="field"><label>Phone</label><input name="phone" /></div>
      <div className="field"><label>National ID</label><input name="national_id" /></div>
      <div className="field"><label>Date Joined</label><input name="date_joined" type="date" /></div>
      <div className="field"><label>Registration Paid (KES)</label><input name="registration_paid" type="number" min="0" step="0.01" defaultValue="0" /></div>
    </div><button className="btn success" style={{ marginTop: 14 }}>Save Member</button></form></div>
  </>;
}
