namespace PeasyFiles
{
    partial class Form1
    {
        /// <summary>
        ///  Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        private Label label1;

        /// <summary>
        ///  Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        ///  Required method for Designer support - do not modify
        ///  the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            components = new System.ComponentModel.Container();
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(Form1));
            notifyIcon1 = new NotifyIcon(components);
            statusText = new Label();
            errorText = new Label();
            githubButton = new Button();
            installExtensionButton = new Button();
            closeButton = new Button();
            minimizeButton = new Button();
            SuspendLayout();
            // 
            // notifyIcon1
            // 
            notifyIcon1.Icon = (Icon)resources.GetObject("notifyIcon1.Icon");
            notifyIcon1.Text = "Peasy Files";
            notifyIcon1.DoubleClick += notifyIcon1_Click;
            // 
            // statusText
            // 
            statusText.BackColor = Color.Transparent;
            statusText.Font = new Font("Segoe UI", 30F);
            statusText.Location = new Point(36, 317);
            statusText.Name = "statusText";
            statusText.Size = new Size(500, 70);
            statusText.TabIndex = 0;
            statusText.Text = "Loading...";
            statusText.TextAlign = ContentAlignment.MiddleCenter;
            // 
            // errorText
            // 
            errorText.BackColor = Color.Transparent;
            errorText.Font = new Font("Segoe UI", 11F);
            errorText.ForeColor = Color.FromArgb(237, 194, 207);
            errorText.Location = new Point(31, 379);
            errorText.Name = "errorText";
            errorText.Size = new Size(500, 20);
            errorText.TabIndex = 1;
            errorText.TextAlign = ContentAlignment.TopCenter;
            // 
            // githubButton
            // 
            githubButton.BackColor = Color.Transparent;
            githubButton.Cursor = Cursors.Hand;
            githubButton.FlatAppearance.BorderSize = 0;
            githubButton.FlatAppearance.MouseDownBackColor = Color.Transparent;
            githubButton.FlatAppearance.MouseOverBackColor = Color.Transparent;
            githubButton.FlatStyle = FlatStyle.Flat;
            githubButton.Image = Properties.Resources.GithubButton;
            githubButton.Location = new Point(12, 402);
            githubButton.Name = "githubButton";
            githubButton.Size = new Size(263, 65);
            githubButton.TabIndex = 2;
            githubButton.UseVisualStyleBackColor = false;
            githubButton.Click += githubButton_Click;
            // 
            // installExtensionButton
            // 
            installExtensionButton.BackColor = Color.Transparent;
            installExtensionButton.Cursor = Cursors.Hand;
            installExtensionButton.FlatAppearance.BorderSize = 0;
            installExtensionButton.FlatAppearance.MouseDownBackColor = Color.Transparent;
            installExtensionButton.FlatAppearance.MouseOverBackColor = Color.Transparent;
            installExtensionButton.FlatStyle = FlatStyle.Flat;
            installExtensionButton.Image = Properties.Resources.BuyCoffeeButton;
            installExtensionButton.Location = new Point(309, 402);
            installExtensionButton.Name = "installExtensionButton";
            installExtensionButton.Size = new Size(263, 65);
            installExtensionButton.TabIndex = 3;
            installExtensionButton.UseVisualStyleBackColor = false;
            installExtensionButton.Click += installExtensionButton_Click;
            // 
            // closeButton
            // 
            closeButton.BackColor = Color.Transparent;
            closeButton.Cursor = Cursors.Hand;
            closeButton.FlatAppearance.BorderSize = 0;
            closeButton.FlatStyle = FlatStyle.Flat;
            closeButton.Font = new Font("Segoe UI", 11F);
            closeButton.Location = new Point(527, 167);
            closeButton.Name = "closeButton";
            closeButton.Size = new Size(29, 31);
            closeButton.TabIndex = 4;
            closeButton.Text = "X";
            closeButton.UseVisualStyleBackColor = false;
            closeButton.Click += closeButton_Click;
            // 
            // minimizeButton
            // 
            minimizeButton.BackColor = Color.Transparent;
            minimizeButton.Cursor = Cursors.Hand;
            minimizeButton.FlatAppearance.BorderSize = 0;
            minimizeButton.FlatStyle = FlatStyle.Flat;
            minimizeButton.Font = new Font("Segoe UI", 11F);
            minimizeButton.Location = new Point(497, 164);
            minimizeButton.Name = "minimizeButton";
            minimizeButton.Size = new Size(30, 32);
            minimizeButton.TabIndex = 5;
            minimizeButton.Text = "__";
            minimizeButton.UseVisualStyleBackColor = false;
            minimizeButton.Click += minimizeButton_Click;
            // 
            // Form1
            // 
            AutoScaleDimensions = new SizeF(7F, 15F);
            AutoScaleMode = AutoScaleMode.Font;
            BackgroundImage = Properties.Resources.PeasyFilesBackground;
            BackgroundImageLayout = ImageLayout.Stretch;
            ClientSize = new Size(584, 489);
            Controls.Add(minimizeButton);
            Controls.Add(closeButton);
            Controls.Add(installExtensionButton);
            Controls.Add(githubButton);
            Controls.Add(errorText);
            Controls.Add(statusText);
            DoubleBuffered = true;
            ForeColor = Color.FromArgb(151, 208, 238);
            FormBorderStyle = FormBorderStyle.None;
            Icon = (Icon)resources.GetObject("$this.Icon");
            Margin = new Padding(2);
            Name = "Form1";
            Text = "PeasyFiles";
            FormClosing += Form1_FormClosing;
            Resize += Form1_Resize;
            ResumeLayout(false);
        }

        #endregion
        private NotifyIcon notifyIcon1;
        private Label statusText;
        private Label errorText;
        private Button githubButton;
        private Button installExtensionButton;
        private Button closeButton;
        private Button minimizeButton;
    }
}
