[Setup]
AppName=OmniAI
AppVersion=1.0.0
AppPublisher=OmniAI
AppPublisherURL=https://github.com/Perdy14/OmniAI-
DefaultDirName={autopf}\OmniAI
DefaultGroupName=OmniAI
OutputDir=installer_output
OutputBaseFilename=OmniAI_Setup
Compression=lzma2
SolidCompression=yes
UninstallDisplayIcon={app}\OmniAI.exe
PrivilegesRequired=lowest
WizardStyle=modern

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "Crear acceso directo en el escritorio"; GroupDescription: "Iconos adicionales:"
Name: "startmenu"; Description: "Crear acceso directo en el menú inicio"; GroupDescription: "Iconos adicionales:"; Flags: checkedonce

[Files]
Source: "dist\OmniAI.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\OmniAI"; Filename: "{app}\OmniAI.exe"
Name: "{group}\Desinstalar OmniAI"; Filename: "{uninstallexe}"
Name: "{autodesktop}\OmniAI"; Filename: "{app}\OmniAI.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\OmniAI.exe"; Description: "Iniciar OmniAI"; Flags: nowait postinstall skipifsilent
