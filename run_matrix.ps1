param(
  [string]$Token = @"
13|hgoNr72Z4AioCGnJCrmhTkOt2fXCgKof5S4sNpOX6368bab7
"@,
  [int]$Run = 1
)
$counts = @(10, 12, 15, 18, 20)
$diffs = @('Easy', 'Medium', 'Hard')
$headers = @{ Authorization = "Bearer $Token"; 'Content-Type' = 'application/json'; Accept = 'application/json' }

foreach ($c in $counts) {
  foreach ($d in $diffs) {
    $body = @{ lesson_ids = @(1); count = $c; difficulty = $d } | ConvertTo-Json
    try {
      $resp = Invoke-RestMethod -Uri "http://localhost:8000/api/student/practice/generate" -Method Post -Headers $headers -Body $body -ContentType 'application/json'
      $total = if ($resp.questions) { @($resp.questions).Count } else { 0 }
      $partial = if ($resp.partial) { $resp.partial } else { $false }
      Write-Host "Run $Run | count=$c | diff=$d | total=$total | partial=$partial"
    } catch {
      $status = $_.Exception.Response.StatusCode.value__
      Write-Host "Run $Run | count=$c | diff=$d | HTTP=$status | ERROR"
    }
  }
}