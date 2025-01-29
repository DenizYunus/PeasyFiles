# application using Inno Setup, you will need to follow these steps:

1. **Download and Install Inno Setup**: If you haven't already, download and install Inno Setup from [here](https://jrsoftware.org/isinfo.php).

2. **Prepare Your Application**: Ensure that your C# application is built and all necessary files (including DLLs) are in the output directory. You will typically find these in the `bin\Release` or `bin\Debug` folder of your project.

3. **Create an Inno Setup Script**: Create a new `.iss` file (Inno Setup Script) that will define how your installer will behave. Below is a sample script tailored for your project, `PeasyFiles`.

### Sample Inno Setup Script

```pascal
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
DisableProgramGroupPage=yes
DisableReadyPage=yes

[Files]
; Main executable
Source: "Path\To\Your\Executable\EasyFilesExtensionMediator.exe"; DestDir: "{app}"; Flags: ignoreversion
; Include all DLLs and other necessary files
Source: "Path\To\Your\Executable\*.dll"; DestDir: "{app}"; Flags: ignoreversion
; Include any other files your application needs
Source: "Path\To\Your\Executable\*.*"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\PeasyFiles"; Filename: "{app}\EasyFilesExtensionMediator.exe"
Name: "{userdesktop}\PeasyFiles"; Filename: "{app}\EasyFilesExtensionMediator.exe"; Tasks: desktopicon

[Run]
; Run the application after installation
Filename: "{app}\EasyFilesExtensionMediator.exe"; Description: "Launch PeasyFiles"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Optionally, you can specify actions to take on uninstall
```

### Explanation of the Script Sections

- **[Setup]**: This section contains general information about your application, such as its name, version, and where to install it.

- **[Files]**: This section specifies which files to include in the installer. You should replace `Path\To\Your\Executable\` with the actual path to your built application files. The `*.dll` wildcard will include all DLLs in the specified directory.

- **[Icons]**: This section creates shortcuts for your application in the Start Menu and optionally on the Desktop.

- **[Run]**: This section specifies that the application should be launched after installation.

- **[UninstallRun]**: This section can be used to specify actions to take when the application is uninstalled.

### Steps to Build the Installer

1. **Open Inno Setup**: Launch the Inno Setup Compiler.

2. **Create a New Script**: You can either create a new script using the wizard or paste the above script into a new script file.

3. **Compile the Script**: Click on the "Compile" button (or press F9) to build your installer. If there are no errors, Inno Setup will create an installer executable in the specified output directory.

4. **Test the Installer**: Run the generated installer to ensure that it installs your application correctly and that the application starts as expected.

### Additional Considerations

- **Autostart on Windows Startup**: If you want your application to start automatically when Windows starts, you can add a registry entry in the `[Registry]` section of your script:

```pascal
[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "PeasyFiles"; ValueData: """{app}\EasyFilesExtensionMediator.exe"""; Flags: uninsdeletevalue
```

This will add an entry to the Windows registry that runs your application on startup.

- **Testing**: Always test your installer on a clean machine or virtual machine to ensure that all dependencies are included and that the installation process works as expected.

By following these steps, you should be able to create a functional installer for your PeasyFiles application using Inno Setup.