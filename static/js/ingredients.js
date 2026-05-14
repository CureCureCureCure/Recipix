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

// ── Store categorised ingredients and manually added ones ──
let categorisedIngredients = {};
let addedIngredients = [];

// ── Load and categorise ingredients from localStorage ──
async function loadIngredients() {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error-message');
    const actionsDiv = document.getElementById('ingredients-actions');
    const addRow = document.getElementById('add-row');

    const detected = localStorage.getItem('detectedIngredients');

    if (!detected) {
        window.location.href = '/home';
        return;
    }

    const ingredientList = JSON.parse(detected);

    // If no ingredients were detected skip categorisation and show page directly
    if (ingredientList.length === 0) {
        loadingDiv.style.display = 'none';
        actionsDiv.style.display = 'flex';
        addRow.style.display = 'flex';
        document.getElementById('global-add-input').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                addIngredient();
            }
        });
        return;
    }

    const token = localStorage.getItem('token');

    const response = await fetch('/categorise', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ ingredients: ingredientList })
    });

    const data = await response.json();
    loadingDiv.style.display = 'none';

    if (!response.ok) {
        errorDiv.textContent = data.error || 'Failed to categorise ingredients';
        errorDiv.style.display = 'block';
        return;
    }

    categorisedIngredients = data.categorized;
    renderCategories();
    actionsDiv.style.display = 'flex';
    addRow.style.display = 'flex';

    document.getElementById('global-add-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            addIngredient();
        }
    });
}
// ── Render detected ingredient categories ──
function renderCategories() {
    const container = document.getElementById('categories-container');
    container.innerHTML = '';

    for (const aisle in categorisedIngredients) {
        const section = document.createElement('div');
        section.className = 'ingredient-category';

        const title = document.createElement('h2');
        title.className = 'category-title';
        title.textContent = aisle;
        section.appendChild(title);

        const chipRow = document.createElement('div');
        chipRow.className = 'chip-row';

        categorisedIngredients[aisle].forEach(function(ingredient) {
            chipRow.appendChild(makeChip(ingredient, 'categorised'));
        });

        section.appendChild(chipRow);
        container.appendChild(section);
    }
}

// ── Render manually added ingredients ──
function renderAdditions() {
    const section = document.getElementById('additions-section');
    const chipRow = document.getElementById('additions-chip-row');
    chipRow.innerHTML = '';

    if (addedIngredients.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    addedIngredients.forEach(function(ingredient) {
        chipRow.appendChild(makeChip(ingredient, 'added'));
    });
}

// ── Create a removable ingredient chip ──
function makeChip(ingredient, type) {
    const chip = document.createElement('div');
    chip.className = 'ingredient-chip';

    const label = document.createElement('span');
    label.textContent = ingredient;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'chip-remove';
    removeBtn.textContent = '✕';

    if (type === 'added') {
        removeBtn.onclick = function() {
            addedIngredients = addedIngredients.filter(function(item) {
                return item !== ingredient;
            });
            renderAdditions();
        };
    } else {
        removeBtn.onclick = function() {
            for (const aisle in categorisedIngredients) {
                categorisedIngredients[aisle] = categorisedIngredients[aisle].filter(function(item) {
                    return item !== ingredient;
                });
                if (categorisedIngredients[aisle].length === 0) {
                    delete categorisedIngredients[aisle];
                }
            }
            renderCategories();
        };
    }

    chip.appendChild(label);
    chip.appendChild(removeBtn);
    return chip;
}

// ── Add ingredient to the additions section ──
function addIngredient() {
    const input = document.getElementById('global-add-input');
    const value = input.value.trim();

    if (!value) {
        return;
    }

    addedIngredients.push(value);
    input.value = '';
    renderAdditions();
}

// ── Confirm and go to recipe results ──
function confirmIngredients() {
    const errorDiv = document.getElementById('error-message');
    const flatList = [];

    for (const aisle in categorisedIngredients) {
        categorisedIngredients[aisle].forEach(function(item) {
            flatList.push(item);
        });
    }

    addedIngredients.forEach(function(item) {
        flatList.push(item);
    });

    if (flatList.length === 0) {
        errorDiv.textContent = 'Please keep at least one ingredient before searching.';
        errorDiv.style.display = 'block';
        return;
    }

    localStorage.setItem('confirmedIngredients', JSON.stringify(flatList));
    window.location.href = '/results';
}

// ── Retake photo ──
function retake() {
    localStorage.removeItem('detectedIngredients');
    localStorage.removeItem('uploadedImage');
    localStorage.removeItem('imageExtension');
    localStorage.removeItem('uploadedFileName');
    localStorage.removeItem('uploadedFileSize');
    window.location.href = '/home';
}

checkAuth();
loadIngredients();