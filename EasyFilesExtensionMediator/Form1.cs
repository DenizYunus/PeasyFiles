using System.Net;
using System.Text;

namespace EasyFilesExtensionMediator
{
    public partial class Form1 : Form
    {
        private HttpListener _listener;
        private Thread _listenerThread;

        public Form1()
        {
            InitializeComponent();
            StartHttpServer();
        }

        private void StartHttpServer()
        {
            _listener = new HttpListener();
            _listener.Prefixes.Add("http://localhost:3169/");
            _listener.Start();
            _listenerThread = new Thread(HandleRequests);
            _listenerThread.Start();
        }

        private void HandleRequests()
        {
            while (_listener.IsListening)
            {
                var context = _listener.GetContext();
                Task.Run(() => ProcessRequest(context));
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

                if (request!.Url!.AbsolutePath == "/api/clipboard" && request.HttpMethod == "GET")
                {
                    ProcessClipboardRequest(response);
                }
                else if (request!.Url!.AbsolutePath == "/api/downloads" && request.HttpMethod == "GET")
                {
                    ProcessDownloadsRequest(response);
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
            string fileName = null;
            byte[] fileContent = null;

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

        private void Form1_FormClosing(object sender, FormClosingEventArgs e)
        {
            _listener.Stop();
            _listenerThread.Join();
        }

        private void ProcessDownloadsRequest(HttpListenerResponse response)
        {
            try
            {
                var downloadsPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads");
                Console.WriteLine($"Scanning downloads folder: {downloadsPath}");

                // Get files and apply size limit of 10MB
                const long maxFileSize = 10 * 1024 * 1024; // 10MB in bytes
                var allFiles = Directory.GetFiles(downloadsPath);
                Console.WriteLine($"Total files found: {allFiles.Length}");

                var files = allFiles
                    .Select(f => new FileInfo(f))
                    .Where(f => f.Length <= maxFileSize && !f.Attributes.HasFlag(FileAttributes.Hidden))
                    .OrderByDescending(f => f.LastWriteTime)
                    .Take(20)  // Increased to show more files
                    .Select(f =>
                    {
                        try
                        {
                            var fileContent = File.ReadAllBytes(f.FullName);
                            Console.WriteLine($"Processing file: {f.Name} ({f.Length / 1024}KB)");
                            return new
                            {
                                FileName = f.Name,
                                FileContent = Convert.ToBase64String(fileContent),
                                FileSize = f.Length,
                                LastModified = f.LastWriteTime
                            };
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Error reading file {f.Name}: {ex.Message}");
                            return null;
                        }
                    })
                    .Where(f => f != null)
                    .ToList();

                Console.WriteLine($"Processed {files.Count} valid files");

                response.ContentType = "application/json";
                var options = new System.Text.Json.JsonSerializerOptions
                {
                    MaxDepth = 64,
                    WriteIndented = false
                };

                var jsonResponse = System.Text.Json.JsonSerializer.Serialize(files, options);
                using (var writer = new StreamWriter(response.OutputStream))
                {
                    writer.Write(jsonResponse);
                }
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

        private void Form1_Resize(object sender, EventArgs e)
        {
            if (WindowState == FormWindowState.Minimized)
            {
                notifyIcon1.Visible = true;
                this.Hide();
            }
        }

        private void notifyIcon1_Click(object sender, EventArgs e)
        {
            this.Show();
            notifyIcon1.Visible = false;
        }
    }
}