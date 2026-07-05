"""
FakeGuard — Machine Learning Training Pipeline
Instagram Fake Account Detection

Algorithms implemented:
  - Logistic Regression
  - Random Forest Classifier
  - Support Vector Machine (SVM)
  - Gradient Boosting (XGBoost-style)
  - Ensemble Voting Classifier

Dataset features:
  - followers, following, posts
  - engagement rate (likes + comments / followers)
  - followers/following ratio
  - account age
  - profile completeness (pic, bio, url)
  - username pattern (numeric chars)
  - privacy setting
"""

import numpy as np
import pandas as pd
import json
import warnings
warnings.filterwarnings('ignore')

from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    roc_auc_score, f1_score, precision_score, recall_score
)
from sklearn.pipeline import Pipeline
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import os, joblib


# ============================================================
# 1. Generate Synthetic Training Dataset
# ============================================================

def generate_dataset(n_samples=5000, seed=42):
    """
    Generate a realistic synthetic dataset of Instagram profiles.
    Based on patterns from published research on fake account detection.
    """
    np.random.seed(seed)

    records = []

    # --- REAL accounts (60% of dataset) ---
    n_real = int(n_samples * 0.60)

    for _ in range(n_real):

        # 🔥 25% real but low-activity users
        if np.random.rand() < 0.25:
            followers = int(np.random.uniform(200, 5000))
            following = int(np.random.uniform(100, 1500))
            posts = int(np.random.uniform(0, 20))
            account_age = int(np.random.uniform(6, 60))

            likes = int(np.random.uniform(5, 50))
            comments = int(np.random.uniform(0, 10))

            has_pic = np.random.choice([0, 1], p=[0.6, 0.4])
            has_bio = np.random.choice([0, 1], p=[0.6, 0.4])
            is_private = 1
            has_url = 0
            numeric_name = np.random.choice([0, 1], p=[0.7, 0.3])

        else:
            followers = int(np.random.lognormal(mean=6.5, sigma=1.8))
            followers = int(followers * np.random.uniform(0.8, 1.2))
            followers = max(10, min(followers, 5_000_000))
            following = int(np.clip(np.random.normal(followers * np.random.uniform(0.2, 1.5), 200), 10, 7500))
            posts = int(np.random.lognormal(mean=3.5, sigma=1.2))
            posts = max(3, min(posts, 2000))
            account_age = int(np.random.uniform(6, 96))
            likes = int(followers * np.random.uniform(0.01, 0.12) * np.random.uniform(0.7, 1.3))
            comments = int(followers * np.random.uniform(0.001, 0.04))

            has_pic = np.random.choice([0, 1], p=[0.15, 0.85])
            has_bio = np.random.choice([0, 1], p=[0.20, 0.80])
            is_private = np.random.choice([0, 1], p=[0.55, 0.45])
            has_url = np.random.choice([0, 1], p=[0.60, 0.40])
            numeric_name = np.random.choice([0, 1], p=[0.80, 0.20])

    # ✅ MUST BE INSIDE LOOP
        records.append([
            followers, following, posts, likes, comments,
            account_age, has_pic, has_bio, is_private, has_url,
            numeric_name, 0
    ])

    # --- FAKE accounts (40% of dataset) ---
    n_fake = n_samples - n_real
    for _ in range(n_fake):
        fake_type = np.random.choice(['bot', 'bought_followers', 'spam', 'abandoned'], p=[0.35, 0.30, 0.20, 0.15])

        if fake_type == 'bot':
            followers = int(np.random.uniform(0, 200))
            followers = int(followers * np.random.uniform(0.8, 1.2))
            following = int(np.random.uniform(500, 7500))
            posts = int(np.random.uniform(0, 5))
            if np.random.rand() < 0.2:
                likes = int(followers * np.random.uniform(0.01, 0.03))
                comments = int(likes * 0.1)
            else:
                likes = int(np.random.uniform(0, 5))
                comments = 0

            account_age = int(np.random.uniform(0, 6))
            has_pic = np.random.choice([0, 1], p=[0.55, 0.45])
            has_bio = np.random.choice([0, 1], p=[0.65, 0.35])
            is_private = 0
            has_url = np.random.choice([0, 1], p=[0.30, 0.70])
            numeric_name = np.random.choice([0, 1], p=[0.20, 0.80])

        elif fake_type == 'bought_followers':
            followers = int(np.random.uniform(10000, 500000))
            followers = int(followers * np.random.uniform(0.8, 1.2))
            following = int(np.random.uniform(100, 1500))
            posts = int(np.random.uniform(5, 50))
            likes = int(followers * np.random.uniform(0.0001, 0.003))
            comments = int(likes * 0.02)
            account_age = int(np.random.uniform(3, 36))
            has_pic = np.random.choice([0, 1], p=[0.10, 0.90])
            has_bio = np.random.choice([0, 1], p=[0.20, 0.80])
            is_private = 0
            has_url = np.random.choice([0, 1], p=[0.40, 0.60])
            numeric_name = np.random.choice([0, 1], p=[0.60, 0.40])

        elif fake_type == 'spam':
            followers = int(np.random.uniform(0, 500))
            followers = int(followers * np.random.uniform(0.8, 1.2))
            following = int(np.random.uniform(1000, 7500))
            posts = int(np.random.uniform(0, 20))
            likes = 0
            comments = 0
            account_age = int(np.random.uniform(0, 12))
            has_pic = np.random.choice([0, 1], p=[0.50, 0.50])
            has_bio = np.random.choice([0, 1], p=[0.40, 0.60])
            is_private = 0
            has_url = np.random.choice([0, 1], p=[0.20, 0.80])
            numeric_name = np.random.choice([0, 1], p=[0.15, 0.85])

        else:  # abandoned
            followers = int(np.random.uniform(10, 300))
            followers = int(followers * np.random.uniform(0.8, 1.2))
            following = int(np.random.uniform(50, 1000))
            posts = int(np.random.uniform(0, 10))
            likes = 0
            comments = 0
            account_age = int(np.random.uniform(1, 24))
            has_pic = np.random.choice([0, 1], p=[0.30, 0.70])
            has_bio = np.random.choice([0, 1], p=[0.50, 0.50])
            is_private = np.random.choice([0, 1], p=[0.50, 0.50])
            has_url = 0
            numeric_name = np.random.choice([0, 1], p=[0.50, 0.50])

        records.append([followers, following, posts, likes, comments,
                        account_age, has_pic, has_bio, is_private, has_url,
                        numeric_name, 1])  # label=1 (fake)

    cols = ['followers', 'following', 'posts', 'avg_likes', 'avg_comments',
            'account_age_months', 'has_profile_pic', 'has_bio', 'is_private',
            'has_external_url', 'has_numeric_username', 'is_fake']

    df = pd.DataFrame(records, columns=cols)
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)
    return df


# ============================================================
# 2. Feature Engineering
# ============================================================

def engineer_features(df):
    """Add derived features that improve model performance."""

    df = df.copy()

    # Follower/Following ratio
    df['ff_ratio'] = df['followers'] / (df['following'] + 1)

    # Engagement rate
    df['engagement_rate'] = (df['avg_likes'] + df['avg_comments']) / (df['followers'] + 1)

    # Post frequency (posts per month)
    df['post_frequency'] = df['posts'] / (df['account_age_months'] + 1)

    # Profile completeness score
    df['completeness_score'] = (
    0.3 * df['has_profile_pic'] +
    0.3 * df['has_bio'] +
    0.2 * (1 - df['has_numeric_username']) +
    0.3 * (df['posts'] > 5).astype(int)
)


    # Log transforms for skewed features
    df['log_followers'] = np.log1p(df['followers'])
    df['log_following'] = np.log1p(df['following'])
    df['log_posts'] = np.log1p(df['posts'])

    return df


# ============================================================
# 3. Train Models
# ============================================================

def train_models(X_train, X_test, y_train, y_test, feature_names):
    results = {}

    # ---- Logistic Regression ----
    lr_pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('clf', LogisticRegression(C=1.0, max_iter=1000, random_state=42))
    ])
    lr_pipeline.fit(X_train, y_train)
    results['Logistic Regression'] = evaluate_model(lr_pipeline, X_test, y_test)

    from sklearn.model_selection import GridSearchCV

    param_grid = {
        'n_estimators': [100, 200],
        'max_depth': [8, 12, None],
        'min_samples_split': [2, 5],
}

    rf = GridSearchCV(
        RandomForestClassifier(random_state=42,class_weight='balanced'),
        param_grid,
        cv=3,
        scoring='f1',
        n_jobs=-1
)

    rf.fit(X_train, y_train)

    rf = rf.best_estimator_
    # ---- SVM ----
    svm_pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('clf', SVC(C=1.5, kernel='rbf', gamma='scale', probability=True, random_state=42))
    ])
    svm_pipeline.fit(X_train, y_train)
    results['SVM (RBF)'] = evaluate_model(svm_pipeline, X_test, y_test)

    # ---- Gradient Boosting ----
    gb = GradientBoostingClassifier(
        n_estimators=150,
        learning_rate=0.08,
        max_depth=5,
        min_samples_split=10,
        subsample=0.8,
        random_state=42
    )
    gb.fit(X_train, y_train)
    results['Gradient Boosting'] = evaluate_model(gb, X_test, y_test)

    # ---- Ensemble (Voting) ----
    ensemble = VotingClassifier(
        estimators=[
            ('rf', rf),
            ('gb', gb),
            ('lr', lr_pipeline),
        ],
        voting='soft',
        weights=[3, 2, 1]
    )
    ensemble.fit(X_train, y_train)
    results['Ensemble Voting'] = evaluate_model(ensemble, X_test, y_test)

    # Feature importance from RF
    fi = pd.DataFrame({
        'feature': feature_names,
        'importance': rf.feature_importances_
    }).sort_values('importance', ascending=False)

    return results, rf, ensemble, fi


def evaluate_model(model, X_test, y_test):
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1] if hasattr(model, 'predict_proba') else y_pred

    return {
        'accuracy': round(accuracy_score(y_test, y_pred) * 100, 2),
        'precision': round(precision_score(y_test, y_pred) * 100, 2),
        'recall': round(recall_score(y_test, y_pred) * 100, 2),
        'f1': round(f1_score(y_test, y_pred) * 100, 2),
        'auc': round(roc_auc_score(y_test, y_proba) * 100, 2),
        'report': classification_report(y_test, y_pred, target_names=['Real', 'Fake']),
        'confusion': confusion_matrix(y_test, y_pred).tolist(),
        'model': model
    }


# ============================================================
# 4. Visualization
# ============================================================

def save_plots(results, feature_importance, output_dir='ml_output'):
    os.makedirs(output_dir, exist_ok=True)

    # Model comparison bar chart
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    fig.patch.set_facecolor('#0e0f14')
    for ax in axes:
        ax.set_facecolor('#16181f')

    model_names = list(results.keys())
    accuracies = [results[m]['accuracy'] for m in model_names]
    f1_scores = [results[m]['f1'] for m in model_names]
    colors = ['#4F8EF7', '#22c55e', '#f59e0b', '#ef4444', '#a855f7']

    bars1 = axes[0].bar(model_names, accuracies, color=colors, alpha=0.9, width=0.6)
    axes[0].set_title('Model Accuracy Comparison', color='white', fontsize=13, pad=12)
    axes[0].set_ylabel('Accuracy (%)', color='#a0a5bb')
    axes[0].set_ylim(50, 100)
    axes[0].tick_params(colors='#a0a5bb', labelsize=9)
    axes[0].set_xticklabels(model_names, rotation=15, ha='right')
    for spine in axes[0].spines.values(): spine.set_color('#272a35')
    for bar, acc in zip(bars1, accuracies):
        axes[0].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.3,
                     f'{acc:.1f}%', ha='center', va='bottom', color='white', fontsize=9)

    bars2 = axes[1].bar(model_names, f1_scores, color=colors, alpha=0.9, width=0.6)
    axes[1].set_title('F1 Score Comparison', color='white', fontsize=13, pad=12)
    axes[1].set_ylabel('F1 Score (%)', color='#a0a5bb')
    axes[1].set_ylim(50, 100)
    axes[1].tick_params(colors='#a0a5bb', labelsize=9)
    axes[1].set_xticklabels(model_names, rotation=15, ha='right')
    for spine in axes[1].spines.values(): spine.set_color('#272a35')
    for bar, f1 in zip(bars2, f1_scores):
        axes[1].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.3,
                     f'{f1:.1f}%', ha='center', va='bottom', color='white', fontsize=9)

    plt.tight_layout(pad=2)
    plt.savefig(os.path.join(output_dir, 'model_comparison.png'), dpi=150, bbox_inches='tight', facecolor='#0e0f14')
    plt.close()

    # Feature importance
    top_n = feature_importance.head(12)
    fig, ax = plt.subplots(figsize=(10, 6))
    fig.patch.set_facecolor('#0e0f14')
    ax.set_facecolor('#16181f')
    bars = ax.barh(top_n['feature'], top_n['importance'], color='#4F8EF7', alpha=0.9)
    ax.set_title('Feature Importance (Random Forest)', color='white', fontsize=13, pad=12)
    ax.set_xlabel('Importance Score', color='#a0a5bb')
    ax.tick_params(colors='#a0a5bb')
    for spine in ax.spines.values(): spine.set_color('#272a35')
    ax.invert_yaxis()
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'feature_importance.png'), dpi=150, bbox_inches='tight', facecolor='#0e0f14')
    plt.close()

    # Confusion matrix for best model
    best_name = max(results, key=lambda m: results[m]['f1'])
    cm = np.array(results[best_name]['confusion'])
    fig, ax = plt.subplots(figsize=(6, 5))
    fig.patch.set_facecolor('#0e0f14')
    ax.set_facecolor('#16181f')
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=['Real', 'Fake'], yticklabels=['Real', 'Fake'],
                ax=ax, cbar=False, linewidths=1, linecolor='#272a35',
                annot_kws={'color': 'white', 'size': 14})
    ax.set_title(f'Confusion Matrix — {best_name}', color='white', fontsize=12, pad=10)
    ax.set_xlabel('Predicted', color='#a0a5bb')
    ax.set_ylabel('Actual', color='#a0a5bb')
    ax.tick_params(colors='#a0a5bb')
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'confusion_matrix.png'), dpi=150, bbox_inches='tight', facecolor='#0e0f14')
    plt.close()

    print(f"  Charts saved to '{output_dir}/'")


# ============================================================
# 5. Main Pipeline
# ============================================================

def main():
    print("=" * 60)
    print("  FakeGuard — ML Training Pipeline")
    print("  Instagram Fake Account Detection")
    print("=" * 60)

    # 1. Generate data
    print("\n[1/5] Generating training dataset...")
    df = generate_dataset(n_samples=6000)
    df = engineer_features(df)
    print(f"  Dataset: {len(df)} samples | {df['is_fake'].sum()} fake | {(~df['is_fake'].astype(bool)).sum()} real")

    # 2. Prepare features
    print("\n[2/5] Preparing features...")
    feature_cols = [
        'followers', 'following', 'posts', 'avg_likes', 'avg_comments',
        'account_age_months', 'has_profile_pic', 'has_bio', 'is_private',
        'has_external_url', 'has_numeric_username',
        'ff_ratio', 'engagement_rate', 'post_frequency',
        'completeness_score','log_followers', 'log_following', 'log_posts'
    ]

    X = df[feature_cols].values
    y = df['is_fake'].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"  Train: {len(X_train)} | Test: {len(X_test)}")

    # 3. Train models
    print("\n[3/5] Training models...")
    results, rf_model, ensemble_model, feature_importance = train_models(
        X_train, X_test, y_train, y_test, feature_cols
    )

    # 4. Print results
    print("\n[4/5] Model Performance Summary")
    print("-" * 60)
    print(f"{'Model':<25} {'Accuracy':>10} {'F1':>8} {'AUC':>8}")
    print("-" * 60)
    for name, r in results.items():
        print(f"{name:<25} {r['accuracy']:>9.2f}% {r['f1']:>7.2f}% {r['auc']:>7.2f}%")
    print("-" * 60)

    best_name = max(results, key=lambda m: results[m]['f1'])
    print(f"\n  Best model: {best_name} (F1: {results[best_name]['f1']}%)")
    print(f"\n  Detailed Report — {best_name}:")
    print(results[best_name]['report'])

    print("\n  Top 10 Important Features (Random Forest):")
    print(feature_importance.head(10).to_string(index=False))

    # 5. Save outputs
    print("\n[5/5] Saving outputs...")
    os.makedirs('ml_output', exist_ok=True)

    # Save only best model
    best_model = ensemble_model if best_name == "Ensemble Voting" else rf_model

    joblib.dump(best_model, 'ml_output/best_model.pkl')
    print(f"  Best model ({best_name}) saved as best_model.pkl")

    # Save dataset sample
    df.head(500).to_csv('ml_output/dataset_sample.csv', index=False)
    print("  Dataset sample saved")

    # Save results JSON
    results_export = {k: {m: v for m, v in r.items() if m != 'model' and m != 'report' and m != 'confusion'} for k, r in results.items()}
    with open('ml_output/results.json', 'w') as f:
        json.dump(results_export, f, indent=2)

    # Save feature importance
    feature_importance.to_csv('ml_output/feature_importance.csv', index=False)

    # Save plots
    try:
        save_plots(results, feature_importance)
    except Exception as e:
        print(f"  Warning: Could not save plots ({e})")

    # Cross-validation on best model
    print(f"\n  Cross-validation ({best_name}, 5-fold)...")
    cv_scores = cross_val_score(best_model, X, y, cv=5, scoring='f1', n_jobs=-1)
    print(f"  CV F1: {cv_scores.mean()*100:.2f}% ± {cv_scores.std()*100:.2f}%")

    print("\n" + "=" * 60)
    print("  Training complete!")
    print("=" * 60)

    return results, rf_model, feature_importance


if __name__ == '__main__':
    main()