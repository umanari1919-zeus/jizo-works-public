param(
  [Parameter(Mandatory=$true)][string]$Id,
  [Parameter(Mandatory=$true)][ValidateSet("ai","vibe","game","3d","pc")][string]$Topic,
  [Parameter(Mandatory=$true)][string]$Name,
  [Parameter(Mandatory=$true)][string]$Url,
  [ValidateSet("affiliate","sponsor","direct")][string]$Kind="affiliate",
  [ValidateSet("candidate","approved","paused","rejected")][string]$Status="candidate",
  [string]$Disclosure="PR",
  [int]$Trust=70,
  [int]$Intent=70,
  [int]$Margin=60,
  [int]$Freshness=80,
  [int]$Fit=70,
  [string]$Description=""
)

$ErrorActionPreference="Stop"
$Root=Split-Path $PSScriptRoot -Parent
$Path=Join-Path $Root "data\offers.json"

if(-not (Test-Path $Path)){throw "offers.json not found"}

if($Status -eq "approved"){
  if($Url -notmatch '^https://'){throw "Approved offer requires HTTPS URL"}
  if([string]::IsNullOrWhiteSpace($Disclosure)){throw "Approved offer requires disclosure"}
}

$Rows=@(Get-Content $Path -Raw | ConvertFrom-Json)
if($Rows | Where-Object id -eq $Id){throw "Duplicate offer id: $Id"}

$Rows += [pscustomobject]@{
  id=$Id;topic=$Topic;name=$Name;status=$Status;url=$Url;kind=$Kind;
  disclosure=$Disclosure;trust=$Trust;intent=$Intent;margin=$Margin;
  freshness=$Freshness;fit=$Fit;description=$Description
}

$Rows | ConvertTo-Json -Depth 6 | Set-Content $Path -Encoding utf8
Write-Host "Offer added: $Id ($Status)" -ForegroundColor Green
