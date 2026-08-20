# CWMS — Chyun Welfare Management System

GitHub-ready application source.

## Included
- Secure Supabase login
- Home dashboard
- Members
- Contributions
- Loans
- Repayments with interest-first allocation
- Welfare entries
- Settings
- Audit log
- Report summary

## Important
Do NOT commit `.env.local` to GitHub.

Vercel environment variables required:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

## Current Chyun rules
- Registration fee: KES 1,500
- Monthly contribution: KES 3,000
- Loan interest: 10%
- Repayment period: 3 months
- Total Fund Value = Current Cash + Outstanding Principal

## v0.3 reporting and member management upgrade
- Members can be searched, edited, deactivated, reactivated or marked withdrawn without deleting financial history.
- Monthly Statement supports month/year selection, opening/closing cash, contributions, loans, repayments split between principal and interest, welfare movements, outstanding balances, Total Fund Value and member contribution status.
- Member Statement shows Jan-Dec contribution status plus full loan, repayment and welfare history.
- Reports and statements support browser Print / Save PDF.
- Contribution months are displayed by name instead of numbers.
