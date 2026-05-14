from flask import Blueprint, request, jsonify, render_template
import base64
import requests
from config import TASTY_API_KEY

ingredients_bp = Blueprint('ingredients', __name__)

#  Constants 
MAX_SIZE_MB = 12
BYTES_IN_MB = 1048576
ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png']

#  Algorithm 13: Validate image file 
def validate_image_file(image_file):
    file_name = image_file.filename
    file_size = len(image_file.read())
    image_file.seek(0)

    dot_position = file_name.rfind('.')

    if dot_position == -1:
        return False, 'No file extension found'

    extension = file_name[dot_position + 1:].lower() # Changed substring to only extract file name after dot rather than include dot

    is_valid_extension = False
    for ext in ALLOWED_EXTENSIONS:
        if extension == ext:
            is_valid_extension = True

    if not is_valid_extension:
        return False, f'File type .{extension} is not supported. Please upload a JPEG or PNG'

    if file_size > (MAX_SIZE_MB * BYTES_IN_MB):
        return False, f'File exceeds {MAX_SIZE_MB}MB limit'

    return True, 'Valid'

#  Upload route 
@ingredients_bp.route('/upload', methods=['GET', 'POST'])
def upload():
    if request.method == 'GET':
        return render_template('upload.html')
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    image_file = request.files['image']

    if image_file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    is_valid, message = validate_image_file(image_file)

    if not is_valid:
        return jsonify({'error': message}), 400

    return jsonify({'message': 'Image validated successfully'}), 200



# Algorithm 14: Detect ingredients with TastyAPI
def detect_ingredients(base64_string):
    api_url = "https://tastyapi.com/analyze-image"
    headers = {
        "Authorization": "Bearer " + TASTY_API_KEY
    }
    payload = {"image": base64_string}

    response = requests.post(api_url, headers=headers, json=payload)

    print("TastyAPI status:", response.status_code)
    print("TastyAPI response:", response.text)

    ingredient_list = []

    if response.status_code == 200:
        json_response = response.json()
        analysis = json_response.get("analysis", {})
        ingredients = analysis.get("ingredients", [])
        for item in ingredients:
            ingredient_list.append(item)

    return ingredient_list

# Detect route
@ingredients_bp.route('/detect', methods=['POST'])
def detect():
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    base64_string = data.get('image', '')
    extension = data.get('extension', '')

    if not base64_string or not extension:
        return jsonify({'error': 'No image provided'}), 400

    if extension not in ['jpeg', 'png', 'jpg']:
        return jsonify({'error': 'Invalid file type'}), 400

    ingredients = detect_ingredients(base64_string)

    if not ingredients:
        return jsonify({'error': 'No ingredients detected'}), 400

    return jsonify({'ingredients': ingredients}), 200

def categorize_by_aisle(ingredient_list):
    from config import SPOONACULAR_API_KEY
    
    categorized_data = {}

    for item in ingredient_list:
        search_response = requests.get(
            "https://api.spoonacular.com/food/ingredients/search",
            params={"query": item, "apiKey": SPOONACULAR_API_KEY, "number": 1}
        )

        aisle_name = "Other/General"

        if search_response.status_code == 200:
            results = search_response.json().get("results", [])
            print("Search status:", search_response.status_code)
            print("Search results for", item, ":", results)

            if results:
                ingredient_id = results[0]["id"]
                info_response = requests.get(
                    f"https://api.spoonacular.com/food/ingredients/{ingredient_id}/information",
                    params={"apiKey": SPOONACULAR_API_KEY, "amount": 1}
                )
                print("Info status:", info_response.status_code)
                print("Info response for", item, ":", info_response.json())

                if info_response.status_code == 200:
                   aisle_name = info_response.json().get("aisle") or "Other/General"
        else:
            print("Search failed with status:", search_response.status_code)

        print("Aisle assigned for", item, ":", aisle_name)

        if aisle_name not in categorized_data:
            categorized_data[aisle_name] = []

        categorized_data[aisle_name].append(item)

    return categorized_data

#  Categorise route 
@ingredients_bp.route('/categorise', methods=['POST'])
# THis route takes the list of detected ingredients from the detect route and a list of ingredients categorised by their aisle
def categorise():
    data = request.get_json()
    ingredient_list = data.get('ingredients', [])
# Return error if no ingredients provided
    if not ingredient_list:
        return jsonify({'error': 'No ingredients provided'}), 400

    categorized = categorize_by_aisle(ingredient_list)
# Return categorised list of ingredients 
    return jsonify({'categorized': categorized}), 200

@ingredients_bp.route('/preview', methods=['GET'])
def preview():
    return render_template('preview.html')

@ingredients_bp.route('/ingredients', methods=['GET'])
def ingredients_page():
    return render_template('ingredients.html')
