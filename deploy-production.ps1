# =============================================================================
#  deploy-production.ps1 - Deploy all services with real custom domains
#  Domains:
#    backend        -> https://api.scam2safe.com
#    client         -> https://www.scam2safe.com
#    demo-bank      -> https://apex.scam2safe.com
#    demo-ecommerce -> https://ecommerce.scam2safe.com
#    test-site      -> https://wallet.scam2safe.com
#
#  Pre-req: vercel CLI logged in (run: vercel whoami)
# =============================================================================

# ---------------------------------------------------------------------------
# REAL CUSTOM DOMAINS
# ---------------------------------------------------------------------------
$BACKEND_URL   = "https://api.scam2safe.com"
$CLIENT_URL    = "https://www.scam2safe.com"
$DEMOBANK_URL  = "https://apex.scam2safe.com"
$DEMOSHOP_URL  = "https://ecommerce.scam2safe.com"
$TESTSITE_URL  = "https://wallet.scam2safe.com"
$BACKEND_API   = "$BACKEND_URL/api"

$ALL_ORIGINS = "$CLIENT_URL,https://scam2safe.com,$DEMOBANK_URL,$DEMOSHOP_URL,$TESTSITE_URL"

# ---------------------------------------------------------------------------
# SECRETS
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
# HELPER: set a single env var on the currently-linked vercel project
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
# HELPER: deploy a project
# ---------------------------------------------------------------------------
function Invoke-Deploy {
    param([string]$Dir)
    $name = Split-Path $Dir -Leaf
    Write-Host ""
    Write-Host "====  Deploying: $name  ====" -ForegroundColor Cyan
    Set-Location $Dir
    $raw = & vercel deploy --prod --yes 2>&1
    $raw | ForEach-Object { Write-Host "  $_" }
    Write-Host "  Done: $name" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# BACKEND
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "====  Backend env vars  ====" -ForegroundColor Yellow
Set-Location "$ROOT\backend"
Set-VEnv "NODE_ENV"                   "production"
Set-VEnv "MONGODB_URI"                $MONGODB_URI
Set-VEnv "TOKEN_SECRET"               $TOKEN_SECRET
Set-VEnv "PARTNER_API_KEYS"           $PARTNER_API_KEYS
Set-VEnv "TRUST_PROXY"                "1"
Set-VEnv "VISUAL_SALT_VALUE"          "7"
Set-VEnv "VISUAL_ALPHABET_GRID_SIZE"  "16"
Set-VEnv "VISUAL_SESSION_TTL_MS"      "300000"
Set-VEnv "VISUAL_MAX_ATTEMPTS"        "3"
# JSON_LIMIT intentionally omitted - code defaults to 10mb in env.js
Set-VEnv "CORS_ORIGIN"                $ALL_ORIGINS
Set-VEnv "PARTNER_CALLBACK_ALLOWLIST" $ALL_ORIGINS
Invoke-Deploy -Dir "$ROOT\backend"

# ---------------------------------------------------------------------------
# CLIENT
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "====  Client env vars  ====" -ForegroundColor Yellow
Set-Location "$ROOT\client"
Set-VEnv "NEXT_PUBLIC_API_BASE_URL" $BACKEND_API
Set-VEnv "BACKEND_API_BASE_URL"     $BACKEND_API
Set-VEnv "PARTNER_SERVER_API_KEY"   $APIKEY_BANK
Invoke-Deploy -Dir "$ROOT\client"

# ---------------------------------------------------------------------------
# DEMO-BANK
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
Invoke-Deploy -Dir "$ROOT\demo-bank"

# ---------------------------------------------------------------------------
# DEMO-ECOMMERCE
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "====  Demo-ecommerce env vars  ====" -ForegroundColor Yellow
Set-Location "$ROOT\demo-ecommerce"
Set-VEnv "DEMO_SHOP_PUBLIC_ORIGIN"     $DEMOSHOP_URL
Set-VEnv "VISUAL_BACKEND_API_BASE_URL" $BACKEND_API
Set-VEnv "VISUAL_VERIFY_ORIGIN"        $CLIENT_URL
Set-VEnv "VISUAL_ADMIN_URL"            "$CLIENT_URL/admin"
Set-VEnv "VISUAL_PARTNER_ID"           $PARTNER_ID_SHOP
Set-VEnv "VISUAL_API_KEY"              $APIKEY_SHOP
Set-VEnv "DEMO_SHOP_COOKIE_SECRET"     $DEMO_SHOP_COOKIE_SECRET
Set-VEnv "DEMO_SHOP_SESSION_HOURS"     "12"
Set-VEnv "DEMO_SHOP_PENDING_MINUTES"   "10"
Set-VEnv "MONGODB_URI"                 $MONGODB_URI
Invoke-Deploy -Dir "$ROOT\demo-ecommerce"

# ---------------------------------------------------------------------------
# TEST-SITE
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "====  Test-site env vars  ====" -ForegroundColor Yellow
Set-Location "$ROOT\test-site"
Set-VEnv "SITE_PUBLIC_ORIGIN"          $TESTSITE_URL
Set-VEnv "VISUAL_BACKEND_API_BASE_URL" $BACKEND_API
Set-VEnv "VISUAL_VERIFY_ORIGIN"        $CLIENT_URL
Set-VEnv "VISUAL_PARTNER_ID"           $PARTNER_ID_TEST
Set-VEnv "VISUAL_API_KEY"              $APIKEY_TEST
Set-VEnv "COOKIE_SECRET"               $TEST_COOKIE_SECRET
Set-VEnv "MONGODB_URI"                 $MONGODB_URI
Invoke-Deploy -Dir "$ROOT\test-site"

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
