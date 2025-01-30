let lastClickedInput = null;
let popupContainer = null;

// Add styles for animation to document head
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes expandPopup {
    0% { 
      transform: scale(0.95);
      opacity: 0;
    }
    100% { 
      transform: scale(1);
      opacity: 1;
    }
  }
  
  @keyframes collapsePopup {
    0% { 
      transform: scale(1);
      opacity: 1;
    }
    100% { 
      transform: scale(0.95);
      opacity: 0;
    }
  }
  
  #easyfiles-popup {
    transform-origin: top center;
    animation: expandPopup 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
  }
  
  #easyfiles-popup.closing {
    animation: collapsePopup 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
  }
`;
document.head.appendChild(styleSheet);

function createPopupContainer(position) {
    // Remove existing popup if any
    if (popupContainer) {
        popupContainer.classList.add('closing');
        setTimeout(() => {
            document.body.removeChild(popupContainer);
            createNewPopup();
        }, 200);
    } else {
        createNewPopup();
    }

    function createNewPopup() {
        popupContainer = document.createElement('div');
        popupContainer.id = 'easyfiles-popup';
        popupContainer.classList.add('fade-enter');
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
}

function handleOutsideClick(e) {
    if (popupContainer && !popupContainer.contains(e.target) && e.target.type !== 'file') {
        closePopupWithAnimation();
    }
}

function closePopupWithAnimation() {
    if (!popupContainer) return;
    
    popupContainer.classList.add('closing');
    setTimeout(() => {
        if (popupContainer && popupContainer.parentNode) {
            document.body.removeChild(popupContainer);
            popupContainer = null;
        }
        document.removeEventListener('click', handleOutsideClick);
    }, 200);
}

// Remove the old click handler
document.removeEventListener('click', handleFileInputClick, true);

// Add new comprehensive detection
document.addEventListener('click', handleUploadTrigger, true);

function handleUploadTrigger(e) {
    // Direct file inputs - always handle these
    if (e.target.type === 'file') {
        handleFileInput(e.target, e);
        return;
    }

    // Only proceed if this click would normally open a file picker
    if (!wouldTriggerFilePicker(e.target)) {
        return;
    }

    // Check for trigger elements
    const triggerElement = e.target.closest([
        '[data-trigger]',                    // Data trigger attributes
        '.fileinput-button',                 // Common upload button classes
        '#drag_container',                   // Drag & drop containers
        'input[type="file"]',               // Direct file inputs
        '[class*="upload"][onclick*="file"]', // Upload buttons that trigger file inputs
        '[id*="upload"][onclick*="file"]'    // Upload buttons that trigger file inputs
    ].join(','));

    if (!triggerElement) return;

    // Find associated file input
    let fileInput = findAssociatedFileInput(triggerElement);
    
    if (fileInput) {
        handleFileInput(fileInput, e);
    }
}

function wouldTriggerFilePicker(element) {
    // Check if the element or its parent has click handlers that trigger file inputs
    const clickHandlers = getClickHandlers(element);
    if (!clickHandlers) return false;

    // Check common patterns that indicate file picker triggering
    return (
        // Has an associated file input
        !!findAssociatedFileInput(element) ||
        // Has onclick that includes file input related code
        element.onclick?.toString().includes('file') ||
        // Has data-trigger attribute pointing to a file input
        (element.dataset.trigger && document.querySelector(`input[type="file"]#${element.dataset.trigger}`)) ||
        // Is within a form with enctype="multipart/form-data"
        element.closest('form[enctype="multipart/form-data"]')?.querySelector('input[type="file"]') ||
        // Is a label for a file input
        (element.tagName === 'LABEL' && document.querySelector(`input[type="file"]#${element.htmlFor}`)) ||
        // Has specific upload-related classes and contains a file input
        (element.className.includes('upload') && element.querySelector('input[type="file"]'))
    );
}

function getClickHandlers(element) {
    // Get all click event handlers
    const handlers = element.onclick || 
                    element.getAttribute('onclick') ||
                    element.closest('[onclick]')?.getAttribute('onclick');
    
    return handlers;
}

// Update findAssociatedFileInput to be more precise
function findAssociatedFileInput(element) {
    // First check data-trigger attribute
    if (element.dataset.trigger) {
        const targetInput = document.querySelector([
            `input[type="file"][name="${element.dataset.trigger}"]`,
            `input[type="file"]#${element.dataset.trigger}`,
            `input[type="file"].${element.dataset.trigger}`
        ].join(','));
        if (targetInput) return targetInput;
    }

    // Check if element is a label for a file input
    if (element.tagName === 'LABEL' && element.htmlFor) {
        const fileInput = document.getElementById(element.htmlFor);
        if (fileInput?.type === 'file') return fileInput;
    }

    // Check within the same form, but only if it's for file uploads
    const form = element.closest('form[enctype="multipart/form-data"]');
    if (form) {
        const fileInputs = form.querySelectorAll('input[type="file"]');
        if (fileInputs.length === 1) return fileInputs[0];
    }

    // Check immediate children and siblings
    return (
        element.querySelector('input[type="file"]') ||
        element.parentElement?.querySelector('input[type="file"]')
    );
}

function handleFileInput(input, event) {
    event.preventDefault();
    event.stopPropagation();
    
    lastClickedInput = input;
    
    const rect = event.target.getBoundingClientRect();
    createPopupContainer({
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height
    });

    setTimeout(() => {
        chrome.runtime.sendMessage({
            type: 'fileInputType',
            accept: input.accept
        });
    }, 100);
}

// Add drag and drop interception
document.addEventListener('dragover', handleDragOver, true);
document.addEventListener('drop', handleDrop, true);

function handleDragOver(e) {
    const dropZone = e.target.closest([
        '[class*="drop"]',
        '[id*="drop"]',
        '.fileinput-button',
        '#drag_container'
    ].join(','));

    if (dropZone) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }
}

function handleDrop(e) {
    const dropZone = e.target.closest([
        '[class*="drop"]',
        '[id*="drop"]',
        '.fileinput-button',
        '#drag_container'
    ].join(','));

    if (dropZone) {
        e.preventDefault();
        const fileInput = findAssociatedFileInput(dropZone);
        if (fileInput) {
            handleFileInput(fileInput, e);
        }
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

// Add message listener for close button
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'closePopup' && popupContainer) {
    closePopupWithAnimation();
  }
});

// Add window message listener for iframe communication
window.addEventListener('message', (event) => {
  if (event.data.type === 'closePopup' && popupContainer) {
    closePopupWithAnimation();
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
    const mimeType = getMimeType(filename);
    
    const allowedTypes = acceptAttribute.split(',')
        .map(t => t.trim().toLowerCase());
    
    return allowedTypes.some(type => {
        if (type.startsWith('.')) {
            // Extension check
            return type === fileExt;
        } else if (type.includes('*')) {
            // Handle wildcards like "image/*"
            const [category] = type.split('/');
            return mimeType.startsWith(category + '/');
        } else {
            // Exact MIME type match
            return type === mimeType;
        }
    });
}

// Update getMimeType to match popup.js
function getMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
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
        // ...rest of existing mime types...
    };
    return mimeTypes[ext] || 'application/octet-stream';
}
