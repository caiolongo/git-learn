# Janela de controle do servidor GH-900: roda "npm start", mostra status e porta,
# e desliga o servidor (com todos os processos filhos) ao fechar.
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$dir = $PSScriptRoot
$log = Join-Path $env:TEMP 'gh900-servidor.log'

function Get-FreePort {
    for ($p = 8000; $p -lt 8100; $p++) {
        try {
            $l = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $p)
            $l.Start(); $l.Stop()
            return $p
        } catch { }
    }
    throw 'Nenhuma porta livre entre 8000 e 8099.'
}

function Test-Port([int]$p) {
    $c = [System.Net.Sockets.TcpClient]::new()
    try { return $c.ConnectAsync('127.0.0.1', $p).Wait(200) -and $c.Connected }
    catch { return $false }
    finally { $c.Dispose() }
}

function Stop-Server {
    if ($script:proc -and -not $script:proc.HasExited) {
        # /T encerra a árvore inteira: cmd -> npm -> node
        & taskkill.exe /PID $script:proc.Id /T /F 2>$null | Out-Null
    }
    # Garantia extra: encerra quem ainda estiver escutando na porta do servidor.
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

# ---------- Inicia o servidor ----------
try { $port = Get-FreePort } catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'GH-900', 'OK', 'Error') | Out-Null
    exit 1
}
$env:PORT = "$port"
# As dependências (node_modules) são instaladas pelo "Iniciar GH-900.bat" antes de abrir esta janela.
# CreateNoWindow: o servidor roda sem nenhuma janela de console (nem no Windows Terminal).
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = 'cmd.exe'
$psi.Arguments = "/c npm start > `"$log`" 2>&1"
$psi.WorkingDirectory = $dir
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$script:proc = [System.Diagnostics.Process]::Start($psi)
$url = "http://localhost:$port"

# ---------- Janela ----------
$form = New-Object System.Windows.Forms.Form
$form.Text = 'Servidor GH-900'
$form.ClientSize = New-Object System.Drawing.Size(360, 140)
$form.FormBorderStyle = 'FixedDialog'
$form.MaximizeBox = $false
$form.StartPosition = 'CenterScreen'
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

$status = New-Object System.Windows.Forms.Label
$status.Location = New-Object System.Drawing.Point(16, 14)
$status.Size = New-Object System.Drawing.Size(330, 24)
$status.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($status)

$detail = New-Object System.Windows.Forms.LinkLabel
$detail.Location = New-Object System.Drawing.Point(16, 42)
$detail.Size = New-Object System.Drawing.Size(330, 40)
$detail.LinkArea = New-Object System.Windows.Forms.LinkArea(0, 0)
$detail.add_LinkClicked({ Start-Process $url })
$form.Controls.Add($detail)

$open = New-Object System.Windows.Forms.Button
$open.Text = 'Abrir no navegador'
$open.Location = New-Object System.Drawing.Point(16, 92)
$open.Size = New-Object System.Drawing.Size(155, 32)
$open.Enabled = $false
$open.add_Click({ Start-Process $url })
$form.Controls.Add($open)

$stop = New-Object System.Windows.Forms.Button
$stop.Text = 'Desligar e fechar'
$stop.Location = New-Object System.Drawing.Point(189, 92)
$stop.Size = New-Object System.Drawing.Size(155, 32)
$stop.add_Click({ $form.Close() })
$form.Controls.Add($stop)

function Set-Status([string]$text, [System.Drawing.Color]$color, [string]$info, [bool]$link) {
    $status.Text = $text
    $status.ForeColor = $color
    $detail.Text = $info
    $detail.LinkArea = if ($link) { New-Object System.Windows.Forms.LinkArea($info.IndexOf($url), $url.Length) }
                       else { New-Object System.Windows.Forms.LinkArea(0, 0) }
}

Set-Status '● Iniciando…' ([System.Drawing.Color]::DarkOrange) "Compilando o TypeScript e subindo na porta $port." $false

# ---------- Monitora o processo e a porta ----------
$script:state = 'starting'
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 700
$timer.add_Tick({
    $up = Test-Port $port
    # Só considera parado se o processo terminou E a porta não responde.
    if ($script:proc.HasExited -and -not $up) {
        if ($script:state -ne 'stopped') {
            $script:state = 'stopped'
            $open.Enabled = $false
            $stop.Text = 'Fechar'
            $tail = if (Test-Path $log) { (Get-Content $log -Tail 3 -ErrorAction SilentlyContinue) -join ' ' } else { '' }
            Set-Status '● Servidor parado' ([System.Drawing.Color]::Firebrick) "O processo terminou. $tail" $false
        }
        return
    }
    if ($up -and $script:state -ne 'running') {
        $script:state = 'running'
        $open.Enabled = $true
        Set-Status '● Servidor ativo' ([System.Drawing.Color]::ForestGreen) "Porta $port  ·  $url" $true
        if (-not $script:browserOpened) {
            $script:browserOpened = $true
            Start-Process $url
        }
    } elseif (-not $up -and $script:state -eq 'running') {
        $script:state = 'starting'
        $open.Enabled = $false
        Set-Status '● Sem resposta' ([System.Drawing.Color]::DarkOrange) "A porta $port parou de responder." $false
    }
})

$form.add_FormClosing({ $timer.Stop(); Stop-Server })
$timer.Start()
[System.Windows.Forms.Application]::Run($form)
