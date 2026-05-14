import bcrypt
import uuid
import jwt
from datetime import datetime, timedelta
from database import get_db
import requests
from config import SPOONACULAR_API_KEY,SECRET_KEY # Imported spoonacular api key 


# User Class
# --------------------------------------------
class User:
    def __init__(self, user_id, email, hashed_password, created_at):
        self.__userID = user_id
        self.__email = email
        self.__hashedPassword = hashed_password
        self.__createdAt = created_at
# ---------------------------------------------
# Methods - Registration
    def get_user_id(self):
        return self.__userID

    def get_email(self):
        return self.__email
# Algorithm 1 Validate email format 
    def validate_email_format(self, email):
        if '@' not in email or '.' not in email:
            return False
        if email.startswith('@') or email.startswith('.'):
            return False
        if email.endswith('@') or email.endswith('.'):
            return False
        return True
# Algorithm 2 check email uniqueness
    def check_email_uniqueness(self, email):
        db = get_db()
        existing = db.execute(
            'SELECT * FROM users WHERE email = ?', (email,)
        ).fetchone()
        db.close()
        return existing is None
# Algorithm 3 Validate password strength
    def validate_password_strength(self, password):
        return len(password) >= 8
# Algorithm 4 Hash password
    def hash_password(self, plain_password):
        hashed = bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt())
        return hashed.decode('utf-8')
# Algorithm 5 - Store user details into database
    def create_account(self, email, hashed_password):
        db = get_db()
        user_id = str(uuid.uuid4()) # 128 bit userID in string format
        timestamp = datetime.now().isoformat() # Timestamp for account creation date
        db.execute(
            'INSERT INTO users (userID, email, hashedPassword, createdAt) VALUES (?, ?, ?, ?)',
            (user_id, email, hashed_password, timestamp)
        )
        db.execute(
            'INSERT INTO preferences (userID) VALUES (?)',
            (user_id,)
        )
        db.commit()
        db.close()
        return user_id


# Methods - Logging in: 
# Algorithm 6 - User authentication when logging in
    def login(self, email, password):
        db = get_db()
        record = db.execute(
            'SELECT * FROM users WHERE email = ?', (email,)
        ).fetchone()
        db.close()

        if not record:
            return None

        if bcrypt.checkpw(password.encode('utf-8'), record['hashedPassword'].encode('utf-8')):
            return User(
                record['userID'],
                record['email'],
                record['hashedPassword'],
                record['createdAt']
            )
        return None
    
    # -----------------------------
    # Methods - Preferences:
    # Algorithm 8 - Adding user preferences
    def update_preference(self, pref_type, pref_value):

        # Valid list of preferences, list format so I can easily add more in the future 
        valid_types = ["cookingTime", "difficulty", "spiceLevel", "calories", "equipment"]

        # Blocks invalid preferences before even connecting to database
        if pref_type not in valid_types:
            return False
        
        # Gets database 
        db = get_db()

        if pref_type == "cookingTime":
            # Check for if preference value for cooking time is less than or equal to zero 
            # (Cooking times cant be negative or 0)
            if pref_value <= 0:
                db.close
                return False
            db.execute('UPDATE preferences SET maxReadyTime = ? WHERE userID = ?', (pref_value, self.__userID)) # Updates database with new cooking time preference

        elif pref_type == "difficulty":
            if pref_value not in ["Beginner", "Advanced"]:
                db.close()
                # Does not accept any difficulty level other than Beginner or Advanced
                return False
            # Updates database with new difficulty preference (difficulty is determined by number of steps in recipe)
            db.execute('UPDATE preferences SET difficultyLevel = ? WHERE userID = ?', (pref_value, self.__userID)) 

        elif pref_type == "spiceLevel":
            if pref_value < 0 or pref_value > 500000:
                db.close()
                # Does not accept negative spice level or incredibly high spice levels 
                return False
            db.execute('UPDATE preferences SET spiceLevel = ? WHERE userID = ?', (pref_value, self.__userID))

        elif pref_type == "calories":
            if pref_value[0] < 0 or pref_value[1] <= pref_value[0]:
                db.close()
            # Does not accept negative calorie values or max calorie values that are less than or equal to min calorie values
                return False
            # Adds user calorie preference to database
            db.execute('UPDATE preferences SET calorieMin = ?, calorieMax = ? WHERE userID = ?', (pref_value[0], pref_value[1], self.__userID))

        elif pref_type == "equipment":
            # Adds user equipment preferences to database 
            db.execute('UPDATE preferences SET equipment = ? WHERE userID = ?', (','.join(pref_value), self.__userID))
        # Commits changes and removes database connection 
        db.commit()
        db.close()
        return True
# - ----------------------------
# Methods - Dietary requirements and allergies
# Algorithm 9 - Adding dietary requirements to a user
    def add_dietary_requirement(self, requirement):
        valid_dietary_list = ["halal", "vegetarian", "vegan", "gluten-free", "dairy-free"]
        requirement = requirement.lower()

        if requirement not in valid_dietary_list:
            return False, "Invalid dietary requirement"

        db = get_db()
        existing = db.execute(
            'SELECT * FROM dietaryRequirements WHERE userID = ? AND requirement = ?',
            (self.__userID, requirement)
        ).fetchone()

        if existing:
            db.execute('DELETE FROM dietaryRequirements WHERE userID = ? AND requirement = ?', (self.__userID, requirement))
            db.commit()
            db.close()
            return True, requirement + " removed"

        db.execute('INSERT INTO dietaryRequirements (userID, requirement) VALUES (?, ?)', (self.__userID, requirement))
        db.commit()
        db.close()
        return True, requirement + " added"
# Methods - Adding allergues --------------------------
# Algorithm 10 - Adding allergies for user
    def add_allergy(self, allergen, action):
        # Standardises allergen input to lowercase and removing whitespace
        clean_allergen = allergen.strip().lower() 

        #Checks if allergy input is empty
        if clean_allergen == "":
            return False, "Allergen name cannot be blank"
        # Connects to database
        db = get_db()
        # Adding allerges
        if action == "ADD":
            existing = db.execute('SELECT * FROM allergies WHERE userID = ? AND allergen = ?', (self.__userID, clean_allergen)).fetchone()
            if existing:
                db.close()
                return False, "Allergen already listed"
            db.execute('INSERT INTO allergies (userID, allergen) VALUES (?, ?)', (self.__userID, clean_allergen))
            db.commit()
            db.close()
            return True, clean_allergen + " added to your list of allergies"
        # Removing allergies
        elif action == "REMOVE":
            db.execute('DELETE FROM allergies WHERE userID = ? AND allergen = ?', (self.__userID, clean_allergen))
            db.commit()
            db.close()
            return True, clean_allergen + " removed"

        db.close()
        return False, "Invalid action"

# Algorithm 11 - Load existing preferences for account page
    def get_preferences(self):
        db = get_db()
        row = db.execute(
            'SELECT * FROM preferences WHERE userID = ?', (self.__userID,)
        ).fetchone()
        db.close()
        if not row:
            return {}
        return {
            'maxReadyTime': row['maxReadyTime'],
            'difficultyLevel': row['difficultyLevel'],
            'calorieMin': row['calorieMin'],
            'calorieMax': row['calorieMax'],
            'equipment': row['equipment'].split(',') if row['equipment'] else []
        }

# Algorithm 12 - Load existing dietary requirements for account page
    def get_dietary_requirements(self):
        db = get_db()
        rows = db.execute(
            'SELECT requirement FROM dietaryRequirements WHERE userID = ?', (self.__userID,)
        ).fetchall()
        db.close()
        dietary_list = []
        for row in rows:
            dietary_list.append(row['requirement'])
        return dietary_list

# Algorithm 13 - Load existing allergies for account page
    def get_allergies(self):
        db = get_db()
        rows = db.execute(
            'SELECT allergen FROM allergies WHERE userID = ?', (self.__userID,)
        ).fetchall()
        db.close()
        allergy_list = []
        for row in rows:
            allergy_list.append(row['allergen'])
        return allergy_list

# Algorithm 14 - Delete user account and all associated data
    def delete_account(self):
        db = get_db()
        db.execute('DELETE FROM dietaryRequirements WHERE userID = ?', (self.__userID,))
        db.execute('DELETE FROM allergies WHERE userID = ?', (self.__userID,))
        db.execute('DELETE FROM preferences WHERE userID = ?', (self.__userID,))
        db.execute('DELETE FROM favourites WHERE userID = ?', (self.__userID,))
        db.execute('DELETE FROM ratings WHERE userID = ?', (self.__userID,))
        db.execute('DELETE FROM sessions WHERE userID = ?', (self.__userID,))
        db.execute('DELETE FROM users WHERE userID = ?', (self.__userID,))
        db.commit()
        db.close()

# Algorithm 15 - Toggle a recipe in the user's favourites
    def toggle_favourite(self, recipe_id, recipe_name, image_url):
        db = get_db()
        existing = db.execute(
            'SELECT * FROM favourites WHERE userID = ? AND recipeID = ?',
            (self.__userID, str(recipe_id))
        ).fetchone()

        if existing:
            db.execute(
                'DELETE FROM favourites WHERE userID = ? AND recipeID = ?',
                (self.__userID, str(recipe_id))
            )
            db.commit()
            db.close()
            return True, 'removed'

        date_saved = datetime.now().isoformat()
        db.execute(
            'INSERT INTO favourites (userID, recipeID, recipeName, imageURL, dateSaved) VALUES (?, ?, ?, ?, ?)',
            (self.__userID, str(recipe_id), recipe_name, image_url, date_saved)
        )
        db.commit()
        db.close()
        return True, 'added'

# Check if a recipe is in the user's favourites
    def is_favourited(self, recipe_id):
        db = get_db()
        existing = db.execute(
            'SELECT * FROM favourites WHERE userID = ? AND recipeID = ?',
            (self.__userID, str(recipe_id))
        ).fetchone()
        db.close()
        return existing is not None

#Get all favourited recipes for the user
    def get_favourites(self):
        db = get_db()
        rows = db.execute(
            'SELECT recipeID, recipeName, imageURL, dateSaved FROM favourites WHERE userID = ? ORDER BY dateSaved DESC',
            (self.__userID,)
        ).fetchall()
        db.close()
        favourites_list = []
        for row in rows:
            favourites_list.append({
                'recipeID': row['recipeID'],
                'recipeName': row['recipeName'],
                'imageURL': row['imageURL'],
                'dateSaved': row['dateSaved']
            })
        return favourites_list

#  Save or update a user's rating for a recipe
    def add_rating(self, recipe_id, rating):
        if rating < 1 or rating > 5:
            return False

        db = get_db()
        existing = db.execute(
            'SELECT * FROM ratings WHERE userID = ? AND recipeID = ?',
            (self.__userID, str(recipe_id))
        ).fetchone()

        if existing:
            db.execute(
                'UPDATE ratings SET rating = ? WHERE userID = ? AND recipeID = ?',
                (rating, self.__userID, str(recipe_id))
            )
        else:
            db.execute(
                'INSERT INTO ratings (userID, recipeID, rating) VALUES (?, ?, ?)',
                (self.__userID, str(recipe_id), rating)
            )

        db.commit()
        db.close()
        return True

#  Get the user's existing rating for a recipe
    def get_user_rating(self, recipe_id):
        db = get_db()
        row = db.execute(
            'SELECT rating FROM ratings WHERE userID = ? AND recipeID = ?',
            (self.__userID, str(recipe_id))
        ).fetchone()
        db.close()
        if not row:
            return None
        return row['rating']
    
#  Get average rating for a recipe across all users
    def get_average_rating(self, recipe_id):
        db = get_db()
        row = db.execute(
            'SELECT AVG(rating) as avg, COUNT(*) as count FROM ratings WHERE recipeID = ?',
            (str(recipe_id),)
        ).fetchone()
        db.close()
        if not row or row['count'] == 0:
            return None, 0
        return round(row['avg'], 1), row['count']

# -----------------------------------------




# Session Class

class Session:
    def __init__(self, user_id):
        self.__userID = user_id
        self.__jwtToken = None
        self.__expiresAt = None
        self.__isActive = False

    def generate_token(self):
        db = get_db()
        expiry_time = datetime.utcnow() + timedelta(hours=24)
        token = jwt.encode({
            'userID': self.__userID,
            'exp': expiry_time
        }, SECRET_KEY, algorithm='HS256')

        session_id = str(uuid.uuid4())
        db.execute(
            'INSERT INTO sessions (sessionID, userID, jwtToken, expiresAt) VALUES (?, ?, ?, ?)',
            (session_id, self.__userID, token, expiry_time.isoformat())
        )
        db.commit()
        db.close()
        self.__jwtToken = token
        self.__expiresAt = expiry_time
        self.__isActive = True
        return token

    def validate_token(self, token):
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            return payload
        except Exception:
            return None

    def invalidate_session(self, token):
        db = get_db()
        db.execute('DELETE FROM sessions WHERE jwtToken = ?', (token,))
        db.commit()
        db.close()
        self.__isActive = False
# ------------------------------------------------------------------------------------------
        


# RecipeQuery Class
# ══════════════════════════════════════════════════════
# RecipeQuery Class
# ══════════════════════════════════════════════════════
class RecipeQuery:

    # Constructor
    def __init__(self, user_id):
        # Private attributes
        self.__userID = user_id
        self.__ingredients = []
        self.__excludedIngredients = []
        self.__dietaryFilters = []
        self.__minCalories = None
        self.__maxCalories = None
        self.__maxTime = None
        self.__equipment = []
        self.__difficulty = None

    # Setter for ingredients
    def set_ingredients(self, ingredients):
        self.__ingredients = ingredients

    # Getters for private attributes
    def get_ingredients(self):
        return self.__ingredients

    def get_excluded_ingredients(self):
        return self.__excludedIngredients

    # Load user preferences from database
    def load_user_preferences(self):
        db = get_db()
        prefs = db.execute(
            'SELECT * FROM preferences WHERE userID = ?', (self.__userID,)
        ).fetchone()
        dietary = db.execute(
            'SELECT requirement FROM dietaryRequirements WHERE userID = ?', (self.__userID,)
        ).fetchall()
        allergies = db.execute(
            'SELECT allergen FROM allergies WHERE userID = ?', (self.__userID,)
        ).fetchall()
        db.close()

        if prefs:
            self.__minCalories = prefs['calorieMin']
            self.__maxCalories = prefs['calorieMax']
            self.__maxTime = prefs['maxReadyTime']
            self.__difficulty = prefs['difficultyLevel']
            self.__equipment = prefs['equipment'].split(',') if prefs['equipment'] else []

        self.__dietaryFilters = [row['requirement'] for row in dietary]
        self.__excludedIngredients = [row['allergen'] for row in allergies]

    # Algorithm 16: Build query and fetch recipes from Spoonacular
    def fetch_recipes(self):
        # Step 1: Find recipes by ingredients
        response = requests.get(
            # Less strict ingredient search
            "https://api.spoonacular.com/recipes/findByIngredients",
            params={
                "apiKey": SPOONACULAR_API_KEY,
                "ingredients": ','.join(self.__ingredients),
                "number": 20,# Number of recipes reduced to 10 due to high credit usage.
                "ignorePantry": True,
                "ranking": 1 # Maximise used ingredients
            }
        )

        print("Step 1 status:", response.status_code)
        print("Step 1 response:", response.json())

        if response.status_code != 200 or not response.json():
            return []

        recipes = response.json()

        # Step 2: Get full recipe information
        recipe_ids = ','.join([str(r['id']) for r in recipes])

        info_response = requests.get(
            "https://api.spoonacular.com/recipes/informationBulk",
            params={
                "apiKey": SPOONACULAR_API_KEY,
                "ids": recipe_ids,
                "includeNutrition": True
            }
        )

        print("Step 2 status:", info_response.status_code)

        if info_response.status_code != 200:
            return []

        full_recipes = info_response.json()
        print("Full recipes count:", len(full_recipes))
        print("First recipe keys:", full_recipes[0].keys() if full_recipes else "EMPTY")
        

        # Step 3 Merge ingredient counts into full recipe info for ranking later
        ingredient_counts = {r['id']: r for r in recipes}
        for recipe in full_recipes:
            counts = ingredient_counts.get(recipe['id'], {})
            recipe['usedIngredientCount'] = counts.get('usedIngredientCount', 0)
            recipe['missedIngredientCount'] = counts.get('missedIngredientCount', 0)

        # Step 3: Filter recipes based on dietary requirements and allergies
        excluded = list(self.__excludedIngredients)

        if "halal" in self.__dietaryFilters:
            #Excluded ingredient list made stricter:
            excluded += ["pork", "bacon", "ham", "lard", "pig", 
                        "pepperoni", "salami", "gelatine", "sausage",
                        "wine", "beer", "alcohol", "rum", "vodka",
                        "whiskey", "brandy", "liquor"]

        filtered = []

        for recipe in full_recipes:
            if self.is_recipe_suitable(recipe, excluded):
                filtered.append(recipe)

        print("Filtered recipes count:", len(filtered))
        return filtered 
    
# Manual filtering of allergen/dietary requirement recipes
    def is_recipe_suitable(self, recipe, excluded):
        print("Excluded list:", excluded)
        print("Checking recipe:", recipe.get('title'))
        ingredient_names = [i['name'].lower() for i in recipe.get('extendedIngredients', [])]
        print("Ingredient names:", ingredient_names)

        for excluded_item in excluded:
            for ingredient in ingredient_names:
                if excluded_item.lower() in ingredient:
                    return False

        if "vegetarian" in self.__dietaryFilters and not recipe.get('vegetarian'):
            return False

        if "vegan" in self.__dietaryFilters and not recipe.get('vegan'):
            return False

        if "gluten-free" in self.__dietaryFilters and not recipe.get('glutenFree'):
            return False

        if "dairy-free" in self.__dietaryFilters and not recipe.get('dairyFree'):
            return False

        return True
# -----------------------------------------------------------------    
    # Determine recipe difficulty based on number of steps
    def determine_difficulty(self, recipe):
        instructions = recipe.get('analyzedInstructions', [])
        if not instructions:
            return "Unknown" 

        total_steps = 0
        for instruction_set in instructions:
            total_steps += len(instruction_set.get('steps', []))

        if total_steps <= 6: # Beginner recipes have 6 or less steps
            return "Beginner"
        return "Advanced" # Advanced recipes have more than 6 steps
    # ------------------------------------------------

    # Check if recipe equipment matches user's saved equipment
    def check_equipment_match(self, recipe):
        if not self.__equipment:
            return False

        recipe_equipment = [] # Initial array of recipe equipment
        instructions = recipe.get('analyzedInstructions', [])
        # Loops through each step in recipes instructions
        for instruction_set in instructions:
            for step in instruction_set.get('steps', []):
                # Finds equipment in each step
                for item in step.get('equipment', []):
                    #Adds found equopment to array of recipes equopment
                    # And standardises to database format
                    recipe_equipment.append(item.get('name', '').lower())

        for item in self.__equipment:
            if item.lower() in recipe_equipment:
                return True
        return False
    # -------------------------------------------------

    # Algorithm 17: Rank results by relevance score
    def rank_results(self, fetched_recipes):
        # Scoring constants
        MATCH_BOOST = 15
        MISSING_PENALTY = 10
        PREFERENCE_BONUS = 25

        for recipe in fetched_recipes:
            current_score = 0

            # Base score from ingredient matches and misses
            match_count = recipe.get('usedIngredientCount', 0)
            miss_count = recipe.get('missedIngredientCount', 0)
            current_score = (match_count * MATCH_BOOST) - (miss_count * MISSING_PENALTY)

            # Bonus for matching cook time preference
            if self.__maxTime:
                ready_time = recipe.get('readyInMinutes', 999)
                if ready_time <= self.__maxTime:
                    current_score += PREFERENCE_BONUS

            # Bonus for being within calorie range
            if self.__maxCalories:
                nutrients = recipe.get('nutrition', {}).get('nutrients', [])
                for nutrient in nutrients:
                    if nutrient.get('name') == 'Calories':
                        if nutrient.get('amount', 0) <= self.__maxCalories:
                            current_score += PREFERENCE_BONUS

            # Bonus for matching difficulty preference
            if self.__difficulty:
                recipe_difficulty = self.determine_difficulty(recipe)
                if recipe_difficulty == self.__difficulty:
                    current_score += PREFERENCE_BONUS

            # Bonus for matching equipment preference
            if self.__equipment:
                if self.check_equipment_match(recipe):
                    current_score += PREFERENCE_BONUS

            # Store relevance score and difficulty on recipe for frontend use
            recipe['relevanceScore'] = current_score
            recipe['difficulty'] = self.determine_difficulty(recipe)

        # Sort by relevance score highest to lowest
        # Bubble sort
        for i in range(len(fetched_recipes)):
            for j in range(i + 1, len(fetched_recipes)):
                if fetched_recipes[j]['relevanceScore'] > fetched_recipes[i]['relevanceScore']:
                    fetched_recipes[i], fetched_recipes[j] = fetched_recipes[j], fetched_recipes[i]
        
    # Print ranking for debugging
        print("=== RECIPE RANKING ===")
        for i in range(len(fetched_recipes)):
            print(f"#{i + 1} {fetched_recipes[i]['title']} | Score: {fetched_recipes[i]['relevanceScore']}")
        print("======================")

        return fetched_recipes
   #------------------------------------------------------------------------------------------------