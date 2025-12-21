#!/bin/bash

# Security Headers Setup Script
# This script creates/updates vercel.json with security headers

echo "🔒 Setting up security headers..."
echo ""

# Check if vercel.json exists
if [ -f "vercel.json" ]; then
    echo "⚠️  vercel.json already exists"
    echo "Creating backup: vercel.json.backup"
    cp vercel.json vercel.json.backup
fi

# Create vercel.json with security headers
cat > vercel.json << 'EOF'
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(self)"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://api.mapbox.com https://*.supabase.co; style-src 'self' 'unsafe-inline' https://api.mapbox.com https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.mapbox.com wss://*.supabase.co; frame-src https://js.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self';"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
EOF

echo "✅ vercel.json created with security headers"
echo ""
echo "📋 Headers configured:"
echo "  ✅ X-Content-Type-Options: nosniff"
echo "  ✅ X-Frame-Options: DENY"
echo "  ✅ X-XSS-Protection: enabled"
echo "  ✅ Referrer-Policy: strict-origin-when-cross-origin"
echo "  ✅ Permissions-Policy: restricted"
echo "  ✅ Strict-Transport-Security: HSTS enabled"
echo "  ✅ Content-Security-Policy: configured"
echo ""
echo "🚀 Next steps:"
echo "1. Review vercel.json"
echo "2. Commit and push to deploy"
echo "3. Test headers: curl -I https://cravenusa.com"
echo "4. Verify at: https://securityheaders.com"
echo ""

