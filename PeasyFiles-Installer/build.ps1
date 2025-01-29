; Inno Setup Script for PeasyFiles

[Setup]
AppName=PeasyFiles
AppVersion=1.0
DefaultDirName={pf}\PeasyFiles
DefaultGroupName=PeasyFiles
OutputDir=.
OutputBaseFilename=PeasyFilesInstaller
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin

[Files]
; Specify the main executable and any DLLs or other files needed
Source: "Path\To\Your\Executable\EasyFilesExtensionMediator.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "Path\To\Your\DLLs\*.dll"; DestDir: "{app}"; Flags: ignoreversion; OnlyCopyOnDemand
; Add any other files you need to include in the installation
Source: "Path\To\Your\Icons\*"; DestDir: "{app}\icons"; Flags: ignoreversion; OnlyCopyOnDemand

[Icons]
; Create a shortcut in the Start Menu
Name: "{group}\PeasyFiles"; Filename: "{app}\EasyFilesExtensionMediator.exe"
; Create a shortcut on the Desktop
Name: "{userdesktop}\PeasyFiles"; Filename: "{app}\EasyFilesExtensionMediator.exe"

[Registry]
; Add a registry entry to run the application at startup
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "PeasyFiles"; ValueData: """{app}\EasyFilesExtensionMediator.exe"""; Flags: uninsdeletevalue

[Run]
; Optionally run the application after installation
Filename: "{app}\EasyFilesExtensionMediator.exe"; Description: "Launch PeasyFiles"; Flags: nowait postinstall skipifsilent