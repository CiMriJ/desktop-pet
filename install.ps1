param(
  [switch]$Rollback,
  [string]$RuntimeSource = 'D:\projects\desktop-pet\dist\win-unpacked'
)

$ErrorActionPreference = 'Stop'
$appDir = 'D:\新建文件夹 (4)\desktop-pet'
$targetDir = Join-Path $appDir 'resources'
$target = Join-Path $targetDir 'app.asar'
$backup = Join-Path $targetDir 'app.asar.bak'
$exe = Join-Path $appDir '桌面宠物一二布布.exe'
$bundled = Join-Path $PSScriptRoot 'installer-out\win-unpacked\resources\app.asar'
$source = if (Test-Path $bundled) { $bundled } else { Join-Path $PSScriptRoot 'dist\app.asar' }

if (-not (Test-Path $appDir)) {
  New-Item -ItemType Directory -Path $appDir | Out-Null
}

if ($Rollback) {
  if (-not (Test-Path $backup)) { throw '没有找到备份 app.asar.bak，无法回滚' }
  Copy-Item $backup $target -Force
  Write-Host '已回滚到优化前的版本。' -ForegroundColor Green
  exit 0
}

if (-not (Test-Path $source)) {
  throw "找不到 $source，请先在项目目录执行 npm run setup"
}

$running = Get-Process -Name '桌面宠物一二布布' -ErrorAction SilentlyContinue
if ($running) {
  Write-Host '正在关闭运行中的桌面宠物...' -ForegroundColor Yellow
  $running | Stop-Process -Force
  Start-Sleep -Milliseconds 900
}

# 安装目录被清空过（例如误点了 Uninstall）时，先把 Electron 运行时补回来
if (-not (Test-Path $exe)) {
  if (-not (Test-Path $RuntimeSource)) {
    throw "安装目录里没有程序本体，也找不到可复制的运行时：$RuntimeSource"
  }
  Write-Host "安装目录缺少程序本体，正在从 $RuntimeSource 恢复..." -ForegroundColor Yellow
  Copy-Item -Path (Join-Path $RuntimeSource '*') -Destination $appDir -Recurse -Force
  Write-Host '程序本体已恢复。' -ForegroundColor Green
}

if (-not (Test-Path $targetDir)) {
  New-Item -ItemType Directory -Path $targetDir | Out-Null
}

if ((Test-Path $target) -and -not (Test-Path $backup)) {
  Copy-Item $target $backup
  Write-Host '已备份原版到 app.asar.bak'
}

Copy-Item $source $target -Force
Write-Host '更新完成，正在启动...' -ForegroundColor Green
Start-Process $exe
Write-Host '如需回滚：powershell -ExecutionPolicy Bypass -File .\install.ps1 -Rollback'
