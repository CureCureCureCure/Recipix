from flask import Blueprint, request, jsonify, render_template
from models import User
from routes.auth import verify_token

preferences_bp = Blueprint('preferences', __name__)

# Uses JWT token to return userID
def get_user_from_token(req):
    token = req.headers.get('Authorization', '').replace('Bearer ', '') # Extracts JWT token
    payload = verify_token(token)
    if not payload:
        return None
    return User(payload['userID'], None, None, None) # Returns userID

# Account page route
@preferences_bp.route('/account', methods=['GET'])
def account_page():
    return render_template('account.html')

# Load all account data for the account page
@preferences_bp.route('/account-data', methods=['GET'])
def account_data():
    user = get_user_from_token(request)
    if not user:
        return jsonify({'error': 'Unauthorised'}), 401

    preferences = user.get_preferences()
    dietary = user.get_dietary_requirements()
    allergies = user.get_allergies()

    return jsonify({
        'preferences': preferences,
        'dietary': dietary,
        'allergies': allergies
    }), 200

# Preferences route
@preferences_bp.route('/preferences', methods=['POST'])
def update_preference():
    user = get_user_from_token(request)
    if not user:
        return jsonify({'error': 'Unauthorised'}), 401

    data = request.get_json()
    pref_type = data.get('prefType')
    pref_value = data.get('prefValue')

    if not pref_type or pref_value is None:
        # error message for missing preference type or preference value
        return jsonify({'error': 'prefType and prefValue are required'}), 400 
    
    success = user.update_preference(pref_type, pref_value)

    if success:
        return jsonify({'message': 'Preference updated: ' + pref_type}), 200
    return jsonify({'error': 'Invalid preference type or value'}), 400

# Dietary requirement route
@preferences_bp.route('/dietary', methods=['POST'])
def dietary():
    user = get_user_from_token(request)
    if not user:
        return jsonify({'error': 'Unauthorised'}), 401

    data = request.get_json()
    requirement = data.get('requirement', '')
    success, message = user.add_dietary_requirement(requirement)

    if success:
        return jsonify({'message': message}), 200
    return jsonify({'error': message}), 400

# Allergies route
@preferences_bp.route('/allergies', methods=['POST'])
def allergies():
    user = get_user_from_token(request)
    if not user:
        return jsonify({'error': 'Unauthorised'}), 401

    data = request.get_json()
    allergen = data.get('allergen', '')
    action = data.get('action', '')
    success, message = user.add_allergy(allergen, action)

    if success:
        return jsonify({'message': message}), 200
    return jsonify({'error': message}), 400

# Delete account route
@preferences_bp.route('/delete-account', methods=['POST'])
def delete_account():
    user = get_user_from_token(request)
    if not user:
        return jsonify({'error': 'Unauthorised'}), 401

    user.delete_account()
    return jsonify({'message': 'Account deleted'}), 200