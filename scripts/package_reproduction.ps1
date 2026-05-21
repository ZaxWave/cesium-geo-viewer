# Cesium Geo Viewer — 复现打包脚本
# 用途：将源码和环境信息打包为 ZIP，便于他人复现
# 用法：在项目根目录执行 powershell -File scripts/package_reproduction.ps1

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path $projectRoot "reproduction-package-$timestamp"
$zipFile = Join-Path $projectRoot "cesium-geo-viewer-reproduction-$timestamp.zip"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Cesium Geo Viewer — 复现打包工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Create temp packaging directory
Write-Host "[1/5] 创建临时打包目录..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $outDir "environment-info") | Out-Null

# 2. Collect environment info
Write-Host "[2/5] 收集环境信息..." -ForegroundColor Yellow

# Node.js
$nodeVersion = & node --version 2>$null
$npmVersion = & npm --version 2>$null
# Python
$pyVersion = & python --version 2>&1
# OS
$osInfo = Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, OSArchitecture
# Chrome (if available)
$chromeVersion = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" -ErrorAction SilentlyContinue).'(Default)'

$envReport = @"
==========================================
  实验环境信息
  生成时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
==========================================

操作系统:
  $($osInfo.Caption)
  Version: $($osInfo.Version)
  Architecture: $($osInfo.OSArchitecture)

Node.js:
  Version: $nodeVersion
  npm: $npmVersion

Python:
  $pyVersion

浏览器:
  Chrome 路径: $chromeVersion

项目信息:
  Git 分支: $(git rev-parse --abbrev-ref HEAD)
  Git 提交: $(git rev-parse HEAD)
  Git 远程: $(git remote get-url origin)

依赖版本 (package.json):
  cesium: ^1.110.0
  vite: ^4.4.5
  vite-plugin-cesium: ^1.2.22

完整依赖树请查看 package-lock.json
==========================================
"@

$envReport | Out-File -FilePath (Join-Path $outDir "environment-info\environment.txt") -Encoding utf8

# Save npm ls output
& npm ls --depth=0 2>$null | Out-File -FilePath (Join-Path $outDir "environment-info\npm-ls.txt") -Encoding utf8

Write-Host "  环境信息已保存到 environment-info/" -ForegroundColor Green

# 3. Copy source files
Write-Host "[3/5] 复制源码文件..." -ForegroundColor Yellow

# Files to include (whitelist approach to exclude node_modules, dist, .git, data dirs)
$includeItems = @(
    "index.html",
    "package.json",
    "package-lock.json",
    "vite.config.js",
    "README.md",
    "REPRODUCTION.md",
    ".gitignore",
    ".github",
    "src",
    "scripts",
    "public"
)

foreach ($item in $includeItems) {
    $src = Join-Path $projectRoot $item
    if (Test-Path $src) {
        Write-Host "  复制: $item" -ForegroundColor Gray
        Copy-Item -Path $src -Destination (Join-Path $outDir $item) -Recurse -Force
    }
    else {
        Write-Host "  跳过 (不存在): $item" -ForegroundColor DarkYellow
    }
}

# 4. Clean up files that should not be distributed
Write-Host "[4/5] 清理不必要的文件..." -ForegroundColor Yellow

# Remove .claude from the package (local Claude Code config)
$claudeDir = Join-Path $outDir ".claude"
if (Test-Path $claudeDir) { Remove-Item -Recurse -Force $claudeDir }

# Remove any .env files that may have been copied
Get-ChildItem -Path $outDir -Recurse -Filter ".env" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path $outDir -Recurse -Filter "*.local" -ErrorAction SilentlyContinue | Remove-Item -Force

# Remove Thumbs.db / .DS_Store
Get-ChildItem -Path $outDir -Recurse -Filter "Thumbs.db" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path $outDir -Recurse -Filter ".DS_Store" -ErrorAction SilentlyContinue | Remove-Item -Force

Write-Host "  清理完成" -ForegroundColor Green

# 5. Create ZIP archive
Write-Host "[5/5] 创建 ZIP 压缩包..." -ForegroundColor Yellow

if (Test-Path $zipFile) { Remove-Item -Force $zipFile }

# Use .NET for better compression and Unicode support
Add-Type -AssemblyName System.IO.Compression
$zipBase = Split-Path $zipFile -Parent
if (-not (Test-Path $zipBase)) { New-Item -ItemType Directory -Force -Path $zipBase | Out-Null }

[System.IO.Compression.ZipFile]::CreateFromDirectory($outDir, $zipFile, [System.IO.Compression.CompressionLevel]::Optimal, $false)

# Cleanup temp dir
Remove-Item -Recurse -Force $outDir

$zipSize = [math]::Round((Get-Item $zipFile).Length / 1MB, 2)

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " 打包完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  文件: $zipFile" -ForegroundColor White
Write-Host "  大小: $zipSize MB" -ForegroundColor White
Write-Host ""
Write-Host "交付清单:" -ForegroundColor Cyan
Write-Host "  [ ] $zipFile" -ForegroundColor White
Write-Host "  [ ] data/ 目录（海量切片数据，如适用）" -ForegroundColor White
Write-Host ""
Write-Host "接收方使用方式：" -ForegroundColor Cyan
Write-Host "  1. 解压 ZIP 到本地" -ForegroundColor White
Write-Host "  2. 阅读 REPRODUCTION.md" -ForegroundColor White
Write-Host "  3. npm ci" -ForegroundColor White
Write-Host "  4. npm run data-server" -ForegroundColor White
Write-Host "  5. npm run dev" -ForegroundColor White
Write-Host ""
