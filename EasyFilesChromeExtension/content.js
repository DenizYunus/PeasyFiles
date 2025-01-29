let lastClickedInput = null;
let popupContainer = null;

function createPopupContainer(position) {
  // Remove existing popup if any
  if (popupContainer) {
    document.body.removeChild(popupContainer);
  }

  // Create new popup container
  popupContainer = document.createElement('div');
  popupContainer.id = 'easyfiles-popup';
  popupContainer.style.cssText = `
    position: absolute;
    z-index: 999999;
    width: 350px;
    height: 400px;
    background: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-radius: 8px;
    overflow: hidden;
  `;

  // Calculate position
  const { x, y, width, height } = position;
  let left = x + width + 5;
  let top = y;

  // Adjust if would go off-screen
  if (left + 350 > window.innerWidth) {
    left = x - 350 - 5;
  }
  if (top + 400 > window.innerHeight) {
    top = window.innerHeight - 410;
  }

  popupContainer.style.left = `${Math.max(10, left)}px`;
  popupContainer.style.top = `${Math.max(10, top)}px`;

  // Create and add iframe
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('popup.html');
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 8px;
  `;
  popupContainer.appendChild(iframe);
  document.body.appendChild(popupContainer);

  // Close popup when clicking outside
  document.addEventListener('click', handleOutsideClick);
}

function handleOutsideClick(e) {
  if (popupContainer && !popupContainer.contains(e.target) && e.target.type !== 'file') {
    document.body.removeChild(popupContainer);
    popupContainer = null;
    document.removeEventListener('click', handleOutsideClick);
  }
}

function handleFileInputClick(e) {
  if (e.target.type === 'file') {
    e.preventDefault();
    e.stopPropagation();
    lastClickedInput = e.target;
    
    const rect = e.target.getBoundingClientRect();
    createPopupContainer({
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height
    });

    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: 'fileInputType',
        accept: e.target.accept
      });
    }, 100);
  }
}

document.addEventListener('click', handleFileInputClick, true);

// Add message listener for close button
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'closePopup' && popupContainer) {
    document.body.removeChild(popupContainer);
    popupContainer = null;
    document.removeEventListener('click', handleOutsideClick);
  }
});

// Add window message listener for iframe communication
window.addEventListener('message', (event) => {
  if (event.data.type === 'closePopup' && popupContainer) {
    document.body.removeChild(popupContainer);
    popupContainer = null;
    document.removeEventListener('click', handleOutsideClick);
  }
});

// Listen for selected file from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message); // Debug log
  if (message.type === 'fileSelected' && message.data) {
    const { FileName: filename, FileContent: content } = message.data;
    
    // Check if file type is allowed for this input
    const acceptAttribute = lastClickedInput?.accept;
    if (!isFileTypeAllowed(filename, acceptAttribute)) {
      console.error('File type not allowed for this input');
      if (popupContainer) {
        document.body.removeChild(popupContainer);
        popupContainer = null;
        document.removeEventListener('click', handleOutsideClick);
      }
      return true;
    }
    
    // Create a proper File object from base64
    const byteString = atob(content);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    const mimeType = getMimeType(filename);
    const blob = new Blob([ab], { type: mimeType });
    const file = new File([blob], filename, { type: mimeType });

    // Create and set the FileList
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    // Add debug logs
    console.log('File input found:', !!lastClickedInput);
    console.log('File data:', message.data);

    // Find and update the file input
    if (lastClickedInput) {
      try {
        lastClickedInput.files = dataTransfer.files;
        const event = new Event('change', { bubbles: true });
        lastClickedInput.dispatchEvent(event);
        console.log('File set successfully');
      } catch (error) {
        console.error('Error setting file:', error);
      }
      
      // Dispatch both change and input events
      lastClickedInput.dispatchEvent(new Event('change', { bubbles: true }));
      lastClickedInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // For React/modern frameworks
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      ).set;
      nativeInputValueSetter.call(lastClickedInput, '');
      lastClickedInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Close popup after successful file selection
    if (popupContainer) {
      document.body.removeChild(popupContainer);
      popupContainer = null;
      document.removeEventListener('click', handleOutsideClick);
    }
  }
  return true; // Important: indicates we will respond asynchronously
});

// Add message listener for native file picker trigger
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'triggerNativeFilePicker' && lastClickedInput) {
    // Store the original click handler
    const originalClickHandler = lastClickedInput.onclick;
    
    // Remove our capture phase listener
    document.removeEventListener('click', handleFileInputClick, true);
    
    // Clear any existing click handlers
    lastClickedInput.onclick = null;
    
    try {
      // Create and dispatch a native click event
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      lastClickedInput.dispatchEvent(clickEvent);
    } finally {
      // Restore our capture phase listener after a short delay
      setTimeout(() => {
        document.addEventListener('click', handleFileInputClick, true);
        // Restore original click handler if any
        if (originalClickHandler) {
          lastClickedInput.onclick = originalClickHandler;
        }
      }, 100);
    }
  }
  return true;
});

function isFileTypeAllowed(filename, acceptAttribute) {
  if (!acceptAttribute) return true;
  
  const fileExt = '.' + filename.split('.').pop().toLowerCase();
  console.log('Content script checking file:', { fileExt, acceptAttribute });
  
  const allowedTypes = acceptAttribute.split(',')
    .map(t => t.trim().toLowerCase())
    .filter(t => t.startsWith('.'));
    
  console.log('Content script allowed types:', allowedTypes);
  return allowedTypes.includes(fileExt);
}

function getMimeType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const mimeTypes = {
    // Images
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    'txt': 'text/plain',
    'csv': 'text/csv',
    'json': 'application/json',
    'xml': 'application/xml',
    // Archives
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    // Other
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}
