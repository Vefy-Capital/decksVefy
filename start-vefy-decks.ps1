Set-Location -LiteralPath $PSScriptRoot
Write-Host "Starting Vefy Deck Vault at http://localhost:3000"
Write-Host "Keep this window open while using the app."
& npm run dev
Read-Host "Press Enter to close"
