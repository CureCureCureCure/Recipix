from flask import Blueprint, request, jsonify, render_template
from routes.auth import verify_token
from models import User, RecipeQuery

recipes_bp = Blueprint('recipes', __name__)

# Token extraction function reused from preferences.py
def get_user_from_token(req):
    token = req.headers.get('Authorization', '').replace('Bearer ', '')
    payload = verify_token(token)
    if not payload:
        return None
    return User(payload['userID'], None, None, None)

@recipes_bp.route('/results', methods=['GET'])
def results_page():
    # Recipe results page
    return render_template('results.html')

@recipes_bp.route('/recipes', methods=['POST'])
def get_recipes():
    user = get_user_from_token(request)
    if not user:
        return jsonify({'error': 'Unauthorised'}), 401

    data = request.get_json()
    ingredients = data.get('ingredients', [])

    if not ingredients:
        return jsonify({'error': 'No ingredients provided'}), 400

    recipe_query = RecipeQuery(user.get_user_id())
    recipe_query.set_ingredients(ingredients)
    recipe_query.load_user_preferences()

    recipes = recipe_query.fetch_recipes()

    if not recipes:
        return jsonify({'message': 'No recipes found', 'recipes': []}), 200

    ranked_recipes = recipe_query.rank_results(recipes)

    return jsonify({'recipes': ranked_recipes}), 200

@recipes_bp.route('/recipe', methods=['GET'])
def recipe_page():
    return render_template('recipe.html')