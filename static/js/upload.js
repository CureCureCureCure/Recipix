//  Check auth 
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
    }
}

//  Logout 
async function logout() {
    const token = localStorage.getItem('token');
    await fetch('/logout', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
    });
    localStorage.removeItem('token');
    localStorage.removeItem('userID');
    window.location.href = '/login';
}

//  Handle file input selection 
document.getElementById('file-input').addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        uploadFile(file);
    }
});

// Drag and drop events 
const uploadZone = document.getElementById('upload-zone');

uploadZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', function(e) {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) {
        uploadFile(file);
    }
});

// Upload file to backend for validation 
async function uploadFile(file) {
    const errorDiv = document.getElementById('error-message');
    const loadingDiv = document.getElementById('loading');

    errorDiv.style.display = 'none';
    loadingDiv.style.display = 'block';

    const formData = new FormData();
    formData.append('image', file);

    const token = localStorage.getItem('token');

    const response = await fetch('/upload', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formData
    });

    const data = await response.json();
    loadingDiv.style.display = 'none';

    if (response.ok) {
        // Format file size nicely
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const sizeDisplay = sizeMB < 1
            ? (file.size / 1024).toFixed(0) + ' KB'
            : sizeMB + ' MB';

        localStorage.setItem('uploadedImage', data.image);
        localStorage.setItem('imageExtension', data.extension);
        localStorage.setItem('uploadedFileName', file.name);
        localStorage.setItem('uploadedFileSize', sizeDisplay);
        window.location.href = '/preview';
    } else {
        errorDiv.textContent = data.error;
        errorDiv.style.display = 'block';
    }
}

checkAuth();