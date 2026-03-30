#!/usr/bin/env pwsh
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location -Path $PSScriptRoot
node Server/server.js --from-bat

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
