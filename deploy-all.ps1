# =============================================================================
#  deploy-all.ps1 - Automated Vercel deploy for all 5 services
#  Flow: deploy first (links project), set env vars, redeploy
#  Pre-req: vercel CLI logged in (run: vercel whoami)
# =============================================================================

# ---------------------------------------------------------------------------
# SECRETS - auto-populated from your local .env files
# ---------------------------------------------------------------------------
$MONGODB_URI             = "mongodb+srv://dragonwarrior:IamBatman%40001@cluster0.mkrp1zc.mongodb.net/?appName=Cluster0"
$TOKEN_SECRET            = "4f9b2c8a1d3e7f6b5a4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2"
$PARTNER_API_KEYS        = "hdfc_bank:sk_live_vps_99218844,shopmart:sk_test_vps_86b9f397ae18e0817d79cedb7c062904,axis_bank:sk_test_vps_493bad0797dfebbf97e0ae300623ce2c"
$DEMO_BANK_COOKIE_SECRET = "demobank-prod-cookie-secret-a1b2c3d4e5f6g7h8"
$DEMO_SHOP_COOKIE_SECRET = "demoshop-prod-cookie-secret-z9y8x7w6v5u4t3s2"
$TEST_COOKIE_SECRET      = "testsite-prod-cookie-secret-r1q2p3o4n5m6l7k8"
$APIKEY_BANK             = "sk_live_vps_99218844"
$APIKEY_SHOP             = "sk_test_vps_86b9f397ae18e0817d79cedb7c062904"
$APIKEY_TEST             = "sk_test_vps_493bad0797dfebbf97e0ae300623ce2c"
$PARTNER_ID_BANK         = "hdfc_bank"
$PARTNER_ID_SHOP         = "shopmart"
$PARTNER_ID_TEST         = "axis_bank"

$ROOT = "C:\Users\somes\Desktop\hackthon\giet"

# ---------------------------------------------------------------------------
# HELPER: deploy a project (removes stale .vercel link, then deploys)
# Returns the production URL string
# ---------------------------------------------------------------------------
function Invoke-Deploy {
    param([string]$Dir)
    $name = Split-Path $Dir -Leaf
    Write-Host ""
    Write-Host "====  Deploying: $name  ====" -ForegroundColor Cyan
    Set-Location $Dir
    if (Test-Path ".vercel") { Remove-Item ".vercel" -Recurse -Force }
    $raw = & vercel deploy --prod --yes 2>&1
    $raw | ForEach-Object { Write-Host "  $_" }
    $url = ""
    foreach ($line in $raw) {
        $str = "$line"
        if ($str -match "(https://[^\s]+\.vercel\.app)") {
            $url = $Matches[1]
        }
    }
    Write-Host "  URL: $url" -ForegroundColor Green
    return $url
}

# ---------------------------------------------------------------------------
# HELPER: set a single env var on the currently-linked vercel project
# Must be called after Invoke-Deploy (so .vercel exists in current dir)
# ---------------------------------------------------------------------------
function Set-VEnv {
    param([string]$Key, [string]$Value)
    Write-Host "    $Key" -NoNewline
    & vercel env rm $Key production --yes 2>&1 | Out-Null
    if ($Value -ne "") {
        $tmp = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllText($tmp, $Value, [System.Text.Encoding]::UTF8)
        Get-Content $tmp | & vercel env add $Key production 2>&1 | Out-Null
        Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    }
    Write-Host " [ok]"
}

# ---------------------------------------------------------------------------
# STEP 1 - Initial deploy of backend (no env yet)
# ---------------------------------------------------------------------------
$BACKEND_URL = Invoke-Deploy -Dir "$ROOT\backend"
if (!$BACKEND_URL) { Write-Error "Backend deploy failed"; exit 1 }
$BACKEND_API = "$BACKEND_URL/api"

# ---------------------------------------------------------------------------
# STEP 2 - Initial deploy of client (no env yet)
# ---------------------------------------------------------------------------
$CLIENT_URL = Invoke-Deploy -Dir "$ROOT\client"
if (!$CLIENT_URL) { Write-Error "Client deploy failed"; exit 1 }

# ---------------------------------------------------------------------------
# STEP 3 - Initial deploy of demo-bank (no env yet)
# ---------------------------------------------------------------------------
$DEMOBANK_URL = Invoke-Deploy -Dir "$ROOT\demo-bank"
if (!$DEMOBANK_URL) { Write-Error "demo-bank deploy failed"; exit 1 }

# ---------------------------------------------------------------------------
# STEP 4 - Initial deploy of demo-ecommerce (no env yet)
# ---------------------------------------------------------------------------
$DEMOSHOP_URL = Invoke-Deploy -Dir "$ROOT\demo-ecommerce"
if (!$DEMOSHOP_URL) { Write-Error "demo-ecommerce deploy failed"; exit 1 }

# ---------------------------------------------------------------------------
# STEP 5 - Initial deploy of test-site (no env yet)
# ---------------------------------------------------------------------------
$TESTSITE_URL = Invoke-Deploy -Dir "$ROOT\test-site"
if (!$TESTSITE_URL) { Write-Error "test-site deploy failed"; exit 1 }

# Build full CORS/callback list
$ALL_ORIGINS = "$CLIENT_URL,$DEMOBANK_URL,$DEMOSHOP_URL,$TESTSITE_URL"

# ---------------------------------------------------------------------------
# STEP 6 - Set backend env vars + redeploy
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "====  Backend env vars  ====" -ForegroundColor Yellow
Set-Location "$ROOT\backend"
Set-VEnv "NODE_ENV"                  "production"
Set-VEnv "MONGODB_URI"               $MONGODB_URI
Set-VEnv "TOKEN_SECRET"              $TOKEN_SECRET
Set-VEnv "PARTNER_API_KEYS"          $PARTNER_API_KEYS
Set-VEnv "TRUST_PROXY"               "1"
Set-VEnv "VISUAL_SALT_VALUE"         "7"
Set-VEnv "VISUAL_ALPHABET_GRID_SIZE" "16"
Set-VEnv "VISUAL_SESSION_TTL_MS"     "300000"
Set-VEnv "VISUAL_MAX_ATTEMPTS"       "3"
# JSON_LIMIT intentionally omitted - code defaults to 10mb in env.js
Set-VEnv "CORS_ORIGIN"               $ALL_ORIGINS
Set-VEnv "PARTNER_CALLBACK_ALLOWLIST" $ALL_ORIGINS
Write-Host "  Re-deploying backend..." -ForegroundColor Cyan
& vercel deploy --prod --yes 2>&1 | Out-Null

# ---------------------------------------------------------------------------
# STEP 7 - Set client env vars + redeploy
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "====  Client env vars  ====" -ForegroundColor Yellow
Set-Location "$ROOT\client"
Set-VEnv "NEXT_PUBLIC_API_BASE_URL" $BACKEND_API
Set-VEnv "BACKEND_API_BASE_URL"     $BACKEND_API
Set-VEnv "PARTNER_SERVER_API_KEY"   $APIKEY_BANK
Write-Host "  Re-deploying client..." -ForegroundColor Cyan
& vercel deploy --prod --yes 2>&1 | Out-Null

# ---------------------------------------------------------------------------
# STEP 8 - Set demo-bank env vars + redeploy
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "====  Demo-bank env vars  ====" -ForegroundColor Yellow
Set-Location "$ROOT\demo-bank"
Set-VEnv "DEMO_BANK_PUBLIC_ORIGIN"     $DEMOBANK_URL
Set-VEnv "VISUAL_BACKEND_API_BASE_URL" $BACKEND_API
Set-VEnv "VISUAL_VERIFY_ORIGIN"        $CLIENT_URL
Set-VEnv "VISUAL_ADMIN_URL"            "$CLIENT_URL/admin"
Set-VEnv "VISUAL_PARTNER_ID"           $PARTNER_ID_BANK
Set-VEnv "VISUAL_API_KEY"              $APIKEY_BANK
Set-VEnv "DEMO_BANK_COOKIE_SECRET"     $DEMO_BANK_COOKIE_SECRET
Set-VEnv "DEMO_BANK_SESSION_HOURS"     "12"
Set-VEnv "DEMO_BANK_PENDING_MINUTES"   "10"
Set-VEnv "MONGODB_URI"                 $MONGODB_URI
Write-Host "  Re-deploying demo-bank..." -ForegroundColor Cyan
& vercel deploy --prod --yes 2>&1 | Out-Null

# ---------------------------------------------------------------------------
# STEP 9 - Set demo-ecommerce env vars + redeploy
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "====  Demo-ecommerce env vars  ====" -ForegroundColor Yellow
Set-Location "$ROOT\demo-ecommerce"
Set-VEnv "VISUAL_BACKEND_API_BASE_URL" $BACKEND_API
Set-VEnv "VISUAL_VERIFY_ORIGIN"        $CLIENT_URL
Set-VEnv "DEMO_SHOP_PUBLIC_ORIGIN"     $DEMOSHOP_URL
Set-VEnv "VISUAL_PARTNER_ID"           $PARTNER_ID_SHOP
Set-VEnv "VISUAL_API_KEY"              $APIKEY_SHOP
Set-VEnv "DEMO_SHOP_COOKIE_SECRET"     $DEMO_SHOP_COOKIE_SECRET
Set-VEnv "DEMO_SHOP_SESSION_HOURS"     "12"
Set-VEnv "DEMO_SHOP_PENDING_MINUTES"   "10"
Set-VEnv "MONGODB_URI"                 $MONGODB_URI
Write-Host "  Re-deploying demo-ecommerce..." -ForegroundColor Cyan
& vercel deploy --prod --yes 2>&1 | Out-Null

# ---------------------------------------------------------------------------
# STEP 10 - Set test-site env vars + redeploy
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "====  Test-site env vars  ====" -ForegroundColor Yellow
Set-Location "$ROOT\test-site"
Set-VEnv "VISUAL_BACKEND_API_BASE_URL" $BACKEND_API
Set-VEnv "VISUAL_VERIFY_ORIGIN"        $CLIENT_URL
Set-VEnv "SITE_PUBLIC_ORIGIN"          $TESTSITE_URL
Set-VEnv "VISUAL_PARTNER_ID"           $PARTNER_ID_TEST
Set-VEnv "VISUAL_API_KEY"              $APIKEY_TEST
Set-VEnv "COOKIE_SECRET"               $TEST_COOKIE_SECRET
Set-VEnv "MONGODB_URI"                 $MONGODB_URI
Write-Host "  Re-deploying test-site..." -ForegroundColor Cyan
& vercel deploy --prod --yes 2>&1 | Out-Null

# ---------------------------------------------------------------------------
# DONE
# ---------------------------------------------------------------------------
Set-Location $ROOT
Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "  ALL DEPLOYMENTS COMPLETE" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "  Backend        : $BACKEND_URL"
Write-Host "  Client         : $CLIENT_URL"
Write-Host "  Demo Bank      : $DEMOBANK_URL"
Write-Host "  Demo Ecommerce : $DEMOSHOP_URL"
Write-Host "  Test Site      : $TESTSITE_URL"
Write-Host "============================================================" -ForegroundColor Magenta
