from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import mysql.connector
import pandas as pd

app = Flask(__name__)
CORS(app)

# Load trained model
model = pickle.load(open("model.pkl", "rb"))

# Create fresh DB connection per request
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="root@123",  # 🔴 Put your MySQL password
        database="insta_detector",
        auth_plugin="mysql_native_password",
        ssl_disabled=True
    )

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json

    username = data["username"]

    # Compute numeric ratio in username
    num_digits = sum(c.isdigit() for c in username)
    num_user_ratio = num_digits / len(username) if len(username) > 0 else 0

    # Create feature dataframe (must match training features)
    features = pd.DataFrame([{
        "followers": data["followers"],
        "following": data["following"],
        "posts": data["posts"],
        "has_profile_pic": data["has_pic"],
        "has_bio": data["has_bio"],
        "username_digit_ratio": num_user_ratio
    }])

    # Predict
    prob = model.predict_proba(features)[0][1]
    prediction = "FAKE" if prob > 0.5 else "REAL"

    # Store result in database
    db_conn = get_db_connection()
    cursor = db_conn.cursor()
    cursor.execute("""
        INSERT INTO PredictionResults(username, fake_probability, prediction)
        VALUES (%s, %s, %s)
    """, (username, float(prob), prediction))
    db_conn.commit()
    db_conn.close()

    # Return response
    return jsonify({
        "prediction": prediction,
        "probability": round(float(prob) * 100, 2)
    })

if __name__ == "__main__":
    app.run(port=5000)
