import Link from "next/link";
export default function Sidebar(){return <aside className="sidebar"><div className="brand">CWMS</div><div className="subbrand">Chyun Welfare Management System</div><nav className="nav">
<Link href="/app">🏠 Home</Link><Link href="/app/members">👥 Members</Link><Link href="/app/contributions">💰 Contributions</Link><Link href="/app/loans">🏦 Loans</Link><Link href="/app/repayments">💳 Repayments</Link><Link href="/app/welfare">❤️ Welfare</Link><Link href="/app/reports">📈 Monthly Statement</Link><Link href="/app/member-statement">📄 Member Statement</Link><Link href="/app/settings">⚙️ Settings</Link><Link href="/app/audit">🔒 Audit Log</Link>
</nav></aside>}
