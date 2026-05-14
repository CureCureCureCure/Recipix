import sqlite3
from config import DATABASE

def get_db():
    # Connect to the SQLite database
    conn = sqlite3.connect(DATABASE)
    # Return rows as dictionaries so columns can be accessed by name
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Users table — stores account credentials
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            userID TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            hashedPassword TEXT NOT NULL,
            createdAt TEXT NOT NULL
        )
    ''')

    # Sessions table — stores JWT tokens
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            sessionID TEXT PRIMARY KEY,
            userID TEXT NOT NULL,
            jwtToken TEXT NOT NULL,
            expiresAt TEXT NOT NULL,
            FOREIGN KEY (userID) REFERENCES users(userID)
        )
    ''')

    # Preferences table — stores user cooking preferences
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS preferences (
            userID TEXT PRIMARY KEY,
            maxReadyTime INTEGER,
            difficultyLevel TEXT,
            spiceLevel INTEGER,
            calorieMin INTEGER,
            calorieMax INTEGER,
            equipment TEXT,
            FOREIGN KEY (userID) REFERENCES users(userID)
        )
    ''')

    # Dietary requirements table — one row per requirement per user
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS dietaryRequirements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userID TEXT NOT NULL,
            requirement TEXT NOT NULL,
            FOREIGN KEY (userID) REFERENCES users(userID)
        )
    ''')

    # Allergies table — one row per allergy per user
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS allergies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userID TEXT NOT NULL,
            allergen TEXT NOT NULL,
            FOREIGN KEY (userID) REFERENCES users(userID)
        )
    ''')

    # Favourites table — stores favourited recipes per user
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS favourites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userID TEXT NOT NULL,
            recipeID TEXT NOT NULL,
            recipeName TEXT NOT NULL,
            imageURL TEXT,
            dateSaved TEXT NOT NULL,
            FOREIGN KEY (userID) REFERENCES users(userID)
        )
    ''')

    # Ratings table — stores individual user ratings per recipe
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userID TEXT NOT NULL,
            recipeID TEXT NOT NULL,
            rating INTEGER NOT NULL,
            FOREIGN KEY (userID) REFERENCES users(userID)
        )
    ''')

    conn.commit()
    conn.close()
    print('Database initialised successfully')

# Initialise the database when this file is run
if __name__ == '__main__':
    init_db()