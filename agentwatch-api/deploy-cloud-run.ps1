# Deploy AgentWatch API to Google Cloud Run (Windows PowerShell)
# Prerequisites:
#   1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
#   2. gcloud auth login
#   3. gcloud config set project YOUR_PROJECT_ID
#   4. Path to Firebase service account JSON (download from Firebase Console)
#
# Usage (from agentwatch-api folder):
#   .\deploy-cloud-run.ps1 -ServiceAccountJsonPath "C:\path\to\serviceAccount.json" -CorsOrigins "https://your-app.vercel.app"

param(
    [Parameter(Mandatory = $false)]
    [string] $ProjectId = "",

    [Parameter(Mandatory = $false)]
    [string] $Region = "us-central1",

    [Parameter(Mandatory = $true)]
    [string] $ServiceAccountJsonPath,

    [Parameter(Mandatory = $false)]
    [string] $CorsOrigins = "https://ag-agentwatch-io.vercel.app",

    [Parameter(Mandatory = $false)]
    [string] $ServiceName = "agentwatch-api",

    [Parameter(Mandatory = $false)]
    [string] $ArtifactRepo = "agentwatch",

    [Parameter(Mandatory = $false)]
    [string] $SecretName = "agentwatch-firebase-sa"
)

# Native gcloud writes NOT_FOUND to stderr; "Stop" would abort before we can check $LASTEXITCODE.
$ErrorActionPreference = "Continue"

function Assert-Gcloud {
    $g = Get-Command gcloud -ErrorAction SilentlyContinue
    if (-not $g) {
        Write-Error "gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install then restart the terminal."
    }
}

Assert-Gcloud

if (-not (Test-Path -LiteralPath $ServiceAccountJsonPath)) {
    Write-Error "Service account file not found: $ServiceAccountJsonPath"
}

if (-not $ProjectId) {
    $ProjectId = gcloud config get-value project 2>$null
    if (-not $ProjectId) {
        Write-Error "No GCP project. Run: gcloud config set project YOUR_PROJECT_ID"
    }
}

Write-Host "Using project: $ProjectId  region: $Region" -ForegroundColor Cyan

Write-Host "Enabling APIs..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com --project $ProjectId

Write-Host "Creating Artifact Registry repo if needed..." -ForegroundColor Yellow
gcloud artifacts repositories describe $ArtifactRepo --location=$Region --project $ProjectId 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    gcloud artifacts repositories create $ArtifactRepo --repository-format=docker --location=$Region --project $ProjectId
    if ($LASTEXITCODE -ne 0) { Write-Error "Failed to create Artifact Registry repository." }
}

Write-Host "Creating or updating Secret Manager secret: $SecretName" -ForegroundColor Yellow
gcloud secrets describe $SecretName --project $ProjectId 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    gcloud secrets versions add $SecretName --data-file=$ServiceAccountJsonPath --project $ProjectId
    if ($LASTEXITCODE -ne 0) { Write-Error "Failed to add secret version." }
} else {
    gcloud secrets create $SecretName --data-file=$ServiceAccountJsonPath --project $ProjectId
    if ($LASTEXITCODE -ne 0) { Write-Error "Failed to create secret." }
}

$projectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
$runSa = "${projectNumber}-compute@developer.gserviceaccount.com"
Write-Host "Granting secret access to: $runSa" -ForegroundColor Yellow
& gcloud secrets add-iam-policy-binding $SecretName `
    --project $ProjectId `
    --member="serviceAccount:$runSa" `
    --role="roles/secretmanager.secretAccessor" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "(If the binding already exists, you can ignore the error above.)" -ForegroundColor DarkYellow
}

$image = "${Region}-docker.pkg.dev/${ProjectId}/${ArtifactRepo}/${ServiceName}:latest"
Write-Host "Building and pushing image: $image" -ForegroundColor Yellow
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $here
try {
    gcloud builds submit --tag $image --project $ProjectId .
    if ($LASTEXITCODE -ne 0) { Write-Error "Cloud Build failed." }
} finally {
    Pop-Location
}

Write-Host "Deploying Cloud Run service: $ServiceName" -ForegroundColor Yellow
gcloud run deploy $ServiceName `
    --image $image `
    --region $Region `
    --project $ProjectId `
    --allow-unauthenticated `
    --set-secrets="FIREBASE_SERVICE_ACCOUNT_JSON=${SecretName}:latest" `
    --set-env-vars="CORS_ORIGINS=$CorsOrigins"
if ($LASTEXITCODE -ne 0) { Write-Error "Cloud Run deploy failed." }

$url = gcloud run services describe $ServiceName --region $Region --project $ProjectId --format="value(status.url)"
Write-Host ""
Write-Host "Deployed: $url" -ForegroundColor Green
Write-Host "Health:   $url/health"
Write-Host ""
Write-Host "Set on Vercel: VITE_API_URL = $url  (no trailing slash)" -ForegroundColor Cyan
