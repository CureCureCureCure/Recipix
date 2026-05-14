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

// ── Unit conversion table to metric ──
const unitConversions = {
    'cup':        { factor: 240,   unit: 'ml' },
    'cups':       { factor: 240,   unit: 'ml' },
    'tablespoon': { factor: 15,    unit: 'ml' },
    'tablespoons':{ factor: 15,    unit: 'ml' },
    'tbsp':       { factor: 15,    unit: 'ml' },
    'teaspoon':   { factor: 5,     unit: 'ml' },
    'teaspoons':  { factor: 5,     unit: 'ml' },
    'tsp':        { factor: 5,     unit: 'ml' },
    'fl oz':      { factor: 28.4,  unit: 'ml' },
    'fluid ounce':{ factor: 28.4,  unit: 'ml' },
    'oz':         { factor: 28.35, unit: 'g'  },
    'ounce':      { factor: 28.35, unit: 'g'  },
    'ounces':     { factor: 28.35, unit: 'g'  },
    'lb':         { factor: 453.6, unit: 'g'  },
    'lbs':        { factor: 453.6, unit: 'g'  },
    'pound':      { factor: 453.6, unit: 'g'  },
    'pounds':     { factor: 453.6, unit: 'g'  }
};

// ── Convert a single ingredient string to metric ──
function convertToMetric(originalText) {
    const pattern = /^([\d./\s]+)\s*([a-zA-Z\s]+?)\s+(.+)$/;
    const match = originalText.match(pattern);

    if (!match) {
        return originalText;
    }

    const amountStr = match[1].trim();
    const unitStr = match[2].trim().toLowerCase();
    const ingredientName = match[3].trim();

    const conversion = unitConversions[unitStr];
    if (!conversion) {
        return originalText;
    }

    let amount = 0;
    if (amountStr.includes('/')) {
        const parts = amountStr.split('/');
        amount = parseFloat(parts[0]) / parseFloat(parts[1]);
    } else {
        amount = parseFloat(amountStr);
    }

    if (isNaN(amount)) {
        return originalText;
    }

    const converted = Math.round(amount * conversion.factor);
    return converted + conversion.unit + ' ' + ingredientName;
}

// ── Track metric state and original ingredients ──
let isMetric = false;
let originalIngredients = [];

// ── Toggle between metric and original units ──
function toggleMetric() {
    const btn = document.getElementById('metric-toggle');
    isMetric = !isMetric;

    if (isMetric) {
        btn.textContent = 'Show original';
        btn.classList.add('metric-toggle-active');
        renderIngredients(originalIngredients, true);
    } else {
        btn.textContent = 'Convert to metric';
        btn.classList.remove('metric-toggle-active');
        renderIngredients(originalIngredients, false);
    }
}

// ── Render ingredients list ──
function renderIngredients(extendedIngredients, useMetric) {
    const list = document.getElementById('recipe-ingredients');
    list.innerHTML = '';

    for (let i = 0; i < extendedIngredients.length; i++) {
        const item = document.createElement('li');
        item.className = 'recipe-ingredient-item';

        const originalText = extendedIngredients[i].original;
        item.textContent = useMetric ? convertToMetric(originalText) : originalText;
        list.appendChild(item);
    }
}

// ── Format seconds into MM:SS string ──
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const paddedMins = mins < 10 ? '0' + mins : '' + mins;
    const paddedSecs = secs < 10 ? '0' + secs : '' + secs;
    return paddedMins + ':' + paddedSecs;
}

// ── Start or stop a step timer ──
function toggleTimer(btn, display, totalSeconds) {
    if (btn.dataset.running === 'true') {
        clearInterval(parseInt(btn.dataset.intervalId));
        btn.dataset.running = 'false';
        btn.textContent = '▶ Resume';
        return;
    }

    let remaining = parseInt(btn.dataset.remaining);
    btn.dataset.running = 'true';
    btn.textContent = '⏸ Pause';

    const intervalId = setInterval(function() {
        remaining = remaining - 1;
        btn.dataset.remaining = remaining;
        display.textContent = formatTime(remaining);

        if (remaining <= 0) {
            clearInterval(intervalId);
            btn.dataset.running = 'false';
            btn.textContent = '↺ Restart';
            display.textContent = 'Done!';
            display.classList.add('timer-done');
        }
    }, 1000);

    btn.dataset.intervalId = intervalId;
}

// ── Reset a timer back to its original duration ──
function resetTimer(btn, display, totalSeconds) {
    clearInterval(parseInt(btn.dataset.intervalId));
    btn.dataset.running = 'false';
    btn.dataset.remaining = totalSeconds;
    btn.textContent = '▶ Start';
    display.textContent = formatTime(totalSeconds);
    display.classList.remove('timer-done');
}

// ── Render instructions steps with optional timers ──
function renderSteps(analyzedInstructions) {
    const stepsList = document.getElementById('recipe-steps');
    stepsList.innerHTML = '';

    if (!analyzedInstructions || analyzedInstructions.length === 0) {
        const item = document.createElement('li');
        item.textContent = 'No instructions available for this recipe.';
        stepsList.appendChild(item);
        return;
    }

    const steps = analyzedInstructions[0].steps;

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const item = document.createElement('li');
        item.className = 'recipe-step-item';

        const stepText = document.createElement('p');
        stepText.className = 'step-text';
        stepText.textContent = step.step;
        item.appendChild(stepText);

        if (step.length && step.length.number > 0) {
            const totalSeconds = step.length.unit === 'minutes'
                ? step.length.number * 60
                : step.length.number;

            const timerRow = document.createElement('div');
            timerRow.className = 'timer-row';

            const display = document.createElement('span');
            display.className = 'timer-display';
            display.textContent = formatTime(totalSeconds);

            const startBtn = document.createElement('button');
            startBtn.className = 'timer-btn';
            startBtn.textContent = '▶ Start';
            startBtn.dataset.running = 'false';
            startBtn.dataset.remaining = totalSeconds;
            startBtn.dataset.intervalId = '';
            startBtn.onclick = function() {
                if (display.classList.contains('timer-done')) {
                    resetTimer(startBtn, display, totalSeconds);
                } else {
                    toggleTimer(startBtn, display, totalSeconds);
                }
            };

            const resetBtn = document.createElement('button');
            resetBtn.className = 'timer-reset-btn';
            resetBtn.textContent = '↺';
            resetBtn.title = 'Reset timer';
            resetBtn.onclick = function() {
                resetTimer(startBtn, display, totalSeconds);
            };

            timerRow.appendChild(display);
            timerRow.appendChild(startBtn);
            timerRow.appendChild(resetBtn);
            item.appendChild(timerRow);
        }

        stepsList.appendChild(item);
    }
}

// ── Render nutritional info tiles ──
function renderNutrition(nutrients) {
    const grid = document.getElementById('recipe-nutrition');
    grid.innerHTML = '';

    const displayed = ['Calories', 'Protein', 'Carbohydrates', 'Fat'];

    for (let i = 0; i < displayed.length; i++) {
        for (let j = 0; j < nutrients.length; j++) {
            if (nutrients[j].name === displayed[i]) {
                const tile = document.createElement('div');
                tile.className = 'nutrition-tile';

                const amount = document.createElement('span');
                amount.className = 'nutrition-amount';
                amount.textContent = Math.round(nutrients[j].amount) + nutrients[j].unit;

                const label = document.createElement('span');
                label.className = 'nutrition-label';
                label.textContent = displayed[i];

                tile.appendChild(amount);
                tile.appendChild(label);
                grid.appendChild(tile);
                break;
            }
        }
    }
}

// ── Highlight stars up to a given value ──
function highlightStars(value) {
    const stars = document.querySelectorAll('.star');
    for (let i = 0; i < stars.length; i++) {
        if (i < value) {
            stars[i].classList.add('star-filled');
        } else {
            stars[i].classList.remove('star-filled');
        }
    }
}

// ── Load the user's existing rating and average rating ──
async function loadRating(recipeId) {
    const token = localStorage.getItem('token');

    const response = await fetch('/rating/' + recipeId, {
        headers: { 'Authorization': 'Bearer ' + token }
    });

    const data = await response.json();

    if (response.ok) {
        if (data.rating) {
            highlightStars(data.rating);
            document.getElementById('rating-feedback').textContent = 'Your rating: ' + data.rating + '/5';
        }
        if (data.average) {
            document.getElementById('rating-average').textContent = 'Average: ' + data.average + '/5 (' + data.count + ' rating' + (data.count === 1 ? ')' : 's)');
        }
    }
}

// ── Submit a star rating ──
async function submitRating(value) {
    const stored = localStorage.getItem('selectedRecipe');
    if (!stored) {
        return;
    }

    const recipe = JSON.parse(stored);
    const token = localStorage.getItem('token');

    const response = await fetch('/rate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ recipeID: recipe.id, rating: value })
    });

    const data = await response.json();

    if (response.ok) {
        highlightStars(value);
        document.getElementById('rating-feedback').textContent = 'Your rating: ' + value + '/5';
        if (data.average) {
            document.getElementById('rating-average').textContent = 'Average: ' + data.average + '/5 (' + data.count + ' rating' + (data.count === 1 ? ')' : 's)');
        }
    } else {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = data.error || 'Failed to save rating';
        errorDiv.style.display = 'block';
    }
}

// ── Check if current recipe is already favourited ──
async function checkFavouriteStatus(recipeId) {
    const token = localStorage.getItem('token');

    const response = await fetch('/favourites/check?recipeID=' + recipeId, {
        headers: { 'Authorization': 'Bearer ' + token }
    });

    const data = await response.json();

    if (response.ok && data.favourited) {
        setFavouriteButton(true);
    }
}

// ── Update the favourite button appearance ──
function setFavouriteButton(isFavourited) {
    const btn = document.getElementById('favourite-btn');
    if (isFavourited) {
        btn.textContent = '♥ Saved';
        btn.classList.add('favourite-btn-active');
    } else {
        btn.textContent = '♡ Save';
        btn.classList.remove('favourite-btn-active');
    }
}

// ── Toggle favourite status ──
async function toggleFavourite() {
    const stored = localStorage.getItem('selectedRecipe');
    if (!stored) {
        return;
    }

    const recipe = JSON.parse(stored);
    const token = localStorage.getItem('token');

    const response = await fetch('/favourites/toggle', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
            recipeID: recipe.id,
            recipeName: recipe.title,
            imageURL: recipe.image || ''
        })
    });

    const data = await response.json();

    if (response.ok) {
        setFavouriteButton(data.favourited);
    } else {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = data.error || 'Failed to update favourites';
        errorDiv.style.display = 'block';
    }
}

// ── Load recipe from localStorage and populate the page ──
function loadRecipe() {
    const stored = localStorage.getItem('selectedRecipe');

    if (!stored) {
        window.location.href = '/results';
        return;
    }

    const recipe = JSON.parse(stored);

    // Back link
    const fromFavourites = localStorage.getItem('fromFavourites') === 'true';
    const fromHome = localStorage.getItem('fromHome') === 'true';
    const backToHome = document.getElementById('back-home');
    const backToFavourites = document.getElementById('back-favourites');
    const backToResults = document.getElementById('back-results');

    if (fromHome) {
        backToHome.style.display = 'inline';
        backToFavourites.style.display = 'none';
        backToResults.style.display = 'none';
        localStorage.removeItem('fromHome');
    } else if (fromFavourites) {
        backToHome.style.display = 'none';
        backToFavourites.style.display = 'inline';
        backToResults.style.display = 'none';
        localStorage.removeItem('fromFavourites');
    } else {
        backToHome.style.display = 'none';
        backToFavourites.style.display = 'none';
        backToResults.style.display = 'inline';
    }

    // Image
    const img = document.getElementById('recipe-image');
    const placeholder = document.getElementById('recipe-image-placeholder');
    if (recipe.image) {
        img.src = recipe.image;
        img.alt = recipe.title;
        img.onerror = function() {
            img.style.display = 'none';
            placeholder.style.display = 'flex';
        };
    } else {
        img.style.display = 'none';
        placeholder.style.display = 'flex';
    }

    // Title and meta
    document.getElementById('recipe-title').textContent = recipe.title;
    document.getElementById('recipe-time').textContent = '⏱ ' + recipe.readyInMinutes + ' min';
    document.getElementById('recipe-difficulty').textContent = '📊 ' + recipe.difficulty;

    // Ingredients — store originals for toggle
    originalIngredients = recipe.extendedIngredients || [];
    renderIngredients(originalIngredients, false);

    // Steps
    renderSteps(recipe.analyzedInstructions);

    // Nutrition
    const nutrients = recipe.nutrition && recipe.nutrition.nutrients ? recipe.nutrition.nutrients : [];
    renderNutrition(nutrients);

    // Favourite and rating
    checkFavouriteStatus(recipe.id);
    loadRating(recipe.id);
}

// ── Star hover effects ──
const stars = document.querySelectorAll('.star');
for (let i = 0; i < stars.length; i++) {
    stars[i].addEventListener('mouseover', function() {
        highlightStars(parseInt(this.getAttribute('data-value')));
    });
    stars[i].addEventListener('mouseout', function() {
        const feedback = document.getElementById('rating-feedback').textContent;
        const match = feedback.match(/(\d)\/5/);
        highlightStars(match ? parseInt(match[1]) : 0);
    });
}

checkAuth();
loadRecipe();