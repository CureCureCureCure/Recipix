// Register function 
async function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error-message');
    const successDiv = document.getElementById('success-message');

    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';

    const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
        successDiv.textContent = 'Account created! Redirecting to login...';
        successDiv.style.display = 'block';
        setTimeout(() => window.location.href = '/login', 1500);
    } else {
        errorDiv.textContent = data.error;
        errorDiv.style.display = 'block';
    }
}

// Login function 
async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error-message');

    errorDiv.style.display = 'none';

    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userID', data.userID);
        window.location.href = '/home';
    } else {
        errorDiv.textContent = data.error;
        errorDiv.style.display = 'block';
    }
}