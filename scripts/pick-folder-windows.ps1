Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::EnableVisualStyles() | Out-Null

$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
$form.Opacity = 0
$form.ShowInTaskbar = $false
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$form.Size = New-Object System.Drawing.Size(1, 1)
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$form.Location = New-Object System.Drawing.Point(-2000, -2000)
$form.Show()
$form.Activate()

$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Wybierz folder projektu (CodeMaps)'
$dialog.ShowNewFolderButton = $false

if ($args.Count -ge 1 -and $args[0] -and (Test-Path -LiteralPath $args[0])) {
  $dialog.SelectedPath = $args[0]
}

$result = $dialog.ShowDialog($form)
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::Out.Write($dialog.SelectedPath)
}

$form.Close()
$form.Dispose()
