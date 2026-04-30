param(
  [string]$OutputDir = "",
  [string]$MasterPng = ""
)

Add-Type -AssemblyName System.Drawing

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptRoot

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $OutputDir = Join-Path $ProjectRoot "App\\Resources\\Assets.xcassets\\AppIcon.appiconset"
}

if ([string]::IsNullOrWhiteSpace($MasterPng)) {
  $MasterPng = Join-Path $ProjectRoot "App\\Resources\\AppIcon-master.png"
}

function New-RoundedPath {
  param(
    [int]$X,
    [int]$Y,
    [int]$Width,
    [int]$Height,
    [int]$Radius
  )

  $diameter = $Radius * 2
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

$sizes = @(
  @{ Size = 40; Name = "Icon-App-20x20@2x.png" },
  @{ Size = 60; Name = "Icon-App-20x20@3x.png" },
  @{ Size = 58; Name = "Icon-App-29x29@2x.png" },
  @{ Size = 87; Name = "Icon-App-29x29@3x.png" },
  @{ Size = 80; Name = "Icon-App-40x40@2x.png" },
  @{ Size = 120; Name = "Icon-App-40x40@3x.png" },
  @{ Size = 120; Name = "Icon-App-60x60@2x.png" },
  @{ Size = 180; Name = "Icon-App-60x60@3x.png" },
  @{ Size = 20; Name = "Icon-App-20x20@1x-ipad.png" },
  @{ Size = 40; Name = "Icon-App-20x20@2x-ipad.png" },
  @{ Size = 29; Name = "Icon-App-29x29@1x-ipad.png" },
  @{ Size = 58; Name = "Icon-App-29x29@2x-ipad.png" },
  @{ Size = 40; Name = "Icon-App-40x40@1x-ipad.png" },
  @{ Size = 80; Name = "Icon-App-40x40@2x-ipad.png" },
  @{ Size = 76; Name = "Icon-App-76x76@1x.png" },
  @{ Size = 152; Name = "Icon-App-76x76@2x.png" },
  @{ Size = 167; Name = "Icon-App-83.5x83.5@2x.png" },
  @{ Size = 1024; Name = "Icon-App-1024x1024@1x.png" }
)

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $MasterPng) | Out-Null

$master = New-Object System.Drawing.Bitmap 1024, 1024
$graphics = [System.Drawing.Graphics]::FromImage($master)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::FromArgb(247, 236, 221))

$inner = New-Object System.Drawing.Drawing2D.GraphicsPath
$inner.AddArc(168, 188, 112, 112, 180, 90)
$inner.AddArc(744, 188, 112, 112, 270, 90)
$inner.AddArc(744, 700, 112, 112, 0, 90)
$inner.AddArc(168, 700, 112, 112, 90, 90)
$inner.CloseFigure()
$graphics.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 249, 242))), $inner)

$topBar = New-Object System.Drawing.Drawing2D.GraphicsPath
$topBar.AddArc(236, 272, 56, 56, 180, 90)
$topBar.AddArc(708, 272, 56, 56, 270, 90)
$topBar.AddArc(708, 384, 56, 56, 0, 90)
$topBar.AddArc(236, 384, 56, 56, 90, 90)
$topBar.CloseFigure()
$graphics.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(47, 34, 24))), $topBar)

$midBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(233, 210, 178))
$midPath = New-RoundedPath -X 236 -Y 448 -Width 432 -Height 108 -Radius 22
$graphics.FillPath($midBrush, $midPath)
$lowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(241, 226, 206))
$lowPath = New-RoundedPath -X 236 -Y 590 -Width 336 -Height 108 -Radius 22
$graphics.FillPath($lowBrush, $lowPath)

$circleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(197, 113, 71))
$graphics.FillEllipse($circleBrush, 648, 566, 156, 156)

$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 248, 242), 26)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$graphics.DrawLines($pen, @(
  (New-Object System.Drawing.Point 694, 645),
  (New-Object System.Drawing.Point 724, 676),
  (New-Object System.Drawing.Point 778, 614)
))

$master.Save($MasterPng, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$master.Dispose()

$source = [System.Drawing.Image]::FromFile($MasterPng)
foreach ($icon in $sizes) {
  $bitmap = New-Object System.Drawing.Bitmap $icon.Size, $icon.Size
  $g = [System.Drawing.Graphics]::FromImage($bitmap)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($source, 0, 0, $icon.Size, $icon.Size)
  $bitmap.Save((Join-Path $OutputDir $icon.Name), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bitmap.Dispose()
}
$source.Dispose()

Write-Output "Generated app icons in $OutputDir"
