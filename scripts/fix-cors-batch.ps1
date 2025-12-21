# PowerShell script to batch-fix CORS in edge functions
# Run with: pwsh scripts/fix-cors-batch.ps1

$functionsDir = "supabase\functions"
$sharedCorsImport = 'import { getCorsHeaders } from "../_shared/cors.ts";'

# Pattern 1: const corsHeaders = { 'Access-Control-Allow-Origin': '*', ... }
$pattern1 = "const corsHeaders = \{\s*['\`"]Access-Control-Allow-Origin['\`"]:\s*['\`"]\*['\`"],\s*['\`"]Access-Control-Allow-Headers['\`"]:[^\}]+\};"

# Pattern 2: const corsHeaders = { "Access-Control-Allow-Origin": "*", ... }
$pattern2 = 'const corsHeaders = \{\s*"Access-Control-Allow-Origin":\s*"\*",\s*"Access-Control-Allow-Headers":[^\}]+\};'

# Get all index.ts files
$files = Get-ChildItem -Path $functionsDir -Recurse -Filter "index.ts" | Where-Object { $_.FullName -notmatch "_shared" }

$fixed = 0
$skipped = 0
$errors = 0

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw
        $originalContent = $content
        
        # Skip if already has getCorsHeaders
        if ($content -match "getCorsHeaders") {
            Write-Host "✓ Skipped (already fixed): $($file.Directory.Name)" -ForegroundColor Green
            $skipped++
            continue
        }
        
        # Skip if no wildcard CORS
        if ($content -notmatch "Access-Control-Allow-Origin['\`"]?\s*:\s*['\`"]?\*") {
            Write-Host "✓ Skipped (no wildcard): $($file.Directory.Name)" -ForegroundColor Gray
            $skipped++
            continue
        }
        
        # Add import after other imports
        if ($content -match "(import\s+\{[^\}]+\}\s+from\s+['\`"]https://esm\.sh/@supabase/supabase-js[^\n]+)") {
            $content = $content -replace "(import\s+\{[^\}]+\}\s+from\s+['\`"]https://esm\.sh/@supabase/supabase-js[^\n]+)", "`$1`n$sharedCorsImport"
        } elseif ($content -match "(import\s+\{[^\}]+\}\s+from\s+['\`"]https://deno\.land/std[^\n]+)") {
            $content = $content -replace "(import\s+\{[^\}]+\}\s+from\s+['\`"]https://deno\.land/std[^\n]+)", "`$1`n$sharedCorsImport"
        }
        
        # Remove old CORS definition
        $content = $content -replace $pattern1, ""
        $content = $content -replace $pattern2, ""
        
        # Add dynamic CORS at start of serve function
        $content = $content -replace "(serve\(async\s*\(req\)\s*=>\s*\{)", "`$1`n  // SECURITY: Get secure CORS headers based on request origin`n  const corsHeaders = getCorsHeaders(req.headers.get('origin'));`n"
        
        # Only save if content changed
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            Write-Host "✅ Fixed: $($file.Directory.Name)" -ForegroundColor Cyan
            $fixed++
        } else {
            Write-Host "⚠ No changes: $($file.Directory.Name)" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "❌ Error: $($file.Directory.Name) - $_" -ForegroundColor Red
        $errors++
    }
}

Write-Host "`n📊 Summary:" -ForegroundColor White
Write-Host "  Fixed: $fixed" -ForegroundColor Cyan
Write-Host "  Skipped: $skipped" -ForegroundColor Green
Write-Host "  Errors: $errors" -ForegroundColor Red
Write-Host "  Total: $($files.Count)" -ForegroundColor White

