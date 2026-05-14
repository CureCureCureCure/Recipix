from flask import Blueprint, request, jsonify
from models import User
from routes.auth import verify_token

ratings_bp = Blueprint('ratings', __name__)

def get_user_from_token(req):
    token = req.headers.get('Authorization', '').replace('Bearer ', '')
    payload = verify_token(token)
    if not payload:
        return None
    return User(payload['userID'], None, None, None)

# Get the logged-in user's rating and the average rating for a recipe
@ratings_bp.route('/rating/<int:recipe_id>', methods=['GET'])
def get_rating(recipe_id):
    user = get_user_from_token(request)
    if not user:
        return jsonify({'error': 'Unauthorised'}), 401

    user_rating = user.get_user_rating(recipe_id)
    average, count = user.get_average_rating(recipe_id)

    return jsonify({
        'rating': user_rating,
        'average': average,
        'count': count
    }), 200

# Submit or update a rating for a recipe
@ratings_bp.route('/rate', methods=['POST'])
def rate_recipe():
    user = get_user_from_token(request)
    if not user:
        return jsonify({'error': 'Unauthorised'}), 401

    data = request.get_json()
    recipe_id = data.get('recipeID')
    rating = data.get('rating')

    if not recipe_id or not rating:
        return jsonify({'error': 'recipeID and rating are required'}), 400

    if not isinstance(rating, int) or rating < 1 or rating > 5:
        return jsonify({'error': 'Rating must be a whole number between 1 and 5'}), 400

    success = user.add_rating(recipe_id, rating)

    if not success:
        return jsonify({'error': 'Failed to save rating'}), 500

    average, count = user.get_average_rating(recipe_id)

    return jsonify({
        'message': 'Rating saved',
        'rating': rating,
        'average': average,
        'count': count
    }), 200