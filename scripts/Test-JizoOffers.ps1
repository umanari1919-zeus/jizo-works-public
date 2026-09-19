$ErrorActionPreference="Stop"
$Root=Split-Path $PSScriptRoot -Parent
$Offers=Join-Path $Root "data\offers.json"
$Sources=Join-Path $Root "data\partner_sources.json"

$Rows=@(Get-Content $Offers -Raw | ConvertFrom-Json)
$Ids=@{}
foreach($x in $Rows){
  if($Ids.ContainsKey($x.id)){throw "Duplicate id: $($x.id)"}
  $Ids[$x.id]=$true

  if($x.status -eq "approved"){
    if($x.url -notmatch '^https://'){throw "Approved URL invalid: $($x.id)"}
    if([string]::IsNullOrWhiteSpace($x.disclosure)){throw "Disclosure missing: $($x.id)"}
  }
}

$Partners=@(Get-Content $Sources -Raw | ConvertFrom-Json)
foreach($p in $Partners){
  if($p.application_url -notmatch '^https://'){throw "Partner URL invalid: $($p.id)"}
}

Write-Host "Offer registry PASS: $($Rows.Count) offers" -ForegroundColor Green
Write-Host "Partner sources PASS: $($Partners.Count) verified sources" -ForegroundColor Green
