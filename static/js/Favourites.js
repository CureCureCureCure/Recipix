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
// Handle opening favourited recipes
function openFavouriteRecipe(recipeId) {
    const errorDiv = document.getElementById('error-message');
    const existing = localStorage.getItem('savedRecipeData');
    const cache = existing ? JSON.parse(existing) : {};
    const recipe = cache[recipeId];

    if (!recipe) {
        errorDiv.textContent = 'Recipe data not available. Please find this recipe again through the search flow.';
        errorDiv.style.display = 'block';
        return;
    }

    localStorage.setItem('selectedRecipe', JSON.stringify(recipe));
    localStorage.setItem('fromFavourites', 'true');
    window.open('/recipe', '_blank');
}

//  Build favourited recipe card 
function makeFavouriteCard(favourite) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.onclick = function() {
        openFavouriteRecipe(favourite.recipeID);
    };

    const img = document.createElement('img');
    img.className = 'recipe-card-img';
    img.src = favourite.imageURL || '';
    img.alt = favourite.recipeName;
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
    title.textContent = favourite.recipeName;

    const date = document.createElement('p');
    date.className = 'favourite-date';
    date.textContent = 'Saved ' + formatDate(favourite.dateSaved);

    body.appendChild(title);
    body.appendChild(date);
    card.appendChild(img);
    card.appendChild(body);

    return card;
}

// ── Format ISO date string to readable format ──
function formatDate(isoString) {
    const dateObj = new Date(isoString);
    const day = dateObj.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    return day + ' ' + month + ' ' + year;
}

// ── Load and render favourites ──
async function loadFavourites() {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error-message');
    const grid = document.getElementById('favourites-grid');
    const noFavourites = document.getElementById('no-favourites');
    const token = localStorage.getItem('token');

    const response = await fetch('/favourites/list', {
        headers: { 'Authorization': 'Bearer ' + token }
    });

    const data = await response.json();
    loadingDiv.style.display = 'none';

    if (!response.ok) {
        errorDiv.textContent = data.error || 'Failed to load favourites';
        errorDiv.style.display = 'block';
        return;
    }

    if (data.favourites.length === 0) {
        noFavourites.style.display = 'block';
        return;
    }

    for (let i = 0; i < data.favourites.length; i++) {
        grid.appendChild(makeFavouriteCard(data.favourites[i]));
    }
}

checkAuth();
loadFavourites();