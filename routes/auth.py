from flask import Blueprint, request, jsonify, render_template
from models import User, Session

auth_bp = Blueprint('auth', __name__)

# ── Register route ──
@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'GET':
        return render_template('register.html')

    data = request.get_json()
    email = data.get('email', '').strip()
    password = data.get('password', '')

    user = User(None, None, None, None)

    if not user.validate_email_format(email):
        return jsonify({'error': 'Invalid email format'}), 400

    if not user.check_email_uniqueness(email):
        return jsonify({'error': 'Email already in use'}), 400

    if not user.validate_password_strength(password):
        return jsonify({'error': 'Password must be 8+ characters'}), 400

    hashed = user.hash_password(password)
    user_id = user.create_account(email, hashed)

    if user_id:
        return jsonify({'message': 'Account created successfully'}), 201
    else:
        return jsonify({'error': 'Database error'}), 500

#  Login route 
@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html') # Fixed typo to login.html

    data = request.get_json()
    email = data.get('email', '').strip()
    password = data.get('password', '')

    user = User(None, None, None, None)
    logged_in_user = user.login(email, password)

    if not logged_in_user:
        return jsonify({'error': 'Invalid credentials'}), 401

    session = Session(logged_in_user.get_user_id())
    token = session.generate_token()

    return jsonify({
        'message': 'Login successful',
        'token': token,
        'userID': logged_in_user.get_user_id()
    }), 200

#Logout route 
@auth_bp.route('/logout', methods=['POST'])
def logout():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return jsonify({'error': 'No token provided'}), 400

    session = Session(None)
    session.invalidate_session(token)
    return jsonify({'message': 'Logged out successfully'}), 200

# ── Verify token ──
def verify_token(token):
    session = Session(None)
    return session.validate_token(token)