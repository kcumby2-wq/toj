param(
  [string]$DatabaseUrl,
  [ValidateSet('reset', 'schema', 'seed', 'smoke')]
  [string]$Action = 'reset'
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

function Get-DatabaseUrl {
  param([string]$Provided)

  if ($Provided) {
    return $Provided
  }

  if ($env:DATABASE_URL) {
    return $env:DATABASE_URL
  }

  $envFile = Join-Path $projectRoot ".env"
  if (Test-Path $envFile) {
    $line = Get-Content $envFile |
      Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } |
      Select-Object -First 1

    if ($line) {
      return ($line -replace '^\s*DATABASE_URL\s*=\s*', '').Trim('"').Trim("'")
    }
  }

  return $null
}

function Find-PsqlPath {
  $psql = Get-Command psql -ErrorAction SilentlyContinue
  if ($psql) {
    return $psql.Source
  }

  $searchRoots = @()
  if ($env:ProgramFiles) {
    $searchRoots += (Join-Path $env:ProgramFiles "PostgreSQL")
  }
  if (${env:ProgramFiles(x86)}) {
    $searchRoots += (Join-Path ${env:ProgramFiles(x86)} "PostgreSQL")
  }

  foreach ($root in $searchRoots) {
    if (-not (Test-Path $root)) {
      continue
    }

    $candidates = Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue |
      ForEach-Object { Join-Path $_.FullName "bin\psql.exe" } |
      Where-Object { Test-Path $_ }

    if ($candidates -and $candidates.Count -gt 0) {
      $selected = $candidates | Sort-Object -Descending | Select-Object -First 1
      $binDir = Split-Path -Parent $selected
      if (-not ($env:Path -split ';' | Where-Object { $_ -eq $binDir })) {
        $env:Path = "$binDir;$($env:Path)"
      }
      return $selected
    }
  }

  return $null
}

$psqlPath = Find-PsqlPath
$dbUrl = Get-DatabaseUrl -Provided $DatabaseUrl

$hasPrereqError = $false
if (-not $psqlPath) {
  Write-Host "ERROR: psql was not found in PATH or common PostgreSQL install locations." -ForegroundColor Red
  Write-Host "Install PostgreSQL client tools and add the bin folder to PATH." -ForegroundColor Yellow
  Write-Host "Example path: C:\Program Files\PostgreSQL\16\bin" -ForegroundColor Yellow
  $hasPrereqError = $true
}

if (-not $dbUrl) {
  Write-Host "ERROR: DATABASE_URL is not set." -ForegroundColor Red
  Write-Host "Set env var or add DATABASE_URL to .env." -ForegroundColor Yellow
  Write-Host "Example: postgresql://postgres:your_password@localhost:5432/subjectmedia" -ForegroundColor Yellow
  $hasPrereqError = $true
}

if ($hasPrereqError) {
  exit 1
}

Write-Host "Using psql: $psqlPath" -ForegroundColor Cyan

$schema = "docs/phase1/phase1-schema.sql"
$seed = "docs/phase1/phase1-seed.sql"
$smoke = "docs/phase1/phase1-smoke.sql"

function Run-SqlFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Label,
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  Write-Host $Label -ForegroundColor Cyan
  & psql -d $dbUrl -f $Path
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

switch ($Action) {
  'schema' {
    Run-SqlFile -Label 'Applying schema...' -Path $schema
    Write-Host 'Done: schema applied.' -ForegroundColor Green
  }
  'seed' {
    Run-SqlFile -Label 'Applying seed data...' -Path $seed
    Write-Host 'Done: seed applied.' -ForegroundColor Green
  }
  'smoke' {
    Run-SqlFile -Label 'Running smoke tests...' -Path $smoke
    Write-Host 'Done: smoke completed.' -ForegroundColor Green
  }
  default {
    Run-SqlFile -Label 'Applying schema...' -Path $schema
    Run-SqlFile -Label 'Applying seed data...' -Path $seed
    Run-SqlFile -Label 'Running smoke tests...' -Path $smoke
    Write-Host 'Done: schema + seed + smoke completed.' -ForegroundColor Green
  }
}
