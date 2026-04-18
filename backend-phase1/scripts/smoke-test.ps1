$ErrorActionPreference = 'Stop'

$h = @{ Authorization = 'Bearer demo'; 'x-org-id' = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' }
$out = @()

function Add-Result {
  param(
    [string]$Name,
    [bool]$Ok,
    [string]$Preview
  )

  $out += [pscustomobject]@{
    endpoint = $Name
    ok = $Ok
    preview = $Preview
  }
}

try {
  $r = Invoke-RestMethod -Method Get -Uri 'http://localhost:4000/health'
  Add-Result -Name 'health' -Ok $true -Preview ($r | ConvertTo-Json -Compress)
} catch {
  $msg = $_.ErrorDetails.Message
  if (-not $msg) { $msg = $_.Exception.Message }
  Add-Result -Name 'health' -Ok $false -Preview $msg
}

try {
  $r = Invoke-RestMethod -Method Get -Uri 'http://localhost:4000/api/clients' -Headers $h
  Add-Result -Name 'clients' -Ok $true -Preview ($r | ConvertTo-Json -Compress -Depth 6)
} catch {
  $msg = $_.ErrorDetails.Message
  if (-not $msg) { $msg = $_.Exception.Message }
  Add-Result -Name 'clients' -Ok $false -Preview $msg
}

try {
  $r = Invoke-RestMethod -Method Get -Uri 'http://localhost:4000/api/campaigns' -Headers $h
  Add-Result -Name 'campaigns' -Ok $true -Preview ($r | ConvertTo-Json -Compress -Depth 6)
} catch {
  $msg = $_.ErrorDetails.Message
  if (-not $msg) { $msg = $_.Exception.Message }
  Add-Result -Name 'campaigns' -Ok $false -Preview $msg
}

try {
  $r = Invoke-RestMethod -Method Get -Uri 'http://localhost:4000/api/leads' -Headers $h
  Add-Result -Name 'leads' -Ok $true -Preview ($r | ConvertTo-Json -Compress -Depth 6)
} catch {
  $msg = $_.ErrorDetails.Message
  if (-not $msg) { $msg = $_.Exception.Message }
  Add-Result -Name 'leads' -Ok $false -Preview $msg
}

try {
  $r = Invoke-RestMethod -Method Get -Uri 'http://localhost:4000/api/reports/summary?from=2026-04-01&to=2026-04-30' -Headers $h
  Add-Result -Name 'reports-summary' -Ok $true -Preview ($r | ConvertTo-Json -Compress -Depth 6)
} catch {
  $msg = $_.ErrorDetails.Message
  if (-not $msg) { $msg = $_.Exception.Message }
  Add-Result -Name 'reports-summary' -Ok $false -Preview $msg
}

$out | ConvertTo-Json -Depth 6
