param(
  [string]$OutputPath = ''
)

$ErrorActionPreference = 'Continue'
Set-Location 'C:\CodexLab\gestor-documental'

$result = npm.cmd run db:push -- --accept-data-loss 2>&1 | Out-String

if ($OutputPath) {
  $dir = Split-Path -Parent $OutputPath
  if ($dir -and -not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
  Set-Content -LiteralPath $OutputPath -Value $result -Encoding UTF8
} else {
  Write-Output $result
}

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
