<#
.SYNOPSIS
    A test script for the harshal-utilities file chat API endpoint.
.DESCRIPTION
    This script sends a PDF file to the local /api/chat-with-file endpoint to test multimodal chat functionality.
.INSTRUCTIONS
    1. Place your test PDF file at '.\test-data\pdf\Sample_Utility_Bill.pdf'.
    2. Ensure the Node.js server is running via `npm start`.
    3. Run this script in a separate PowerShell terminal from the project root.
#>

# --- Configuration ---
$baseUri = "http://localhost:3000"
# Make the file path relative to the script's location, not the current working directory.
$filePath = Join-Path -Path $PSScriptRoot -ChildPath "..\test-data\pdf\Sample_Utility_Bill.pdf"
$prompt = "Please extract the total amount due and the payment due date from this utility bill."

# --- Script ---
Write-Host "--- Testing Chat with File ($filePath) ---" -ForegroundColor Yellow

# Check if the test file exists
if (-not (Test-Path -Path $filePath -PathType Leaf)) {
    Write-Host "❌ ERROR: Test file not found at '$filePath'. Please place the sample PDF there before running." -ForegroundColor Red
    exit 1
}

try {
    # Read file as bytes and convert to Base64
    $fileBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $filePath))
    $fileBase64 = [System.Convert]::ToBase64String($fileBytes)

    # Construct the request body
    $fileChatBody = @{
        userInput    = $prompt
        history      = @()
        fileBase64   = $fileBase64
        fileMimeType = "application/pdf"
    }

    # Send the request
    $fileResponse = Invoke-RestMethod -Method Post -Uri "$baseUri/api/chat-with-file" -Body ($fileChatBody | ConvertTo-Json) -ContentType "application/json"
    
    Write-Host "✅ SUCCESS: API Response:" -ForegroundColor Green
    $fileResponse | Format-List
}
catch {
    Write-Host "❌ ERROR: Failed to get a response from the file chat API." -ForegroundColor Red
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        Write-Host "Status Code: $($errorResponse.StatusCode)"
        $stream = $errorResponse.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    } else {
        Write-Host "An unexpected error occurred: $($_.Exception.Message)"
    }
}