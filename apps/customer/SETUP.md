# Customer App Setup Guide

## Environment Variables

Create a `.env` file in `apps/customer/` with the following:

```bash
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE

# Optional: Supabase (if different from root)
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Getting Your Stripe Key

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Publishable key** (starts with `pk_live_`)
3. Add it to `.env` file

## Building the App

```bash
cd apps/customer
npm install
npm run build
npm run sync
```

## Notes

- The app uses the same Supabase instance as the main app
- Assets are in `apps/customer/public/`
- Build output goes to `apps/customer/dist/`

