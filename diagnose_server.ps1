$ServerIP = "154.12.46.13"
$User = "root"
$Port = "22"
$RemotePath = "/opt/aimax/ai-novel-writer/app/module/module_max/creation/page.tsx"
$Dir = "/opt/aimax/ai-novel-writer"

Write-Host "Diagnosing server file..." -ForegroundColor Yellow
$Cmd = "ls -l $RemotePath && echo '---Content Check---' && grep 'isContextLoadedRef' $RemotePath || echo 'Pattern not found' && echo '---Directory Check---' && ls -ld $Dir/ai-novel-writer-build 2>/dev/null || echo 'Build dir gone'"
ssh -p $Port $User@$ServerIP $Cmd
