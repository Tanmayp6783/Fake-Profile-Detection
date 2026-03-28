import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
import pickle

# Load dataset
data = pd.read_csv("final-v1.csv")

# Features and label
X = data[[
    "followers",
    "following",
    "posts",
    "has_profile_pic",
    "has_bio",
    "username_digit_ratio"
]]

y = data["is_fake"]

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train model
model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)

# Accuracy
pred = model.predict(X_test)
print("✅ Model Accuracy:", accuracy_score(y_test, pred))

# Save model
pickle.dump(model, open("model.pkl", "wb"))
print("✅ model.pkl saved successfully")
