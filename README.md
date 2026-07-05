# FakeGuard — Instagram Fake Account Detection

Click hereto see Website !
https://fakeprofile-frontend-rho.vercel.app/index.html

A final year project web application for detecting fake Instagram profiles using machine learning.

---

## Project Structure

```
fakeguard/
├── index.html          — Login / Sign Up page
├── dashboard.html      — Main dashboard with stats
├── analyze.html        — Profile analysis tool
├── history.html        — Analysis history
├── profile.html        — User profile settings
│
├── css/
│   ├── style.css       — Global styles & variables
│   ├── auth.css        — Auth page styles
│   ├── dashboard.css   — Sidebar & layout
│   ├── analyze.css     — Analyzer & result styles
│   └── profile.css     — Profile page styles
│
├── js/
│   ├── auth.js         — Sign in / Sign up logic
│   ├── app.js          — Shared utilities, nav, pages
│   ├── model.js        — ML model (JavaScript implementation)
│   └── analyze.js      — Analyze page UI logic
│
└── ml/
    ├── train_model.py  — Python ML training pipeline
    └── requirements.txt
```

---

## Features

- **User Authentication** — Sign In, Sign Up, Google Sign-In (simulated), password hashing
- **Dark / Light Mode** — Toggle with persistence via localStorage
- **Profile Analyzer** — 11 input features, instant ML-based prediction
- **Result Breakdown** — Confidence score, per-feature analysis, verdict
- **History** — Persistent analysis history per user with filter options
- **User Profile** — Edit name, email, org, bio, change password

---

## How to Run (Frontend)

1. Open `index.html` in a browser (or serve with any local server)
2. Create an account or use Google Sign-In
3. Navigate to **Analyze Profile** and enter Instagram profile details
4. View results, history, and manage your profile

> **Tip:** Use VS Code Live Server or `python -m http.server 8080` to serve locally.

---

## How to Run (ML Training)

```bash
cd ml/
pip install -r requirements.txt
python train_model.py
```

Outputs will be saved to `ml/ml_output/`:
- `random_forest_model.pkl` — Trained Random Forest
- `ensemble_model.pkl` — Trained Ensemble (RF + GB + LR)
- `feature_importance.csv` — Feature importance scores
- `results.json` — Model performance metrics
- `dataset_sample.csv` — Sample of generated training data
- `model_comparison.png` — Accuracy & F1 bar charts
- `feature_importance.png` — Feature importance chart
- `confusion_matrix.png` — Confusion matrix heatmap

---

## ML Model Details

### Algorithms Implemented
| Algorithm | Description |
|---|---|
| Logistic Regression | Baseline linear classifier |
| Random Forest | 200 decision trees, balanced class weights |
| SVM (RBF Kernel) | Support Vector Machine with radial basis function |
| Gradient Boosting | Sequential tree boosting |
| Ensemble Voting | Weighted soft-voting of RF + GB + LR |

### Input Features
| Feature | Description |
|---|---|
| followers | Number of followers |
| following | Number of accounts followed |
| posts | Total number of posts |
| avg_likes | Average likes per post |
| avg_comments | Average comments per post |
| account_age_months | Account age in months |
| has_profile_pic | Profile picture present (1/0) |
| has_bio | Bio text present (1/0) |
| is_private | Private account (1/0) |
| has_external_url | External URL in bio (1/0) |
| has_numeric_username | Username has numbers/symbols (1/0) |

### Engineered Features
- `ff_ratio` — Followers / Following ratio
- `engagement_rate` — (Likes + Comments) / Followers
- `post_frequency` — Posts per month
- `completeness_score` — Weighted profile completeness
- `low_engagement_flag` — Flag for suspiciously low engagement
- `suspicious_ratio` — Flag for suspicious follow ratio
- `log_followers`, `log_following`, `log_posts` — Log transforms

### Expected Performance
- Accuracy: ~93–96%
- F1 Score: ~92–95%
- AUC-ROC: ~97–99%

---

## Technologies

- **Frontend:** HTML5, CSS3 (CSS Variables, Grid, Flexbox), Vanilla JavaScript
- **ML (Python):** scikit-learn, NumPy, pandas, matplotlib, seaborn
- **Storage:** Browser localStorage (for demo/offline use)
- **Fonts:** DM Sans, Syne (Google Fonts)

---

## Notes

- This is a final year academic project built for educational/research purposes.
- The JavaScript model (`model.js`) implements the same decision logic as the Python Random Forest, allowing the app to run fully offline in the browser.
- In a production system, the Python model would be served via a REST API (Flask/FastAPI) and the frontend would make API calls for predictions.

---

