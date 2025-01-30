[Setup]
AppName=PeasyFiles
AppVersion=1.0
DefaultDirName={pf}\PeasyFiles
DefaultGroupName=PeasyFiles
UninstallDisplayIcon={app}\PeasyFiles.exe
Compression=lzma2
SolidCompression=yes
OutputDir=.
OutputBaseFilename=PeasyFilesInstaller
ArchitecturesInstallIn64BitMode=x64

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional icons:"

[Files]
Source: "build/*"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\PeasyFiles"; Filename: "{app}\PeasyFiles.exe"
Name: "{commondesktop}\PeasyFiles"; Filename: "{app}\PeasyFiles.exe"; Tasks: desktopicon

[Registry]
; Auto-start application on Windows login
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "PeasyFiles"; ValueData: "{app}\PeasyFiles.exe"; Flags: uninsdeletevalue

[Run]
; Run the application after installation (optional)
Filename: "{app}\PeasyFiles.exe"; Description: "Launch PeasyFiles"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Remove installation directory on uninstall
Type: filesandordirs; Name: "{app}"
