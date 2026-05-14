import os
from dotenv import load_dotenv

load_dotenv()

# Database path
DATABASE = 'recipix.db'

# API keys loaded from .env
TASTY_API_KEY = os.getenv('TASTY_API_KEY')
SPOONACULAR_API_KEY = os.getenv('SPOONACULAR_API_KEY')
SECRET_KEY = os.getenv('SECRET_KEY', 'recipix-secret-key')


