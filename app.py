from flask import Flask, render_template
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'recipix-secret-key')

CORS(app)

from routes.auth import auth_bp
from routes.preferences import preferences_bp
from routes.ingredients import ingredients_bp
from routes.recipes import recipes_bp
from routes.favourites import favourites_bp
from routes.ratings import ratings_bp

app.register_blueprint(auth_bp)
app.register_blueprint(preferences_bp)
app.register_blueprint(ingredients_bp)
app.register_blueprint(recipes_bp)
app.register_blueprint(favourites_bp)
app.register_blueprint(ratings_bp)


@app.route('/')
def index():
    return 'Recipix API running'

@app.route('/home')
def home():
    return render_template('home.html')


if __name__ == '__main__':
    # Use 0.0.0.0 to listen on the hotspot interface
  app.run(host='0.0.0.0', port=5000)


