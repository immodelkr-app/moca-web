$basePath = (Get-Location).Path
$adminFile = Join-Path $basePath "src\components\AdminPage.jsx"
$subsFile = Join-Path $basePath "src\components\AdminSubscriptions.jsx"

function Convert-ToAPlan {
    param([string]$filePath)
    Write-Host "Processing: $filePath"
    $c = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

    $c = $c.Replace('min-h-screen bg-[#0a0a0f] text-white', 'min-h-screen bg-[var(--moca-bg)]')
    $c = $c.Replace('min-h-screen bg-[#0a0a0f] flex', 'min-h-screen bg-[var(--moca-bg)] flex')
    $c = $c.Replace('bg-[#0a0a0f]/90 backdrop-blur-md', 'bg-white/80 backdrop-blur-md')
    $c = $c.Replace('bg-[#1a1a24]', 'bg-white')
    $c = $c.Replace('bg-[#0a0a0f]', 'bg-[var(--moca-surface-2)]')

    $c = $c.Replace('border-white/15', 'border-[var(--moca-border)]')
    $c = $c.Replace('border-white/10', 'border-[var(--moca-border)]')
    $c = $c.Replace('border-white/5', 'border-[var(--moca-border)]')

    $c = $c.Replace('hover:bg-white/8', 'hover:bg-[var(--moca-primary-lt)]')
    $c = $c.Replace('hover:bg-white/10', 'hover:bg-[var(--moca-primary-lt)]')
    $c = $c.Replace('hover:bg-white/5', 'hover:bg-[var(--moca-primary-lt)]')
    $c = $c.Replace('bg-white/5', 'bg-[var(--moca-surface-2)]')
    $c = $c.Replace('bg-white/10', 'bg-[var(--moca-primary-lt)]')

    $c = $c.Replace('placeholder-white/20', 'placeholder-[var(--moca-text-3)]')

    $c = $c.Replace('text-white/90', 'text-[var(--moca-text)]')
    $c = $c.Replace('text-white/80', 'text-[var(--moca-text)]')
    $c = $c.Replace('text-white/70', 'text-[var(--moca-text-2)]')
    $c = $c.Replace('text-white/60', 'text-[var(--moca-text-2)]')
    $c = $c.Replace('text-white/50', 'text-[var(--moca-text-2)]')
    $c = $c.Replace('text-white/40', 'text-[var(--moca-text-3)]')
    $c = $c.Replace('text-white/30', 'text-[var(--moca-text-3)]')
    $c = $c.Replace('text-white/20', 'text-[var(--moca-text-3)]')
    $c = $c.Replace('text-white/15', 'text-[var(--moca-text-3)]')
    $c = $c.Replace('text-white', 'text-[var(--moca-text)]')

    $c = $c.Replace('focus:border-[#6C63FF]', 'focus:border-[var(--moca-primary)]')
    $c = $c.Replace('focus:border-[#C4B5FD]', 'focus:border-[var(--moca-primary)]')
    $c = $c.Replace('focus:border-[#FBBF24]', 'focus:border-[var(--moca-primary)]')
    $c = $c.Replace('focus:border-emerald-500/60', 'focus:border-[var(--moca-primary)]')

    $c = $c.Replace('text-[#818CF8]', 'text-[var(--moca-primary)]')
    $c = $c.Replace('text-[#6C63FF]', 'text-[var(--moca-primary)]')
    $c = $c.Replace('text-[#A78BFA]', 'text-[var(--moca-accent)]')
    $c = $c.Replace('text-[#C4B5FD]', 'text-[var(--moca-accent)]')

    $c = $c.Replace('border-[#C4B5FD]/30', 'border-[var(--moca-primary)]/30')
    $c = $c.Replace('border-[#6C63FF]/50', 'border-[var(--moca-primary)]/50')
    $c = $c.Replace('border-[#6C63FF]/30', 'border-[var(--moca-primary)]/30')
    $c = $c.Replace('border-[#6C63FF]', 'border-[var(--moca-primary)]')

    $c = $c.Replace('hover:bg-[#6C63FF]/40', 'hover:bg-[var(--moca-primary)]/30')
    $c = $c.Replace('hover:bg-[#6C63FF]/30', 'hover:bg-[var(--moca-primary)]/20')
    $c = $c.Replace('hover:bg-[#6C63FF]/20', 'hover:bg-[var(--moca-primary)]/15')
    $c = $c.Replace('hover:bg-[#C4B5FD]/30', 'hover:bg-[var(--moca-primary)]/20')

    $c = $c.Replace('bg-[#6C63FF]/20', 'bg-[var(--moca-primary-lt)]')
    $c = $c.Replace('bg-[#6C63FF]/10', 'bg-[var(--moca-primary-lt)]')
    $c = $c.Replace('bg-[#6C63FF]/40', 'bg-[var(--moca-primary)]/40')
    $c = $c.Replace('bg-[#6C63FF]', 'bg-[var(--moca-primary)]')

    $c = $c.Replace('bg-[#C4B5FD]/20', 'bg-[var(--moca-primary-lt)]')
    $c = $c.Replace('bg-[#C4B5FD]/30', 'bg-[var(--moca-primary)]/20')

    $c = $c.Replace('from-[#6C63FF] to-[#A78BFA]', 'from-[var(--moca-primary)] to-[var(--moca-accent)]')
    $c = $c.Replace('from-[#C4B5FD] to-[#907FF8]', 'from-[var(--moca-accent)] to-[var(--moca-primary)]')

    $c = $c.Replace('border-t-[#6C63FF]', 'border-t-[var(--moca-primary)]')
    $c = $c.Replace('bg-black/40', 'bg-[var(--moca-surface-2)]')

    $c = $c.Replace('shadow-[#5B21B6]/30', 'shadow-[var(--moca-primary)]/20')
    $c = $c.Replace('shadow-[#5B21B6]/50', 'shadow-[var(--moca-primary)]/30')
    $c = $c.Replace('shadow-[#F59E0B]/30', 'shadow-amber-500/20')
    $c = $c.Replace('shadow-[#F59E0B]/50', 'shadow-amber-500/30')

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($filePath, $c, $utf8NoBom)
    Write-Host "Done: $filePath"
}

Convert-ToAPlan $adminFile
Convert-ToAPlan $subsFile
Write-Host "All files converted!"
