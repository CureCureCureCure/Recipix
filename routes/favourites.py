from flask import Blueprint, request, jsonify, render_template
from models import User
from routes.auth import verify_token

favourites_bp = Blueprint('favourites', __name__)

# Token extraction
def get_user_from_token(req):
    token = req.headers.get('Authorization', '').replace('Bearer ', '')
    payload = verify_token(token)
    if not payload:
        return None
    return User(payload['userID'], None, None, None)

# Favourites page route
@favourites_bp.route('/favourites', methods=['GET'])
def favourites_page():
    return render_template('favourites.html')

# Get all favourites for the logged-in user
@favourites_bp.route('/favourites/list', methods=['GET'])
def list_favourites():
    user = get_user_from_token(request)
    if not user:
        return jsonify({'error': 'Unauthorised'}), 401

    favourites = user.get_favourites()
    return jsonify({'favourites': favourites}), 200

# Check if a specific recipe is favourited
@favourites_bp.route('/favourites/check', methods=['GET'])
def check_favourite():
    user = get_user_from_token(request)
    if not user:
        return jsonify({'error': 'Unauthorised'}), 401

    recipe_id = request.args.get('recipeID', '')
    if not recipe_id:
        return jsonify({'error': 'No recipeID provided'}), 400

    is_fav = user.is_favourited(recipe_id)
    return jsonify({'favourited': is_fav}), 200

# Toggle a recipe as favourited or unfavourited
@favourites_bp.route('/favourites/toggle', methods=['POST'])
def toggle_favourite():
    user = get_user_from_token(request)
    if not user:
        return jsonify({'error': 'Unauthorised'}), 401

    data = request.get_json()
    recipe_id = data.get('recipeID', '')
    recipe_name = data.get('recipeName', '')
    image_url = data.get('imageURL', '')

    if not recipe_id or not recipe_name:
        return jsonify({'error': 'recipeID and recipeName are required'}), 400

    success, action = user.toggle_favourite(recipe_id, recipe_name, image_url)

    if success:
        return jsonify({'message': action, 'favourited': action == 'added'}), 200
    return jsonify({'error': 'Failed to update favourites'}), 500