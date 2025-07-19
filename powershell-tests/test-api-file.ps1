<#
.SYNOPSIS
    A test script for the harshal-utilities multi-file chat API endpoint.
.DESCRIPTION
    This script sends multiple PDF files to the local /api/chat-with-files endpoint to test multi-document chat functionality.
.INSTRUCTIONS
    1. Ensure 'Bill1.pdf' and 'Bill2.pdf' exist in '.\test-data\pdf\'.
    2. Ensure the Node.js server is running via `npm start`.
    3. Run this script in a separate PowerShell terminal from the project root.
#>

# --- Configuration ---
$baseUri = "http://localhost:3002"
# Make the file path relative to the script's location, not the current working directory.
$file1Path = Join-Path -Path $PSScriptRoot -ChildPath "..\test-data\pdf\Bill1.pdf"
$file2Path = Join-Path -Path $PSScriptRoot -ChildPath "..\test-data\pdf\Bill2.pdf"
$prompt = "Compare these two bills. What are the key differences in total cost and due dates?"
$pdfMimeType = "application/pdf"

# --- Script ---
Write-Host "--- Testing Chat with Multiple Files ---" -ForegroundColor Yellow

# Check if the test file exists
if (-not (Test-Path -Path $file1Path -PathType Leaf) -or -not (Test-Path -Path $file2Path -PathType Leaf)) {
    Write-Host "❌ ERROR: Test files not found. Make sure Bill1.pdf and Bill2.pdf exist in test-data/pdf." -ForegroundColor Red
    exit 1
}

try {
    Write-Host "Reading and encoding files..."
    # Read file as bytes and convert to Base64
    $file1Bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $file1Path))
    $file1Base64 = [System.Convert]::ToBase64String($file1Bytes)
    $file2Bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $file2Path))
    $file2Base64 = [System.Convert]::ToBase64String($file2Bytes)

    # Construct the request body
    $file1Object = @{ fileBase64 = $file1Base64; fileMimeType = $pdfMimeType }
    $file2Object = @{ fileBase64 = $file2Base64; fileMimeType = $pdfMimeType }

    $requestBody = @{
        userInput    = $prompt
        history      = @()
        files        = @($file1Object, $file2Object)
    }

    # Send the request
    Write-Host "Sending request to $baseUri/api/chat-with-files..."
    $fileResponse = Invoke-RestMethod -Method Post -Uri "$baseUri/api/chat-with-files" -Body ($requestBody | ConvertTo-Json -Depth 5) -ContentType "application/json"
    
    Write-Host "✅ SUCCESS: API Response:" -ForegroundColor Green
    $fileResponse | Format-List
}
catch {
    Write-Host "❌ ERROR: Failed to get a response from the multi-file chat API." -ForegroundColor Red
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