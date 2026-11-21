@echo off
rem Duplo clique: instala as dependencias se faltar node_modules e abre a janela de controle do servidor GH-900.
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js/npm nao encontrado. Instale em https://nodejs.org e tente de novo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Primeira execucao: instalando dependencias com npm install...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo Falha no npm install. Veja as mensagens acima.
    pause
    exit /b 1
  )
)

rem O .vbs abre a janela de controle sem console; este terminal fecha em seguida.
start "" wscript.exe //nologo "%~dp0servidor.vbs"
exit
