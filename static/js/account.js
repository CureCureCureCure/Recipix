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

// ── Show a temporary success message ──
function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(function() {
        successDiv.style.display = 'none';
    }, 2500);
}

// ── Show a persistent error message ──
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// ── In-memory list of equipment chips ──
let equipmentList = [];

// ── Populate form fields with loaded preferences ──
function populatePreferences(preferences) {
    if (preferences.maxReadyTime) {
        document.getElementById('pref-cookingTime').value = preferences.maxReadyTime;
    }
    if (preferences.difficultyLevel) {
        document.getElementById('pref-difficulty').value = preferences.difficultyLevel;
    }
    if (preferences.calorieMin) {
        document.getElementById('pref-calorieMin').value = preferences.calorieMin;
    }
    if (preferences.calorieMax) {
        document.getElementById('pref-calorieMax').value = preferences.calorieMax;
    }
    if (preferences.equipment && preferences.equipment.length > 0) {
        equipmentList = preferences.equipment.slice();
        renderEquipment();
    }
}

// ── Highlight active dietary toggles ──
function populateDietary(dietaryList) {
    const buttons = document.querySelectorAll('.dietary-btn');
    for (let i = 0; i < buttons.length; i++) {
        if (dietaryList.indexOf(buttons[i].getAttribute('data-value')) !== -1) {
            buttons[i].classList.add('dietary-btn-active');
        }
    }
}

// ── Render allergy chips ──
function renderAllergies(allergyList) {
    const chipRow = document.getElementById('allergy-chip-row');
    chipRow.innerHTML = '';
    for (let i = 0; i < allergyList.length; i++) {
        chipRow.appendChild(makeAllergyChip(allergyList[i]));
    }
}

// ── Render equipment chips ──
function renderEquipment() {
    const chipRow = document.getElementById('equipment-chip-row');
    chipRow.innerHTML = '';
    for (let i = 0; i < equipmentList.length; i++) {
        chipRow.appendChild(makeEquipmentChip(equipmentList[i]));
    }
}

// ── Build a removable equipment chip ──
function makeEquipmentChip(item) {
    const chip = document.createElement('div');
    chip.className = 'ingredient-chip';

    const label = document.createElement('span');
    label.textContent = item;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'chip-remove';
    removeBtn.textContent = '✕';
    removeBtn.onclick = function() {
        equipmentList = equipmentList.filter(function(e) {
            return e !== item;
        });
        renderEquipment();
    };

    chip.appendChild(label);
    chip.appendChild(removeBtn);
    return chip;
}

// ── Add an equipment item to the local list ──
function addEquipment() {
    const input = document.getElementById('equipment-input');
    const value = input.value.trim().toLowerCase();
    if (!value) {
        return;
    }
    if (equipmentList.indexOf(value) !== -1) {
        return;
    }
    equipmentList.push(value);
    input.value = '';
    renderEquipment();
}

// ── Build a removable allergy chip ──
function makeAllergyChip(allergen) {
    const chip = document.createElement('div');
    chip.className = 'ingredient-chip';

    const label = document.createElement('span');
    label.textContent = allergen;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'chip-remove';
    removeBtn.textContent = '✕';
    removeBtn.onclick = function() {
        removeAllergy(allergen);
    };

    chip.appendChild(label);
    chip.appendChild(removeBtn);
    return chip;
}

// ── Load all account data from backend ──
async function loadAccountData() {
    const loadingDiv = document.getElementById('loading');
    const sectionsDiv = document.getElementById('account-sections');
    const token = localStorage.getItem('token');

    const response = await fetch('/account-data', {
        headers: { 'Authorization': 'Bearer ' + token }
    });

    const data = await response.json();
    loadingDiv.style.display = 'none';

    if (!response.ok) {
        showError(data.error || 'Failed to load account data');
        return;
    }

    populatePreferences(data.preferences);
    populateDietary(data.dietary);
    renderAllergies(data.allergies);
    sectionsDiv.style.display = 'block';
}

// ── Save a preference to the backend ──
async function savePreference(prefType) {
    const token = localStorage.getItem('token');
    let prefValue;

    if (prefType === 'cookingTime') {
        prefValue = parseInt(document.getElementById('pref-cookingTime').value);
        if (!prefValue || prefValue <= 0) {
            showError('Cook time must be a positive number');
            return;
        }
    } else if (prefType === 'difficulty') {
        prefValue = document.getElementById('pref-difficulty').value;
        if (!prefValue) {
            showError('Please select a difficulty');
            return;
        }
    } else if (prefType === 'calories') {
        const min = parseInt(document.getElementById('pref-calorieMin').value);
        const max = parseInt(document.getElementById('pref-calorieMax').value);
        if (isNaN(min) || isNaN(max) || min < 0 || max <= min) {
            showError('Max calories must be greater than min calories');
            return;
        }
        prefValue = [min, max];
    } else if (prefType === 'equipment') {
        prefValue = equipmentList.slice();
    }

    const response = await fetch('/preferences', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ prefType: prefType, prefValue: prefValue })
    });

    const data = await response.json();

    if (response.ok) {
        showSuccess('Saved!');
    } else {
        showError(data.error || 'Failed to save preference');
    }
}

// ── Toggle a dietary requirement on/off ──
async function toggleDietary(requirement) {
    const token = localStorage.getItem('token');

    const response = await fetch('/dietary', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ requirement: requirement })
    });

    const data = await response.json();

    if (response.ok) {
        const btn = document.querySelector('.dietary-btn[data-value="' + requirement + '"]');
        btn.classList.toggle('dietary-btn-active');
        showSuccess(data.message);
    } else {
        showError(data.error || 'Failed to update dietary requirement');
    }
}

// ── Add an allergy ──
async function addAllergy() {
    const input = document.getElementById('allergy-input');
    const allergen = input.value.trim();

    if (!allergen) {
        return;
    }

    const token = localStorage.getItem('token');

    const response = await fetch('/allergies', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ allergen: allergen, action: 'ADD' })
    });

    const data = await response.json();

    if (response.ok) {
        input.value = '';
        const chipRow = document.getElementById('allergy-chip-row');
        chipRow.appendChild(makeAllergyChip(allergen));
        showSuccess(data.message);
    } else {
        showError(data.error || 'Failed to add allergen');
    }
}

// ── Remove an allergy ──
async function removeAllergy(allergen) {
    const token = localStorage.getItem('token');

    const response = await fetch('/allergies', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ allergen: allergen, action: 'REMOVE' })
    });

    const data = await response.json();

    if (response.ok) {
        const chipRow = document.getElementById('allergy-chip-row');
        const chips = chipRow.querySelectorAll('.ingredient-chip');
        for (let i = 0; i < chips.length; i++) {
            if (chips[i].querySelector('span').textContent === allergen) {
                chipRow.removeChild(chips[i]);
                break;
            }
        }
        showSuccess(data.message);
    } else {
        showError(data.error || 'Failed to remove allergen');
    }
}

// ── Delete account with confirmation ──
async function confirmDeleteAccount() {
    const confirmed = window.confirm('Are you sure you want to delete your account? This cannot be undone.');
    if (!confirmed) {
        return;
    }

    const token = localStorage.getItem('token');

    const response = await fetch('/delete-account', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
    });

    if (response.ok) {
        localStorage.removeItem('token');
        localStorage.removeItem('userID');
        window.location.href = '/register';
    } else {
        showError('Failed to delete account');
    }
}

// ── Enter key listeners ──
document.getElementById('allergy-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        addAllergy();
    }
});

document.getElementById('equipment-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        addEquipment();
    }
});

checkAuth();
loadAccountData();