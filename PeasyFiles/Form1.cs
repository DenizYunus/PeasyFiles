using Microsoft.Win32;
using System.Diagnostics;
using System.IO.Compression;
using System.Net;
using System.Text;
using System.Text.Json;

namespace PeasyFiles
{
    public partial class Form1 : Form
    {
        private const string EXTENSION_ID = "neopmcfedjmjlliompjgadnadeceepfo";
        private const string EXTENSION_VERSION = "1.0";
        private readonly string EXTENSION_PATH;
        private HttpListener _listener;
        private Thread _listenerThread;
        private bool hideOnStartup = false;
        private ContextMenuStrip formContextMenu;
        private ContextMenuStrip trayContextMenu;

        public Form1()
        {
            InitializeComponent();
            InitializeContextMenus();
            this.BackColor = Color.FromArgb(255, 200, 200, 200);
            this.TransparencyKey = Color.FromArgb(255, 200, 200, 200);

            EXTENSION_PATH = Path.Combine(Application.StartupPath, "PeasyFilesChromeExtension.crx");

            LoadSettings();
            CheckAndInstallExtensions();
            StartHttpServer();
        }

        private void LoadSettings()
        {
            try
            {
                using (var key = Microsoft.Win32.Registry.CurrentUser.CreateSubKey(@"Software\PeasyFiles"))
                {
                    bool hide = Convert.ToBoolean(key.GetValue("HideOnStartup", false));
                    hideOnStartup = hide;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading settings: {ex.Message}");
            }
        }

        public void SetHideOnStartup(bool hide)
        {
            try
            {
                using (var key = Microsoft.Win32.Registry.CurrentUser.CreateSubKey(@"Software\PeasyFiles"))
                {
                    key.SetValue("HideOnStartup", hide);
                    hideOnStartup = hide;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving settings: {ex.Message}");
            }
        }

        private void CheckAndInstallExtensions()
        {
            try
            {
                // Only install for Chrome
                InstallForBrowser("Chrome", @"SOFTWARE\WOW6432Node\Google\Chrome\Extensions\");
            }
            catch (Exception ex)
            {
                errorText.Text = "Failed to check extensions: " + ex.Message;
                Console.WriteLine($"Extensions check error: {ex}");
            }
        }

        private void InstallForBrowser(string browserName, string registryBasePath)
        {
            try
            {
                var registryPath = registryBasePath + EXTENSION_ID;
                var key = Microsoft.Win32.Registry.LocalMachine.OpenSubKey(registryPath);

                if (key == null || key.GetValue("version")?.ToString() != EXTENSION_VERSION)
                {
                    InstallExtension(browserName, registryPath);
                }
                else
                {
                    Console.WriteLine($"Extension already installed for {browserName}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error checking {browserName} extension: {ex.Message}");
            }
        }

        private void InstallExtension(string browserName, string registryPath)
        {
            try
            {
                // Ensure the CRX file exists
                if (!File.Exists(EXTENSION_PATH))
                {
                    throw new FileNotFoundException("Extension file not found", EXTENSION_PATH);
                }

                using (var key = Microsoft.Win32.Registry.LocalMachine.CreateSubKey(registryPath))
                {
                    key.SetValue("path", EXTENSION_PATH, Microsoft.Win32.RegistryValueKind.String);
                    key.SetValue("version", EXTENSION_VERSION, Microsoft.Win32.RegistryValueKind.String);
                }

                Console.WriteLine($"Extension installed successfully for {browserName}");

                // Prompt user to restart browser
                Console.WriteLine(
                    $"The PeasyFiles extension has been installed for {browserName}. Please restart {browserName} to complete the installation.",
                    "Installation Complete"
                    //MessageBoxButtons.OK,
                    //MessageBoxIcon.Information
                );
            }
            catch (Exception ex)
            {
                errorText.Text = "Failed to install extension: " + ex.Message;
                Console.WriteLine($"Extension installation error: {ex}");

                // Prompt user to run as administrator if needed
                if (ex is UnauthorizedAccessException)
                {
                    Console.WriteLine(
                        "Please run PeasyFiles as administrator to install the extension.",
                        "Administrator Rights Required"
                        //MessageBoxButtons.OK,
                        //MessageBoxIcon.Warning
                    );
                }
            }
        }

        private void StartHttpServer()
        {
            try
            {
                _listener = new HttpListener();
                _listener.Prefixes.Add("http://localhost:3169/");
                _listener.Start();
                _listenerThread = new Thread(HandleRequests);
                _listenerThread.Start();

                statusText.Text = @"is working \(｡˃ ᵕ ˂ )/♡";
            }
            catch (Exception ex)
            {
                statusText.Text = @"is not working (╥_╥)";
                Console.WriteLine($"Error starting HTTP server: {ex.Message}");
            }

            notifyIcon1.Visible = true;
        }

        protected override void OnMouseDown(MouseEventArgs e)
        {
            base.OnMouseDown(e);
            if (e.Button == MouseButtons.Left)
            {
                Capture = false;
                Message msg = Message.Create(Handle, 0XA1, new IntPtr(2), IntPtr.Zero);
                WndProc(ref msg);
            }
        }

        protected override void OnShown(EventArgs e)
        {
            base.OnShown(e);
            if (hideOnStartup)
            {
                Hide();
                notifyIcon1.Visible = true;
            }
        }

        private void HandleRequests()
        {
            while (_listener.IsListening)
            {
                try
                {
                    var context = _listener.GetContext();
                    Task.Run(() => ProcessRequest(context));
                }
                catch (Exception ex)
                {
                    //Console.WriteLine($"Error handling request: {ex.Message}");
                }
            }
        }

        private void ProcessRequest(HttpListenerContext context)
        {
            try
            {
                var request = context.Request;
                var response = context.Response;

                response.Headers.Add("Access-Control-Allow-Origin", "*");
                response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");

                if (request.HttpMethod == "OPTIONS")
                {
                    response.StatusCode = (int)HttpStatusCode.NoContent;
                    response.Close();
                    return;
                }

                if (request!.Url!.AbsolutePath == "/api/clipboard")
                {
                    ProcessClipboardRequest(response);
                }
                else if (request!.Url!.AbsolutePath == "/api/downloads/list")
                {
                    ProcessDownloadsListRequest(response);
                }
                else if (request!.Url!.AbsolutePath == "/api/downloads/content")
                {
                    string filename = request.QueryString["filename"];
                    ProcessDownloadContentRequest(response, filename);
                }
                else
                {
                    response.StatusCode = (int)HttpStatusCode.NotFound;
                    using (var writer = new StreamWriter(response.OutputStream))
                    {
                        writer.Write("Not Found");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing request: {ex.Message}");
            }
        }

        private void ProcessClipboardRequest(HttpListenerResponse response)
        {
            string fileName = null!;
            byte[] fileContent = null!;

            var thread = new Thread(() =>
            {
                if (Clipboard.ContainsFileDropList())
                {
                    var files = Clipboard.GetFileDropList();
                    if (files.Count > 0)
                    {
                        var filePath = files[0];
                        fileName = Path.GetFileName(filePath);
                        fileContent = File.ReadAllBytes(filePath);
                    }
                }
                else if (Clipboard.ContainsImage())
                {
                    using var image = Clipboard.GetImage();
                    using var ms = new MemoryStream();
                    image.Save(ms, System.Drawing.Imaging.ImageFormat.Png);
                    fileContent = ms.ToArray();
                    fileName = "clipboard-image.png";
                }
                else if (Clipboard.ContainsText())
                {
                    var text = Clipboard.GetText();
                    fileContent = Encoding.UTF8.GetBytes(text);
                    fileName = "clipboard-text.txt";
                }
            });

            thread.SetApartmentState(ApartmentState.STA);
            thread.Start();
            thread.Join();

            if (fileContent != null && fileName != null)
            {
                var responseData = new
                {
                    FileName = fileName,
                    FileContent = Convert.ToBase64String(fileContent)
                };

                var jsonResponse = System.Text.Json.JsonSerializer.Serialize(responseData);
                response.ContentType = "application/json";
                using (var writer = new StreamWriter(response.OutputStream))
                {
                    writer.Write(jsonResponse);
                }
                response.StatusCode = (int)HttpStatusCode.OK;
            }
            else
            {
                response.StatusCode = (int)HttpStatusCode.NoContent;
            }

            response.Close();
        }

        private void ProcessDownloadsListRequest(HttpListenerResponse response)
        {
            try
            {
                const int maxItems = 20;
                const long maxFileSize = 10 * 1024 * 1024;
                var downloadsPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads");
                
                var files = new DirectoryInfo(downloadsPath)
                    .GetFiles()
                    .Where(f => !f.Attributes.HasFlag(FileAttributes.Hidden) && f.Length <= maxFileSize)
                    .OrderByDescending(f => f.LastWriteTime)
                    .Take(maxItems)
                    .Select(f => new
                    {
                        FileName = f.Name,
                        FileSize = f.Length,
                        LastModified = f.LastWriteTime,
                        IsImage = f.Extension.ToLower() switch
                        {
                            ".jpg" or ".jpeg" or ".png" or ".gif" or ".webp" or ".bmp" => true,
                            _ => false
                        },
                        Thumbnail = f.Extension.ToLower() switch
                        {
                            ".jpg" or ".jpeg" or ".png" or ".gif" or ".webp" or ".bmp" => 
                                GenerateThumbnail(f.FullName),
                            _ => null
                        }
                    })
                    .ToList();

                response.ContentType = "application/json";
                var jsonResponse = JsonSerializer.Serialize(files);
                using var writer = new StreamWriter(response.OutputStream);
                writer.Write(jsonResponse);
                response.StatusCode = (int)HttpStatusCode.OK;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing downloads request: {ex}");
                response.StatusCode = (int)HttpStatusCode.InternalServerError;
                using (var writer = new StreamWriter(response.OutputStream))
                {
                    writer.Write($"{{\"error\": \"Failed to process downloads\"}}");
                }
            }
            finally
            {
                response.Close();
            }
        }

        private void ProcessDownloadContentRequest(HttpListenerResponse response, string filename)
        {
            try
            {
                var downloadsPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads");
                var filePath = Path.Combine(downloadsPath, filename);
                
                if (!File.Exists(filePath))
                {
                    response.StatusCode = (int)HttpStatusCode.NotFound;
                    return;
                }

                var fileContent = File.ReadAllBytes(filePath);
                var responseData = new
                {
                    FileName = filename,
                    FileContent = Convert.ToBase64String(fileContent)
                };

                response.ContentType = "application/json";
                var jsonResponse = JsonSerializer.Serialize(responseData);
                using var writer = new StreamWriter(response.OutputStream);
                writer.Write(jsonResponse);
                response.StatusCode = (int)HttpStatusCode.OK;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing request: {ex.Message}");
            }
        }

        private string GenerateThumbnail(string imagePath)
        {
            try
            {
                using var originalImage = Image.FromFile(imagePath);
                
                // Calculate dimensions preserving aspect ratio
                int width = 96;
                int height = 96;
                double ratio = (double)originalImage.Width / originalImage.Height;
                
                if (ratio > 1)
                {
                    // Wider than tall
                    height = (int)(width / ratio);
                }
                else
                {
                    // Taller than wide
                    width = (int)(height * ratio);
                }

                // Create new bitmap with transparency support
                using var thumbnail = new Bitmap(96, 96, System.Drawing.Imaging.PixelFormat.Format32bppArgb);
                using (var graphics = Graphics.FromImage(thumbnail))
                {
                    // Set high quality rendering
                    graphics.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                    graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.HighQuality;
                    graphics.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
                    graphics.CompositingQuality = System.Drawing.Drawing2D.CompositingQuality.HighQuality;
                    
                    // Clear with transparent background
                    graphics.Clear(Color.Transparent);
                    
                    // Calculate centered position
                    int x = (96 - width) / 2;
                    int y = (96 - height) / 2;
                    
                    // Draw the image centered
                    graphics.DrawImage(originalImage, x, y, width, height);
                }

                // Save with transparency
                using var ms = new MemoryStream();
                thumbnail.Save(ms, System.Drawing.Imaging.ImageFormat.Png); // Changed to PNG for transparency
                return Convert.ToBase64String(ms.ToArray());
            }
            catch
            {
                return null;
            }
        }

        private void Form1_FormClosing(object sender, FormClosingEventArgs e)
        {
            _listener.Stop();
            _listenerThread.Join();
        }

        private void Form1_Resize(object sender, EventArgs e)
        {
            if (WindowState == FormWindowState.Minimized)
            {
                // No automatic hiding to system tray on minimize
                // The window will stay in taskbar when minimized
            }
        }

        private void notifyIcon1_Click(object sender, EventArgs e)
        {
            Show();
            WindowState = FormWindowState.Normal;
            notifyIcon1.Visible = false;
        }

        private void githubButton_Click(object sender, EventArgs e)
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = "https://github.com/DenizYunus/PeasyFiles",
                UseShellExecute = true
            });
        }

        private void installExtensionButton_Click(object sender, EventArgs e)
        {
            // Chrome Extension Link
        }

        private void closeButton_Click(object sender, EventArgs e)
        {
            // Hide to system tray instead of closing
            Hide();
            notifyIcon1.Visible = true;
        }

        private void InitializeContextMenus()
        {
            // Form context menu
            formContextMenu = new ContextMenuStrip();
            this.ContextMenuStrip = formContextMenu;

            var formShowItem = new ToolStripMenuItem("Show");
            formShowItem.Click += (s, e) =>
            {
                Show();
                WindowState = FormWindowState.Normal;
            };

            var formHideItem = new ToolStripMenuItem("Hide to Tray");
            formHideItem.Click += (s, e) =>
            {
                Hide();
                notifyIcon1.Visible = true;
            };

            var formHideOnStartupItem = new ToolStripMenuItem("Hide on Startup");

            // Update checkbox state when menu opens
            formContextMenu.Opening += (s, e) =>
            {
                formHideOnStartupItem.Checked = hideOnStartup;
            };

            formHideOnStartupItem.Click += (s, e) =>
            {
                SetHideOnStartup(!hideOnStartup); // Toggle the value
                formHideOnStartupItem.Checked = hideOnStartup; // Will reflect new value
            };

            var formExitItem = new ToolStripMenuItem("Exit");
            formExitItem.Click += (s, e) => Application.Exit();

            formContextMenu.Items.AddRange(new ToolStripItem[] {
                formShowItem,
                formHideItem,
                new ToolStripSeparator(),
                formHideOnStartupItem,
                new ToolStripSeparator(),
                formExitItem
            });

            // Tray icon context menu
            trayContextMenu = new ContextMenuStrip();
            notifyIcon1.ContextMenuStrip = trayContextMenu;

            var trayShowItem = new ToolStripMenuItem("Show Window");
            trayShowItem.Click += (s, e) =>
            {
                Show();
                WindowState = FormWindowState.Normal;
                notifyIcon1.Visible = false;
            };

            var trayHideOnStartupItem = new ToolStripMenuItem("Hide on Startup");

            // Update checkbox state when menu opens
            trayContextMenu.Opening += (s, e) =>
            {
                trayHideOnStartupItem.Checked = hideOnStartup;
            };

            trayHideOnStartupItem.Click += (s, e) =>
            {
                SetHideOnStartup(!hideOnStartup); // Toggle the value
                trayHideOnStartupItem.Checked = hideOnStartup; // Will reflect new value
            };

            var openGithubItem = new ToolStripMenuItem("Open GitHub Page");
            openGithubItem.Click += githubButton_Click;

            var trayExitItem = new ToolStripMenuItem("Exit");
            trayExitItem.Click += (s, e) => Application.Exit();

            trayContextMenu.Items.AddRange(new ToolStripItem[] {
                trayShowItem,
                new ToolStripSeparator(),
                trayHideOnStartupItem,
                openGithubItem,
                new ToolStripSeparator(),
                trayExitItem
            });
        }

        private void minimizeButton_Click(object sender, EventArgs e)
        {
            WindowState = FormWindowState.Minimized;
        }
    }
}