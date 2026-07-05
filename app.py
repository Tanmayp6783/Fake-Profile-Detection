from flask import Flask, request, jsonify
import joblib
import numpy as np
from flask_cors import CORS
import json
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)


# ============================================
# LOAD PROFILE DATA
# ============================================
with open("profiles.json") as f:
    profiles = json.load(f)

# ============================================
# TEMP USER STORAGE (NO SQL / NO DATABASE)
# ============================================
users = []

# ============================================
# USERNAME SUGGESTIONS
# ============================================
@app.route("/suggest-usernames", methods=["GET"])
def suggest_usernames():
    query = request.args.get("q", "").lower()

    suggestions = [
        p["username"] for p in profiles
        if query in p["username"].lower()
    ][:5]

    return jsonify(suggestions)

# ============================================
# FETCH PROFILE
# ============================================
@app.route("/fetch-profile", methods=["POST"])
def fetch_profile():
    username = request.json.get("username", "").lower()

    for p in profiles:
        if p["username"].lower() == username:
            return jsonify(p)

    return jsonify({"error": "User not found"}), 404

# ============================================
# LOAD ML MODEL
# ============================================
model = joblib.load("ml_output/best_model.pkl")

# ============================================
# PREDICT FAKE ACCOUNT
# ============================================
@app.route("/predict", methods=["POST"])
def predict():
    data = request.json

    followers = data["followers"]
    following = data["following"]
    posts = data["posts"]
    likes = data["likes"]
    comments = data["comments"]
    age = data["accountAge"]
    has_pic = data["hasPic"]
    has_bio = data["hasBio"]
    is_private = data["isPrivate"]
    has_url = data["hasUrl"]
    numeric_name = data["numericName"]

    ff_ratio = followers / (following + 1)
    engagement_rate = (likes + comments) / (followers + 1)
    post_frequency = posts / (age + 1)

    completeness_score = (
        0.3 * has_pic +
        0.3 * has_bio +
        0.2 * (1 - numeric_name) +
        0.3 * (1 if posts > 5 else 0)
    )

    log_followers = np.log1p(followers)
    log_following = np.log1p(following)
    log_posts = np.log1p(posts)

    features = [
        followers, following, posts, likes, comments,
        age, has_pic, has_bio, is_private, has_url, numeric_name,
        ff_ratio, engagement_rate, post_frequency,
        completeness_score, log_followers, log_following, log_posts
    ]

    features = np.array(features).reshape(1, -1)

    pred = model.predict(features)[0]
    prob = model.predict_proba(features)[0][1]

    reasons = []

    if engagement_rate < 0.005:
        reasons.append("Low engagement rate")

    if ff_ratio < 0.1:
        reasons.append("Suspicious follower-following ratio")

    if not has_pic:
        reasons.append("No profile picture")

    if not has_bio:
        reasons.append("No bio")

    if numeric_name:
        reasons.append("Numeric username")

    if posts < 5:
        reasons.append("Very few posts")

    if age < 3:
        reasons.append("New account")

    confidence = round(prob * 100, 2)

    if engagement_rate < 0.002 and ff_ratio < 0.1 and posts < 5:
        result = "fake"
        # Strong suspicious signals
    elif engagement_rate < 0.005 and ff_ratio < 0.1:
        result = "suspicious"
    else:
        if confidence >= 80:
            result = "fake"
        elif confidence >= 50:
            result = "suspicious"
        else:
            result = "real"

    return jsonify({
        "result": result,
        "confidence": confidence,
        "reasons": reasons
    })

# ============================================
# SIGNUP (NO SQL)
# ============================================
@app.route("/signup", methods=["POST"])
def signup():
    data = request.json

    first_name = data["firstName"]
    last_name = data["lastName"]
    email = data["email"].lower().strip()
    password = data["password"]

    for user in users:
        if user["email"] == email:
            return jsonify({"error": "User already exists"}), 400

    new_user = {
        "id": len(users) + 1,
        "firstName": first_name,
        "lastName": last_name,
        "email": email,
        "password": generate_password_hash(password)
    }

    users.append(new_user)

    return jsonify({"message": "Signup successful"}), 201

# ============================================
# LOGIN (NO SQL)
# ============================================
@app.route("/login", methods=["POST"])
def login():
    data = request.json

    email = data["email"].lower().strip()
    password = data["password"]

    for user in users:
        if user["email"] == email:

            if check_password_hash(user["password"], password):
                return jsonify({
                    "message": "Login successful",
                    "user_id": user["id"],
                    "firstName": user["firstName"],
                    "email": user["email"]
                })

            return jsonify({"error": "Wrong password"}), 401

    return jsonify({"error": "User not found"}), 404

# ============================================
# RUN APP
# ============================================
if __name__ == "__main__":
    app.run(debug=True)