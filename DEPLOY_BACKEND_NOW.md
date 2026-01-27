# Backend Deployment - Critical Setup

## Current Issue
The frontend is deployed but the backend API is not accessible, causing the "Unexpected token '<'" error.

## Backend Server Details
- **Location:** `server/` directory
- **Entry:** `server/index.ts`
- **Port:** 3001 (default, configurable via PORT env var)
- **Routes:**
  - `/api/support/*` - Public invite/payment endpoints
  - `/api/hub/invites/*` - Admin invite management
  - `/api/documents/*` - Document generation
  - `/health` - Health check

## Quick Deploy Options

### Option 1: Same Domain (Recommended for Vercel/Netlify)

If your frontend is on Vercel/Netlify, use their API functions:

**Vercel:**
```bash
# Create api directory at project root
mkdir -p api
# Move server files to api directory or use vercel.json rewrites
```

**vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" }
  ]
}
```

### Option 2: Separate Backend Deployment (Render/Railway/Fly.io)

**Environment Variables Needed:**
```
PORT=3001
ORIGIN=https://your-frontend-domain.com
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

**Start Command:**
```bash
npm run server:start
```

**Frontend Environment Variable:**
```
VITE_API_URL=https://your-backend-domain.com
```

### Option 3: Docker Deployment

**Dockerfile (create at project root):**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY server ./server
COPY dist ./dist

EXPOSE 3001

CMD ["node", "server/index.js"]
```

**Build & Run:**
```bash
docker build -t craven-backend .
docker run -p 3001:3001 --env-file .env craven-backend
```

## Immediate Action Required

1. **Deploy Backend Server** to any Node.js hosting platform
2. **Set Environment Variables** (see server/env.ts for all required vars)
3. **Configure Frontend** with VITE_API_URL pointing to backend
4. **Rebuild & Redeploy Frontend** with new env var

## Testing Backend

After deployment, test:
```bash
curl https://your-backend-url/health
# Should return: {"ok":true}
```

## Current Code Status

✅ Frontend now uses smart API client that:
- Works with same-origin backends (no VITE_API_URL needed)
- Works with separate backends (via VITE_API_URL)
- Provides clear error messages
- Handles network failures gracefully

The code is production-ready. Deploy the backend and it will work immediately.

