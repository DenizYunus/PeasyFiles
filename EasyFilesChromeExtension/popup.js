document.addEventListener('DOMContentLoaded', async () => {
  const clipboardContent = document.getElementById('clipboard-content');
  const downloadsPreview = document.getElementById('downloads-preview');
  const browseButton = document.getElementById('browse-button');
  const statusIndicator = document.getElementById('status-indicator');
  const closeButton = document.getElementById('close-button');
  let requiredFileType = '';

  // Add message listener to get required file type from content script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'fileInputType') {
      console.log('Received file input type:', message.accept);
      requiredFileType = message.accept;
      // Re-fetch clipboard content after receiving file type requirements
      fetchClipboard();
    }
  });

  function isFileTypeAllowed(filename) {
    if (!requiredFileType) {
      console.log('No file type requirements set');
      return true;
    }
    
    const fileExt = '.' + filename.split('.').pop().toLowerCase();
    // console.log('Checking file:', { fileExt, requiredFileType });
    
    const allowedTypes = requiredFileType.split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.startsWith('.'));
      
    const isAllowed = allowedTypes.includes(fileExt);
    // console.log('File type check:', {
    //   fileExt,
    //   allowedTypes,
    //   isAllowed,
    //   requiredFileType
    // });
    return isAllowed;
  }

  function getFileTypeWarning(filename) {
    if (!requiredFileType) return '';
    const fileExt = '.' + filename.split('.').pop().toLowerCase();
    const allowedTypes = requiredFileType.split(',')
      .map(t => t.trim())
      .filter(t => t.startsWith('.'))
      .join(', ');
    return `Not supported (file type: ${fileExt}, allowed types: ${allowedTypes})`;
  }

  async function fetchClipboard() {
    try {
      const response = await fetch('http://localhost:3169/api/clipboard');
      if (!response.ok) throw new Error('Server error');
      
      const data = await response.json();
      if (data.FileName) {
        const isAllowed = isFileTypeAllowed(data.FileName);
        const isImage = data.FileName.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp|bmp|tif|tiff|heic)$/);
        const warning = getFileTypeWarning(data.FileName);
        
        console.log('File check:', {
          filename: data.FileName,
          isAllowed,
          requiredType: requiredFileType
        });

        clipboardContent.innerHTML = `
          <div class="content-item ${isAllowed ? '' : 'unsupported'}">
            <div class="filename">${data.FileName}</div>
            ${!isAllowed ? `<div class="type-warning">${warning}</div>` : ''}
            ${isImage ? 
              `<img src="data:image/png;base64,${data.FileContent}" alt="Preview" />` : 
              `<div class="file-icon">${getFileIcon(data.FileName)}</div>`}
          </div>`;
      } else {
        clipboardContent.innerHTML = '<div class="empty-message">No clipboard content</div>';
      }
    } catch (error) {
      clipboardContent.innerHTML = '<div class="error-message">Could not fetch clipboard content</div>';
    }
  }

  function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
      // Images
      png: '🖼️ [IMG]', jpg: '🖼️ [IMG]', jpeg: '🖼️ [IMG]', gif: '🖼️ [IMG]', webp: '🖼️ [IMG]',
      // Documents
      pdf: '📄 [PDF]', doc: '📝 [DOC]', docx: '📝 [DOC]', txt: '📋 [TXT]',
      xls: '📊 [XLS]', xlsx: '📊 [XLS]', csv: '📊 [CSV]',
      ppt: '📊 [PPT]', pptx: '📊 [PPT]',
      // Archives
      zip: '📦 [ZIP]', rar: '📦 [RAR]', '7z': '📦 [7Z]',
      // Media
      mp4: '🎥 [VID]', mp3: '🎵 [AUD]', wav: '🎵 [AUD]',
      // Default
      default: '📎 [FILE]'
    };
    return icons[ext] || icons.default;
  }

  async function fetchDownloads() {
    try {
      console.log('Fetching downloads...');
      const response = await fetch('http://localhost:3169/api/downloads');
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const files = await response.json();
      console.log(`Total files received: ${files.length}`);
      
      // Store files in memory for quick access during selection
      window.downloadedFiles = files;
      
      const compatibleFiles = files.filter(file => {
        const isAllowed = isFileTypeAllowed(file.FileName);
        console.log(`Checking file: ${file.FileName} - Allowed: ${isAllowed}`);
        return isAllowed;
      });
      
      if (compatibleFiles.length > 0) {
        downloadsPreview.innerHTML = `<div class="downloads-grid">
          ${compatibleFiles.map(file => {
            const isImage = file.FileName.toLowerCase().match(/\.(png|jpg|jpeg|gif|webp|bmp)$/);
            return `
              <div class="grid-item" data-filename="${file.FileName}">
                <div class="preview-container">
                  ${isImage ? 
                    `<img src="data:image/png;base64,${file.FileContent}" alt="${file.FileName}" />` :
                    `<div class="file-icon">${getFileIcon(file.FileName)}</div>`
                  }
                </div>
                <div class="filename">${file.FileName}</div>
              </div>
            `;
          }).join('')}
        </div>`;

        // Add click handler for grid items
        document.querySelectorAll('.grid-item').forEach(item => {
          item.addEventListener('click', async () => {
            try {
              const fileName = item.dataset.filename;
              // Use stored files instead of fetching again
              const selectedFile = window.downloadedFiles.find(f => f.FileName === fileName);
              
              if (selectedFile && isFileTypeAllowed(selectedFile.FileName)) {
                console.log('Selected file:', selectedFile.FileName);
                await handleFileSelection(selectedFile);
                console.log('File selection handled, closing popup');
                window.parent.postMessage({ type: 'closePopup' }, '*');
              }
            } catch (error) {
              console.error('Error handling grid item selection:', error);
            }
          });
        });
      } else {
        downloadsPreview.innerHTML = '<div class="empty-message">No compatible files found among ' + files.length + ' downloads</div>';
      }
    } catch (error) {
      console.error('Error fetching downloads:', error);
      downloadsPreview.innerHTML = `<div class="error-message">Could not fetch downloads: ${error.message}</div>`;
    }
  }

  function handleFileSelection(fileData) {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({active: true}, function(tabs) {
        const activeTabs = tabs.filter(tab => !tab.url.includes('popup.html'));
        if (activeTabs.length > 0) {
          chrome.tabs.sendMessage(activeTabs[0].id, {
            type: 'fileSelected',
            data: fileData
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error sending message:', chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              console.log('File selection message sent successfully');
              resolve();
            }
          });
        } else {
          reject(new Error('No active tab found'));
        }
      });
    });
  }

  // Add click handlers for clipboard and download items
  clipboardContent.addEventListener('click', async (e) => {
    const contentItem = e.target.closest('.content-item');
    if (!contentItem || contentItem.classList.contains('unsupported')) {
      return; // Don't allow clicking on unsupported files
    }

    try {
      const response = await fetch('http://localhost:3169/api/clipboard');
      const data = await response.json();
      if (isFileTypeAllowed(data.FileName)) {
        handleFileSelection(data);
        // Close popup after successful selection
        window.parent.postMessage({ type: 'closePopup' }, '*');
      }
    } catch (error) {
      console.error('Error handling selection:', error);
    }
  });

  closeButton.addEventListener('click', () => {
    // Send message to parent window through chrome runtime
    window.parent.postMessage({ type: 'closePopup' }, '*');
  });

  browseButton.addEventListener('click', () => {
    // Send message to content script to trigger native file picker
    chrome.tabs.query({active: true}, function(tabs) {
      const activeTabs = tabs.filter(tab => !tab.url.includes('popup.html'));
      if (activeTabs.length > 0) {
        chrome.tabs.sendMessage(activeTabs[0].id, {
          type: 'triggerNativeFilePicker'
        });
        // Close popup
        window.parent.postMessage({ type: 'closePopup' }, '*');
      }
    });
  });

  // Check mediator connection
  try {
    const response = await fetch('http://localhost:3169/api/clipboard', { method: 'OPTIONS' });
    if (response.ok) {
      statusIndicator.textContent = '[✓] Connected';
      statusIndicator.className = 'status-success';
    }
  } catch {
    statusIndicator.textContent = '[X] Not Connected, Install & Start Desktop App';
    statusIndicator.style.cursor = 'pointer';
    statusIndicator.addEventListener('click', () => {
      window.open('https://github.com/denizariyan/EasyFiles/releases/latest', '_blank');
    });
    statusIndicator.className = 'status-error';
  }

  // Only fetch initially without file type requirements
  await fetchClipboard();
  await fetchDownloads();
});
