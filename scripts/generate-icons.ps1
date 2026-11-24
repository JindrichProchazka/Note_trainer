Add-Type -AssemblyName System.Drawing
$iconFolder = Join-Path $PSScriptRoot '../assets/icons'
[IO.Directory]::CreateDirectory($iconFolder) | Out-Null
foreach ($spec in @(@('icon-192.png',192),@('icon-512.png',512),@('maskable-512.png',512),@('apple-touch-icon.png',180))) {
  $size = [int]$spec[1]
  $bitmap = [Drawing.Bitmap]::new($size,$size)
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([Drawing.ColorTranslator]::FromHtml('#28554a'))
  $pen = [Drawing.Pen]::new([Drawing.Color]::White,($size * .042))
  $graphics.DrawLine($pen,($size * .60),($size * .28),($size * .60),($size * .66))
  $graphics.TranslateTransform(($size * .48),($size * .66))
  $graphics.RotateTransform(-20)
  $graphics.FillEllipse([Drawing.Brushes]::White,(-$size * .12),(-$size * .08),($size * .24),($size * .16))
  $bitmap.Save((Join-Path $iconFolder $spec[0]),[Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose(); $pen.Dispose(); $bitmap.Dispose()
}
