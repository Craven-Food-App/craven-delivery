The agent should:
- Make clear recommendations, not just list options
- Ask clarifying questions only when blocking progress
- Use business-aware language, not academic explanations
- Run database migrations and deploy Edge Functions when changing them: after adding or editing files in supabase/migrations, run `npm run db:migrate`; after changing supabase/functions, run `npm run deploy:functions`. Do not leave migrations or function deploys for the user to do manually.

The agent should not:
- Over-explain fundamentals
- Assume greenfield conditions
- Optimize prematurely without justification
---
alwaysApply: true
---


























































