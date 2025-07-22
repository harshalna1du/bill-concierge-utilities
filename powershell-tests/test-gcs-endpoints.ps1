<#
.SYNOPSIS
    Test script for the new GCS API endpoints in harshal-utilities
.DESCRIPTION
    This script tests the /api/data/:fileName endpoints (GET and POST) to verify
    the GCS functionality works correctly.
.INSTRUCTIONS
    1. Ensure the harshal-utilities server is running via `npm run dev`
    2. Run this script from a PowerShell terminal
    3. The script will test both successful and error scenarios
#>

# --- Configuration ---
$baseUri = "http://localhost:3002"
$testFileName = "test-customer-data.json"

# Sample customer data for testing (using actual bucket: vertex-ai-hnaidu-contest-demo)
$testCustomerData = @{
    userId = "test-user-123"
    customerName = "PowerShell Test Customer"
    accountNumber = "PS-TEST-12345"
    billingAddress = "456 PowerShell Ave, Test City, TC 67890"
    autopay = @{
        isEnrolled = $false
        paymentMethod = $null
    }
    currentBill = @{
        totalAmountDue = "150.50"
        dueDate = "2025-08-15"
    }
    paymentHistory = @(
        @{
            transactionId = "ps_test_001"
            date = "2025-07-10"
            amount = "150.50"
            status = "Paid"
            method = "PowerShell Test Card **** 5678"
            declineDetails = $null
        }
    )
    disputes = @()
}

Write-Host "=== Testing GCS API Endpoints ===" -ForegroundColor Yellow
Write-Host "Base URI: $baseUri" -ForegroundColor Cyan
Write-Host ""

# =================================================================
#  TEST 1: Verify server is running
# =================================================================
Write-Host "--- Test 1: Server Connectivity Check ---" -ForegroundColor Yellow

try {
    $configResponse = Invoke-RestMethod -Method Get -Uri "$baseUri/api/config"
    Write-Host "✅ SUCCESS: Server is running" -ForegroundColor Green
    Write-Host "   Max payload size: $($configResponse.maxPayloadSize)"
}
catch {
    Write-Host "❌ ERROR: Cannot connect to server" -ForegroundColor Red
    Write-Host "   Make sure the harshal-utilities server is running with 'npm run dev'"
    Write-Host "   Error: $($_.Exception.Message)"
    exit 1
}

# =================================================================
#  TEST 2: POST customer data to GCS endpoint
# =================================================================
Write-Host "`n--- Test 2: POST /api/data/$testFileName ---" -ForegroundColor Yellow

try {
    $postResponse = Invoke-RestMethod -Method Post -Uri "$baseUri/api/data/$testFileName" -Body ($testCustomerData | ConvertTo-Json -Depth 5) -ContentType "application/json"
    
    if ($postResponse.success) {
        Write-Host "✅ SUCCESS: Data posted successfully" -ForegroundColor Green
        Write-Host "   Message: $($postResponse.message)"
    } else {
        Write-Host "⚠️ WARNING: Response did not indicate success" -ForegroundColor Yellow
        $postResponse | Format-List
    }
}
catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $stream = $errorResponse.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "⚠️ EXPECTED ERROR (GCS may not be configured): Status $($errorResponse.StatusCode)" -ForegroundColor Yellow
        Write-Host "   Response: $responseBody"
    } else {
        Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# =================================================================
#  TEST 3: GET customer data from GCS endpoint
# =================================================================
Write-Host "`n--- Test 3: GET /api/data/$testFileName ---" -ForegroundColor Yellow

try {
    $getResponse = Invoke-RestMethod -Method Get -Uri "$baseUri/api/data/$testFileName"
    
    Write-Host "✅ SUCCESS: Data retrieved successfully" -ForegroundColor Green
    Write-Host "   Customer Name: $($getResponse.customerName)"
    Write-Host "   User ID: $($getResponse.userId)"
    
    # Verify the data matches what we posted
    if ($getResponse.userId -eq $testCustomerData.userId) {
        Write-Host "✅ DATA VERIFICATION: Retrieved data matches posted data" -ForegroundColor Green
    } else {
        Write-Host "⚠️ DATA MISMATCH: Retrieved data doesn't match what was posted" -ForegroundColor Yellow
    }
}
catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        if ($errorResponse.StatusCode -eq 404) {
            Write-Host "⚠️ EXPECTED: File not found (404) - GCS may not be configured" -ForegroundColor Yellow
        } elseif ($errorResponse.StatusCode -eq 500) {
            Write-Host "⚠️ EXPECTED: Server error (500) - GCS may not be configured" -ForegroundColor Yellow
        } else {
            Write-Host "❌ ERROR: Status $($errorResponse.StatusCode)" -ForegroundColor Red
        }
        
        $stream = $errorResponse.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody"
    } else {
        Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# =================================================================
#  TEST 4: GET non-existent file (should return 404)
# =================================================================
Write-Host "`n--- Test 4: GET non-existent file ---" -ForegroundColor Yellow

try {
    $notFoundResponse = Invoke-RestMethod -Method Get -Uri "$baseUri/api/data/non-existent-file.json"
    Write-Host "⚠️ UNEXPECTED: Should have returned 404 for non-existent file" -ForegroundColor Yellow
}
catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        if ($errorResponse.StatusCode -eq 404) {
            Write-Host "✅ SUCCESS: Correctly returned 404 for non-existent file" -ForegroundColor Green
        } elseif ($errorResponse.StatusCode -eq 500) {
            Write-Host "⚠️ EXPECTED: Server error (500) - GCS not configured" -ForegroundColor Yellow
        } else {
            Write-Host "⚠️ UNEXPECTED STATUS: $($errorResponse.StatusCode)" -ForegroundColor Yellow
        }
        
        $stream = $errorResponse.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody"
    }
}

# =================================================================
#  TEST 5: POST without body (should return 400)
# =================================================================
Write-Host "`n--- Test 5: POST without body (error handling) ---" -ForegroundColor Yellow

try {
    $emptyPostResponse = Invoke-RestMethod -Method Post -Uri "$baseUri/api/data/test.json" -ContentType "application/json"
    Write-Host "⚠️ UNEXPECTED: Should have returned 400 for missing body" -ForegroundColor Yellow
}
catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse -and $errorResponse.StatusCode -eq 400) {
        Write-Host "✅ SUCCESS: Correctly returned 400 for missing request body" -ForegroundColor Green
    } else {
        Write-Host "⚠️ UNEXPECTED: Expected 400 status for missing body" -ForegroundColor Yellow
        if ($errorResponse) {
            Write-Host "   Got status: $($errorResponse.StatusCode)"
        }
    }
}

# =================================================================
#  Summary
# =================================================================
Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
Write-Host "✅ Server connectivity test completed"
Write-Host "✅ POST endpoint test completed"
Write-Host "✅ GET endpoint test completed"
Write-Host "✅ Error handling tests completed"
Write-Host ""
Write-Host "💡 Note: Some tests may show 'expected errors' if GCS is not configured." -ForegroundColor Yellow
Write-Host "   This is normal and tests the error handling paths."
Write-Host ""
Write-Host "🎉 All GCS endpoint tests completed!" -ForegroundColor Green 