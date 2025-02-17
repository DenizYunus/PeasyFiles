# PeasyFiles Extension Permissions Justification

## Single Purpose
PeasyFiles has a single, clear purpose: To simplify file uploads by providing quick access to clipboard content and recent downloads directly from any file upload button, eliminating the need to navigate through folders.

## Permission Justifications

### `"tabs"` Permission
Required to:
- Communicate with the active tab to identify file input elements
- Send file selection data back to the originating tab
- Ensure the file is uploaded to the correct form field

### `"activeTab"` Permission
Required to:
- Access the current tab's content only when the user interacts with a file input
- Inject necessary content scripts for file input detection
- Maintain security by limiting access to the active tab only during upload interactions

### Host Permission: `"http://localhost:3169/*"`
Required to:
- Communicate with the local desktop companion app
- Access clipboard contents and recent downloads
- No remote server communication, strictly localhost only

## Remote Code
This extension does not use any remote code. All functionality is self-contained within the extension and the local desktop companion app. No external scripts or resources are loaded.

## Privacy Policy

URL: https://github.com/DenizYunus/PeasyFiles/blob/main/docs/PRIVACY.md

Key Points:
1. All data processing happens locally on your device
2. No data is sent to external servers
3. No user data is collected or stored
4. Files are accessed only when explicitly selected by the user
5. Communication only occurs between:
   - The browser extension
   - The local desktop companion app
   - The active webpage's file input
