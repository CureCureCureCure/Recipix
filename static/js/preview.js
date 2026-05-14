// ── Check auth ──
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
    }
}

// ── Logout ──
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

//  Load image from localStorage and display it 
function loadPreview() {
    const imageData = localStorage.getItem('uploadedImage');
    const extension = localStorage.getItem('imageExtension');
    const fileName = localStorage.getItem('uploadedFileName') || '';
    const fileSize = localStorage.getItem('uploadedFileSize') || '';

    const imgElement = document.getElementById('preview-image');
    const placeholder = document.getElementById('preview-placeholder');

    if (!imageData || !extension) {
        imgElement.style.display = 'none';
        placeholder.style.display = 'flex';
        return;
    }

    imgElement.src = 'data:image/' + extension + ';base64,' + imageData;
    imgElement.style.display = 'block';
    placeholder.style.display = 'none';

    const fileInfoText = fileName && fileSize ? fileName + ' — ' + fileSize : '';
    const desktopInfo = document.getElementById('file-info-desktop');
    const mobileInfo = document.getElementById('file-info-mobile');
    if (desktopInfo) desktopInfo.textContent = fileInfoText;
    if (mobileInfo) mobileInfo.textContent = fileInfoText;
}

//  Retake : clear image and go back to home 
function retake() {
    localStorage.removeItem('uploadedImage');
    localStorage.removeItem('imageExtension');
    localStorage.removeItem('uploadedFileName');
    localStorage.removeItem('uploadedFileSize');
    window.location.href = '/home';
}

// ── Confirm and send image to backend for ingredient detection 
async function analyseIngredients() {
    const errorDiv = document.getElementById('error-message');
    const loadingDiv = document.getElementById('loading');

    errorDiv.style.display = 'none';
    loadingDiv.style.display = 'block';

    const imageData = localStorage.getItem('uploadedImage');
    const extension = localStorage.getItem('imageExtension');
    const token = localStorage.getItem('token');

    const response = await fetch('/detect', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ image: imageData, extension: extension })
    });

    const data = await response.json();
    loadingDiv.style.display = 'none';

    if (response.ok) {
            localStorage.setItem('detectedIngredients', JSON.stringify(data.ingredients));
            window.location.href = '/ingredients';
        } else {
            localStorage.setItem('detectedIngredients', JSON.stringify([]));
            window.location.href = '/ingredients';
        }
    }

checkAuth();
loadPreview();