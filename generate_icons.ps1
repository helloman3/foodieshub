Add-Type -AssemblyName System.Drawing

function Draw-FoodieHubIcon([int]$size, [string]$outputPath) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $scale = $size / 100.0

    # 1. Rounded rectangle background (Squircle)
    $radius = 24.0 * $scale
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $rect = New-Object System.Drawing.RectangleF 0, 0, $size, $size
    
    $path.AddArc($rect.X, $rect.Y, $radius * 2, $radius * 2, 180, 90)
    $path.AddArc($rect.Right - $radius * 2, $rect.Y, $radius * 2, $radius * 2, 270, 90)
    $path.AddArc($rect.Right - $radius * 2, $rect.Bottom - $radius * 2, $radius * 2, $radius * 2, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $radius * 2, $radius * 2, $radius * 2, 90, 90)
    $path.CloseFigure()

    $brushGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.PointF 0, 0),
        (New-Object System.Drawing.PointF $size, $size),
        [System.Drawing.Color]::FromArgb(255, 62, 131, 0),
        [System.Drawing.Color]::FromArgb(255, 37, 86, 0)
    )
    $g.FillPath($brushGrad, $path)

    # 2. Subtle glossy border
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(70, 255, 255, 255), (1.5 * $scale))
    $innerPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $inset = 2.0 * $scale
    $innerRadius = ($radius - $inset)
    $innerRect = New-Object System.Drawing.RectangleF $inset, $inset, ($size - $inset * 2), ($size - $inset * 2)
    $innerPath.AddArc($innerRect.X, $innerRect.Y, $innerRadius * 2, $innerRadius * 2, 180, 90)
    $innerPath.AddArc($innerRect.Right - $innerRadius * 2, $innerRect.Y, $innerRadius * 2, $innerRadius * 2, 270, 90)
    $innerPath.AddArc($innerRect.Right - $innerRadius * 2, $innerRect.Bottom - $innerRadius * 2, $innerRadius * 2, $innerRadius * 2, 0, 90)
    $innerPath.AddArc($innerRect.X, $innerRect.Bottom - $innerRadius * 2, $innerRadius * 2, $innerRadius * 2, 90, 90)
    $innerPath.CloseFigure()
    $g.DrawPath($borderPen, $innerPath)

    # 3. Gold colors
    $goldBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.PointF 0, 0),
        (New-Object System.Drawing.PointF $size, $size),
        [System.Drawing.Color]::FromArgb(255, 255, 213, 79),
        [System.Drawing.Color]::FromArgb(255, 255, 152, 0)
    )

    # 4. Handle (Golden ball on top)
    $handleR = 4.5 * $scale
    $g.FillEllipse($goldBrush, (50.0 * $scale - $handleR), (30.0 * $scale - $handleR), ($handleR * 2), ($handleR * 2))

    # 5. Cloche White Dome
    $clochePath = New-Object System.Drawing.Drawing2D.GraphicsPath
    # Arc from (26, 62) up to (50, 36) to (74, 62)
    $clochePath.AddArc((26.0 * $scale), (36.0 * $scale), (48.0 * $scale), (52.0 * $scale), 180, 180)
    $clochePath.CloseFigure()
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillPath($whiteBrush, $clochePath)

    # 6. Golden Base Plate
    $plateWidth = 58.0 * $scale
    $plateHeight = 6.5 * $scale
    $plateRadius = $plateHeight / 2.0
    $platePath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $pX = 21.0 * $scale
    $pY = 65.0 * $scale
    $platePath.AddArc($pX, $pY, $plateRadius * 2, $plateRadius * 2, 90, 180)
    $platePath.AddArc(($pX + $plateWidth - $plateRadius * 2), $pY, $plateRadius * 2, $plateRadius * 2, 270, 180)
    $platePath.CloseFigure()
    $g.FillPath($goldBrush, $platePath)

    # 7. Fork & Spoon inside cloche
    $greenPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 46, 106, 0), [Math]::Max(1.0, 1.8 * $scale))
    $greenPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $greenPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    # Fork
    $g.DrawLine($greenPen, (42.0 * $scale), (46.0 * $scale), (42.0 * $scale), (59.0 * $scale))
    $g.DrawLine($greenPen, (39.0 * $scale), (46.0 * $scale), (39.0 * $scale), (51.0 * $scale))
    $g.DrawLine($greenPen, (45.0 * $scale), (46.0 * $scale), (45.0 * $scale), (51.0 * $scale))
    $g.DrawLine($greenPen, (39.0 * $scale), (51.0 * $scale), (45.0 * $scale), (51.0 * $scale))

    # Spoon
    $g.DrawLine($greenPen, (58.0 * $scale), (46.0 * $scale), (58.0 * $scale), (59.0 * $scale))
    $g.DrawEllipse($greenPen, (55.0 * $scale), (46.0 * $scale), (6.0 * $scale), (8.0 * $scale))

    # 8. Golden Sparkle Star
    $starPoints = @(
        (New-Object System.Drawing.PointF (74.0 * $scale), (27.0 * $scale)),
        (New-Object System.Drawing.PointF (75.5 * $scale), (31.0 * $scale)),
        (New-Object System.Drawing.PointF (79.5 * $scale), (31.5 * $scale)),
        (New-Object System.Drawing.PointF (76.5 * $scale), (34.2 * $scale)),
        (New-Object System.Drawing.PointF (77.3 * $scale), (38.2 * $scale)),
        (New-Object System.Drawing.PointF (74.0 * $scale), (36.0 * $scale)),
        (New-Object System.Drawing.PointF (70.7 * $scale), (38.2 * $scale)),
        (New-Object System.Drawing.PointF (71.5 * $scale), (34.2 * $scale)),
        (New-Object System.Drawing.PointF (68.5 * $scale), (31.5 * $scale)),
        (New-Object System.Drawing.PointF (72.5 * $scale), (31.0 * $scale))
    )
    $g.FillPolygon($goldBrush, $starPoints)

    # Save as PNG
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $g.Dispose()
    $bmp.Dispose()
}

$dir = "c:\Users\karki\Documents\foodieshub\public"
$iconsDir = "c:\Users\karki\Documents\foodieshub\public\icons"

if (-not (Test-Path $iconsDir)) { New-Item -ItemType Directory -Path $iconsDir -Force }

Draw-FoodieHubIcon 512 "$iconsDir\foodiehub-512.png"
Draw-FoodieHubIcon 192 "$iconsDir\foodiehub-192.png"
Draw-FoodieHubIcon 64 "$iconsDir\foodiehub-64.png"
Draw-FoodieHubIcon 32 "$iconsDir\foodiehub-32.png"
Draw-FoodieHubIcon 192 "$dir\favicon.png"
Draw-FoodieHubIcon 64 "$dir\favicon.ico"

Write-Output "Successfully generated FoodieHub PNG icons and favicons!"
