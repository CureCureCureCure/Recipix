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

// ── Extract calorie value from nutrients array ──
function getCalories(nutrients) {
    for (let i = 0; i < nutrients.length; i++) {
        if (nutrients[i].name === 'Calories') {
            return Math.round(nutrients[i].amount) + ' ' + nutrients[i].unit;
        }
    }
    return 'N/A';
}

// ── Build a single recipe card element ──
function makeRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.onclick = function() {
        selectRecipe(recipe);
    };

    const img = document.createElement('img');
    img.className = 'recipe-card-img';
    img.src = recipe.image || '';
    img.alt = recipe.title;
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
    title.textContent = recipe.title;

    const meta = document.createElement('div');
    meta.className = 'recipe-card-meta';

    const timeSpan = document.createElement('span');
    timeSpan.textContent = '⏱ ' + recipe.readyInMinutes + ' min';

    const calorieSpan = document.createElement('span');
    const nutrients = recipe.nutrition && recipe.nutrition.nutrients ? recipe.nutrition.nutrients : [];
    calorieSpan.textContent = '🔥 ' + getCalories(nutrients);

    meta.appendChild(timeSpan);
    meta.appendChild(calorieSpan);

    const tags = document.createElement('div');
    tags.className = 'recipe-card-tags';

    const difficultyTag = document.createElement('span');
    difficultyTag.className = 'recipe-tag recipe-tag-difficulty';
    difficultyTag.textContent = recipe.difficulty;

    const ingredientTag = document.createElement('span');
    ingredientTag.className = 'recipe-tag recipe-tag-ingredients';
    ingredientTag.textContent = recipe.usedIngredientCount + ' matched';

    const scoreTag = document.createElement('span');
    scoreTag.className = 'recipe-score';
    scoreTag.textContent = 'Score: ' + recipe.relevanceScore;

    tags.appendChild(difficultyTag);
    tags.appendChild(ingredientTag);
    tags.appendChild(scoreTag);

    body.appendChild(title);
    body.appendChild(meta);
    body.appendChild(tags);

    card.appendChild(img);
    card.appendChild(body);

    return card;
}

// ── Render all recipe cards into the grid ──
function renderRecipes(recipes) {
    const grid = document.getElementById('results-grid');
    const noResults = document.getElementById('no-results');
    const subtitle = document.getElementById('results-subtitle');

    grid.innerHTML = '';

    if (!recipes || recipes.length === 0) {
        noResults.style.display = 'block';
        return;
    }

    subtitle.textContent = recipes.length + ' recipes found';

    for (let i = 0; i < recipes.length; i++) {
        grid.appendChild(makeRecipeCard(recipes[i]));
    }
}

// ── Add recipe to recentRecipes list in localStorage ──
function updateRecentRecipes(recipe) {
    const existing = localStorage.getItem('recentRecipes');
    let recent = existing ? JSON.parse(existing) : [];

    // Remove existing entry for this recipe if present
    recent = recent.filter(function(r) {
        return r.id !== recipe.id;
    });

    // Add to front of list
    recent.unshift({
        id: recipe.id,
        title: recipe.title,
        image: recipe.image || '',
        readyInMinutes: recipe.readyInMinutes,
        difficulty: recipe.difficulty
    });

    // Keep only the 6 most recent
    if (recent.length > 6) {
        recent = recent.slice(0, 6);
    }

    localStorage.setItem('recentRecipes', JSON.stringify(recent));
}

// ── Store selected recipe and navigate to detail page ──
function selectRecipe(recipe) {
    localStorage.setItem('selectedRecipe', JSON.stringify(recipe));

    const existing = localStorage.getItem('savedRecipeData');
    const cache = existing ? JSON.parse(existing) : {};
    cache[recipe.id] = recipe;
    localStorage.setItem('savedRecipeData', JSON.stringify(cache));

    updateRecentRecipes(recipe);

       window.open('/recipe', '_blank');
}

// ── Fetch recipes from backend using confirmed ingredients ──
async function loadResults() {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error-message');

    const confirmed = localStorage.getItem('confirmedIngredients');

    if (!confirmed) {
        window.location.href = '/home';
        return;
    }

    const ingredients = JSON.parse(confirmed);
    const token = localStorage.getItem('token');

    const response = await fetch('/recipes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ ingredients: ingredients })
    });

    const data = await response.json();
    loadingDiv.style.display = 'none';

    if (!response.ok) {
        errorDiv.textContent = data.error || 'Failed to fetch recipes';
        errorDiv.style.display = 'block';
        return;
    }

    renderRecipes(data.recipes);
}

checkAuth();
loadResults();