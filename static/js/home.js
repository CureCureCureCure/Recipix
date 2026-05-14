// ── Check user is logged in ──
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

// ── Handle file selection ──
document.getElementById('file-input').addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        handleFile(file);
    }
});

// ── Validate file and store in localStorage then go to preview ──
function handleFile(file) {
    const errorDiv = document.getElementById('upload-error');
    errorDiv.style.display = 'none';

    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
        errorDiv.textContent = 'Only JPEG and PNG files are supported.';
        errorDiv.style.display = 'block';
        return;
    }

    if (file.size > 12 * 1024 * 1024) {
        errorDiv.textContent = 'File exceeds the 12MB limit.';
        errorDiv.style.display = 'block';
        return;
    }

    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const sizeDisplay = parseFloat(sizeMB) < 1
        ? (file.size / 1024).toFixed(0) + ' KB'
        : sizeMB + ' MB';

    const reader = new FileReader();

    reader.onload = function(e) {
        const base64 = e.target.result.split(',')[1];
        const extension = file.type === 'image/jpeg' ? 'jpeg' : 'png';

        localStorage.setItem('uploadedImage', base64);
        localStorage.setItem('imageExtension', extension);
        localStorage.setItem('uploadedFileName', file.name);
        localStorage.setItem('uploadedFileSize', sizeDisplay);
        window.location.href = '/preview';
    };

    reader.readAsDataURL(file);
}

// ── Open a recipe using the localStorage cache ──
function openFavouriteRecipe(recipeId) {
    const existing = localStorage.getItem('savedRecipeData');
    const cache = existing ? JSON.parse(existing) : {};
    const recipe = cache[recipeId];

    if (!recipe) {
        window.location.href = '/favourites';
        return;
    }

    localStorage.setItem('selectedRecipe', JSON.stringify(recipe));
    localStorage.setItem('fromHome', 'true');
    window.location.href = '/recipe';
}

// ── Build a small recipe card for the home grid ──
function makeHomeCard(item) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.onclick = function() {
        openFavouriteRecipe(item.id || item.recipeID);
    };

    const img = document.createElement('img');
    img.className = 'recipe-card-img';
    img.src = item.image || item.imageURL || '';
    img.alt = item.title || item.recipeName;
    img.onerror = function() {
        this.style.display = 'none';
        const placeholder = document.createElement('div');
        placeholder.className = 'recipe-card-img-placeholder';
        placeholder.textContent = '🍽';
        card.insertBefore(placeholder, card.firstChild);
    };

    const body = document.createElement('div');
    body.className = 'recipe-card-body';

    const title = document.createElement('h3');
    title.className = 'recipe-card-title';
    title.textContent = item.title || item.recipeName;

    body.appendChild(title);
    card.appendChild(img);
    card.appendChild(body);

    return card;
}

// ── Load favourites from backend and render up to 3 ──
async function loadHomeFavourites() {
    const grid = document.getElementById('favourites-grid');
    const token = localStorage.getItem('token');

    const response = await fetch('/favourites/list', {
        headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!response.ok) {
        return;
    }

    const data = await response.json();

    if (data.favourites.length === 0) {
        return;
    }

    grid.innerHTML = '';

    const limit = data.favourites.length < 3 ? data.favourites.length : 3;
    for (let i = 0; i < limit; i++) {
        grid.appendChild(makeHomeCard(data.favourites[i]));
    }
}

// ── Load recent recipes from localStorage and render up to 3 ──
function loadRecentRecipes() {
    const grid = document.getElementById('recent-grid');
    const existing = localStorage.getItem('recentRecipes');

    if (!existing) {
        return;
    }

    const recent = JSON.parse(existing);

    if (recent.length === 0) {
        return;
    }

    grid.innerHTML = '';

    const limit = recent.length < 3 ? recent.length : 3;
    for (let i = 0; i < limit; i++) {
        grid.appendChild(makeHomeCard(recent[i]));
    }
}

checkAuth();
loadHomeFavourites();
loadRecentRecipes();