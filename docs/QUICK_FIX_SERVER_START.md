# Quick Fix: Server Won't Start

## Issue
Server on port 3001 is not starting, likely due to missing `SUPABASE_SERVICE_ROLE_KEY`.

## Solution

1. **Check if .env file has the key:**
   ```bash
   # In PowerShell
   Get-Content .env | Select-String "SUPABASE_SERVICE_ROLE_KEY"
   ```

2. **If missing, add it to .env:**
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

3. **Get the key from Supabase:**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Settings → API
   - Copy the **service_role** key (⚠️ Keep secret!)

4. **Restart server:**
   ```bash
   npm run dev:server
   ```

## Alternative: Start Server Manually

If the background process isn't working, open a new terminal and run:

```bash
npm run dev:server
```

This will show you any error messages directly.

## Check Server Status

```bash
# Test if server is running
curl http://localhost:3001/health
```

Expected response: `{"ok":true}`










