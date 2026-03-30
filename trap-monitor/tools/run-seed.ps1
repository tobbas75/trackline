# Trap Monitor Test Data Seeder Wrapper
# Loads environment variables and runs the seeder

param(
  [string]$OrgId = "4d5184cf-3e95-4bef-951a-ffc3fa02a47f",
  [switch]$DryRun = $false
)

# Set Supabase URL
$env:SUPABASE_URL = "https://kwmtzwglbaystskubgyt.supabase.co"

# Load SUPABASE_SERVICE_ROLE_KEY from frontend/.env.local
$envFile = "frontend\.env.local"
if (Test-Path $envFile) {
  $line = Get-Content $envFile | Where-Object { $_ -match '^SUPABASE_SERVICE_ROLE_KEY=' }
  if ($line) {
    $env:SUPABASE_SERVICE_ROLE_KEY = ($line -split '=', 2)[1]
    Write-Host "✅ Loaded SUPABASE_SERVICE_ROLE_KEY from frontend/.env.local"
  } else {
    Write-Error "❌ SUPABASE_SERVICE_ROLE_KEY not found in frontend/.env.local"
    exit 1
  }
} else {
  Write-Error "❌ frontend/.env.local not found"
  exit 1
}

# Build command
$nodeArgs = @("tools/seed-test-data.js", "--org-id", $OrgId)
if ($DryRun) {
  $nodeArgs += "--dry-run"
}

Write-Host "Running seeder..."
Write-Host "Mode: $(if ($DryRun) { 'DRY RUN' } else { 'LIVE' })"
Write-Host ""

# Run seeder
& node @nodeArgs

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "✅ Seeder completed successfully"
} else {
  Write-Host ""
  Write-Host "❌ Seeder failed with exit code $LASTEXITCODE"
  exit $LASTEXITCODE
}
