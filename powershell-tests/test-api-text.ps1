<#
.SYNOPSIS
    A test script for the harshal-utilities Express API server.
.DESCRIPTION
    This script sends requests to the local API endpoints to test chat functionality.
    It can test both the text-only chat and the chat-with-file endpoints.
.INSTRUCTIONS
    1. Ensure the Node.js server is running via `npm start`.
    2. Run this script in a separate PowerShell terminal from the project root.
    3. By default, it tests the text-only chat. To test the file upload,
       comment out Section 1 and uncomment Section 2.
#>

# --- Configuration ---
$baseUri = "http://localhost:3000"

# =================================================================
#  SECTION 1: Test Text-Only Chat (/api/chat)
#  (This section is active by default)
# =================================================================
Write-Host "--- Testing Text-Only Chat (/api/chat) ---" -ForegroundColor Yellow

$textChatBody = @{
    userInput = "Explain what a REST API is in simple terms using a PowerShell analogy."
    history   = @() # An empty array for the history
}

try {
    $textResponse = Invoke-RestMethod -Method Post -Uri "$baseUri/api/chat" -Body ($textChatBody | ConvertTo-Json) -ContentType "application/json"
    Write-Host "✅ SUCCESS: API Response:" -ForegroundColor Green
    $textResponse | Format-List
}
catch {
    Write-Host "❌ ERROR: Failed to get a response from the text chat API." -ForegroundColor Red
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

# =================================================================
#  SECTION 2: Test Chat with File (/api/chat-with-file)
#  (To use, comment out Section 1 and uncomment the code below)
# =================================================================
<#
Write-Host "`n--- Testing Chat with File (/api/chat-with-file) ---" -ForegroundColor Yellow

$tempFilePath = ".\sample-test-file.txt"
$fileContent = "This is a sample text file for testing the file upload functionality."
Set-Content -Path $tempFilePath -Value $fileContent

try {
    $fileBytes = [System.IO.File]::ReadAllBytes($tempFilePath)
    $fileBase64 = [System.Convert]::ToBase64String($fileBytes)

    $fileChatBody = @{
        userInput    = "Summarize the content of this file in one sentence."
        history      = @()
        fileBase64   = $fileBase64
        fileMimeType = "text/plain"
    }

    $fileResponse = Invoke-RestMethod -Method Post -Uri "$baseUri/api/chat-with-file" -Body ($fileChatBody | ConvertTo-Json) -ContentType "application/json"
    Write-Host "✅ SUCCESS: API Response:" -ForegroundColor Green
    $fileResponse | Format-List
}
finally {
    Remove-Item $tempFilePath -ErrorAction SilentlyContinue
    Write-Host "`n🧹 Cleaned up temporary file: $tempFilePath" -ForegroundColor Cyan
}
#>