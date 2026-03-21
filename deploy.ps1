# VisualWall Deployment Script
# Usage: .\deploy.ps1
# Run from the root of the giet workspace

# ── MongoDB URI ───────────────────────────────────────────────────────────────
$MONGODB_URI = "mongodb+srv://dragonwarrior:IamBatman%40001@cluster0.mkrp1zc.mongodb.net/?appName=Cluster0"

# ── Helper: set a Vercel env var via temp file (avoids PowerShell pipe issues) ─
function Set-VercelEnv {
    param([string]$Key, [string]$Value, [string]$Dir)
    Push-Location $Dir
    try {
        Write-Host "  [env] $Key" -ForegroundColor Cyan
        $tmp = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllText($tmp, $Value, [System.Text.Encoding]::UTF8)
        cmd /c "vercel env add $Key production --force < `"$tmp`"" 2>&1 | Out-Null
        Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    } finally {
        Pop-Location
    }
}

# ── Helper: deploy a service ──────────────────────────────────────────────────
function Deploy-Service {
    param([string]$Dir)
    Push-Location $Dir
    cmd /c "vercel --prod" 2>&1
    Pop-Location
}

# ── 1. Demo Bank — only MONGODB_URI ──────────────────────────────────────────
Write-Host "`n==> Demo Bank" -ForegroundColor Yellow
$demoBankDir = Join-Path $PSScriptRoot "demo-bank"
Set-VercelEnv "MONGODB_URI" $MONGODB_URI $demoBankDir
Deploy-Service $demoBankDir

# ── 2. Demo Ecommerce — only MONGODB_URI ─────────────────────────────────────
Write-Host "`n==> Demo Ecommerce" -ForegroundColor Yellow
$demoShopDir = Join-Path $PSScriptRoot "demo-ecommerce"
Set-VercelEnv "MONGODB_URI" $MONGODB_URI $demoShopDir
Deploy-Service $demoShopDir

# ── 3. Test Site — only MONGODB_URI ──────────────────────────────────────────
Write-Host "`n==> Test Site" -ForegroundColor Yellow
$testSiteDir = Join-Path $PSScriptRoot "test-site"
Set-VercelEnv "MONGODB_URI" $MONGODB_URI $testSiteDir
Deploy-Service $testSiteDir
Write-Host "`n✅ Done — MONGODB_URI set and all 3 services redeployed." -ForegroundColor Green