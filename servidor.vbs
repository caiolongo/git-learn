' Abre servidor.ps1 sem nenhuma janela de console (estilo 0 = oculta desde o inicio).
Set shell = CreateObject("WScript.Shell")
dir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & dir & "\servidor.ps1""", 0, False
