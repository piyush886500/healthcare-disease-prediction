import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "disease.db")

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.execute("SELECT * FROM users")
rows = cur.fetchall()

print(rows)

conn.close()
