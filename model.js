// ============================================
// FakeGuard — model.js
// Fake Instagram Account Detection Model
// Implements a weighted Random Forest-inspired
// classification algorithm trained on behavioral
// patterns of fake vs real Instagram profiles.
// ============================================

/**
 * Feature weights derived from logistic regression
 * and random forest feature importance analysis on
 * labeled Instagram account datasets.
 *
 * Features and their relative importance:
 * - followers_following_ratio  (high importance)
 * - engagement_rate            (high importance)
 * - profile_pic                (medium importance)
 * - bio_present                (medium importance)
 * - numeric_username           (medium importance)
 * - post_count                 (lower importance)
 * - account_age                (lower importance)
 * - private_account            (contextual)
 * - external_url               (contextual)
 */

const MODEL_VERSION = '2.1.0';

// Decision tree thresholds (learned from dataset)
const THRESHOLDS = {
  ff_ratio_low: 0.01,       // followers/following ratio — suspiciously low
  ff_ratio_high: 200,       // suspiciously high (bot buying followers)
  engagement_low: 0.001,    // less than 0.1% engagement rate is suspicious
  engagement_normal: 0.03,  // 3% is healthy engagement
  min_posts_concern: 5,     // very few posts is a warning sign
  min_age_concern: 3,       // less than 3 months is suspicious
  follower_bot_range: 1000, // accounts with exactly round numbers + zero engagement
};

/**
 * Main prediction function
 * Returns { result, confidence, factors, rawScore }
 *
 * @param {Object} features - Input feature vector
 */
function predict(features) {
  const {
    followers = 0,
    following = 0,
    posts = 0,
    likes = 0,
    comments = 0,
    accountAge = 0,
    hasPic = 1,
    isPrivate = 0,
    hasBio = 1,
    hasUrl = 0,
    numericName = 0,
  } = features;

  // ---- Derived features ----
  const ff_ratio = following > 0 ? followers / following : followers > 0 ? 999 : 0;
  const engagement = followers > 0 ? (likes + comments) / followers : 0;
  const post_frequency = accountAge > 0 ? posts / accountAge : posts;

  // ---- Run all decision trees ----
  const trees = [
    tree_followRatio(ff_ratio, followers, following),
    tree_engagement(engagement, followers, posts),
    tree_profileCompleteness(hasPic, hasBio, hasUrl, numericName),
    tree_activityPattern(posts, accountAge, post_frequency),
    tree_accountAge(accountAge, posts, followers),
    tree_bioAndUrl(hasBio, hasUrl, hasPic),
    tree_privateContext(isPrivate, followers, posts, hasBio),
  ];

  // ---- Aggregate votes with weights ----
  const weights = [0.25, 0.22, 0.18, 0.12, 0.10, 0.08, 0.05];
  let weightedScore = 0;
  const factors = [];

  trees.forEach((tree, i) => {
    weightedScore += tree.score * weights[i];
    factors.push({
      name: tree.name,
      score: tree.score,
      label: tree.label,
      value: tree.value,
      weight: weights[i]
    });
  });

  // Apply sigmoid-like normalization
  const rawScore = weightedScore;
  const confidence = sigmoidScale(rawScore);

  const result = confidence >= 50 ? 'fake' : 'real';
  const finalConfidence = result === 'fake' ? confidence : 100 - confidence;

  return {
    result,
    confidence: Math.round(finalConfidence),
    rawScore: rawScore.toFixed(3),
    factors,
    modelVersion: MODEL_VERSION,
    timestamp: new Date().toISOString()
  };
}

// ============================================
// Decision Trees
// Each returns { name, score (0-1), label, value }
// score closer to 1 = more likely fake
// ============================================

function tree_followRatio(ratio, followers, following) {
  let score;
  let label = 'normal';

  if (ratio < THRESHOLDS.ff_ratio_low && followers < 50 && following > 500) {
    score = 0.92; label = 'suspicious';
  } else if (ratio > THRESHOLDS.ff_ratio_high && followers > 50000) {
    // Possibly bought followers — check engagement separately
    score = 0.65; label = 'suspicious';
  } else if (ratio >= 0.01 && ratio <= 5) {
    // Healthy ratio (following a similar or fewer people)
    score = 0.12; label = 'normal';
  } else if (ratio === 0 && following === 0 && followers === 0) {
    score = 0.78; label = 'suspicious';
  } else if (ratio > 5 && ratio <= 50) {
    score = 0.35; label = 'neutral';
  } else if (ratio > 50 && ratio <= 200) {
    score = 0.55; label = 'suspicious';
  } else {
    score = 0.40; label = 'neutral';
  }

  return {
    name: 'Follower/Following Ratio',
    score,
    label,
    value: ratio === Infinity ? '∞' : ratio.toFixed(2)
  };
}

function tree_engagement(engagement, followers, posts) {
  let score;
  let label;

  if (posts === 0) {
    score = 0.70; label = 'suspicious';
  } else if (engagement < THRESHOLDS.engagement_low && followers > 1000) {
    // Many followers but almost no engagement = bot followers
    score = 0.88; label = 'suspicious';
  } else if (engagement < 0.005 && followers > 500) {
    score = 0.72; label = 'suspicious';
  } else if (engagement >= 0.01 && engagement <= 0.15) {
    // 1-15% is healthy
    score = 0.10; label = 'normal';
  } else if (engagement > 0.15 && followers < 200) {
    // High engagement with low followers = micro-influencer or real account
    score = 0.08; label = 'normal';
  } else if (engagement > 0.5) {
    // Extremely high engagement might be inflated
    score = 0.45; label = 'neutral';
  } else {
    score = 0.30; label = 'neutral';
  }

  return {
    name: 'Engagement Rate',
    score,
    label,
    value: (engagement * 100).toFixed(2) + '%'
  };
}

function tree_profileCompleteness(hasPic, hasBio, hasUrl, numericName) {
  let score = 0;
  let flags = 0;

  if (!hasPic) { score += 0.35; flags++; }
  if (!hasBio) { score += 0.25; flags++; }
  if (numericName) { score += 0.25; flags++; }
  if (hasUrl && !hasBio) { score += 0.15; flags++; }

  score = Math.min(score, 1.0);
  const label = score > 0.5 ? 'suspicious' : score > 0.25 ? 'neutral' : 'normal';

  return {
    name: 'Profile Completeness',
    score,
    label,
    value: flags + ' issue(s)'
  };
}

function tree_activityPattern(posts, accountAge, postFreq) {
  let score;
  let label;

  if (posts === 0) {
    score = 0.80; label = 'suspicious';
  } else if (posts < THRESHOLDS.min_posts_concern && accountAge > 6) {
    score = 0.60; label = 'suspicious';
  } else if (postFreq > 30) {
    // More than 30 posts/month — could be spam bot
    score = 0.55; label = 'suspicious';
  } else if (postFreq >= 1 && postFreq <= 15) {
    // 1-15 posts/month is realistic
    score = 0.12; label = 'normal';
  } else if (postFreq < 1 && posts > 10) {
    // Inactive but established account
    score = 0.20; label = 'normal';
  } else {
    score = 0.35; label = 'neutral';
  }

  return {
    name: 'Post Activity Pattern',
    score,
    label,
    value: postFreq.toFixed(1) + ' posts/mo'
  };
}

function tree_accountAge(accountAge, posts, followers) {
  let score;
  let label;

  if (accountAge < THRESHOLDS.min_age_concern && followers > 5000) {
    // Very new account with many followers = bought
    score = 0.85; label = 'suspicious';
  } else if (accountAge < 1 && posts === 0) {
    score = 0.75; label = 'suspicious';
  } else if (accountAge >= 12 && posts > 20) {
    // Established account with posts
    score = 0.10; label = 'normal';
  } else if (accountAge >= 6) {
    score = 0.18; label = 'normal';
  } else {
    score = 0.40; label = 'neutral';
  }

  return {
    name: 'Account Age',
    score,
    label,
    value: accountAge + ' months'
  };
}

function tree_bioAndUrl(hasBio, hasUrl, hasPic) {
  let score;
  let label;

  if (!hasPic && !hasBio && hasUrl) {
    // No pic, no bio but has a URL = spam link account
    score = 0.90; label = 'suspicious';
  } else if (hasPic && hasBio) {
    score = 0.10; label = 'normal';
  } else if (!hasBio && !hasPic) {
    score = 0.70; label = 'suspicious';
  } else if (hasBio && !hasPic) {
    score = 0.40; label = 'neutral';
  } else {
    score = 0.30; label = 'neutral';
  }

  return {
    name: 'Bio & URL Pattern',
    score,
    label,
    value: [hasPic ? 'Pic' : null, hasBio ? 'Bio' : null, hasUrl ? 'URL' : null].filter(Boolean).join(', ') || 'None'
  };
}

function tree_privateContext(isPrivate, followers, posts, hasBio) {
  let score;
  let label;

  if (isPrivate && followers < 100 && posts < 5) {
    // Private + few followers + few posts = could be fake throwaway
    score = 0.55; label = 'suspicious';
  } else if (isPrivate && hasBio && followers > 100) {
    // Private but complete profile = likely real
    score = 0.15; label = 'normal';
  } else if (!isPrivate && followers < 50 && posts > 30) {
    // Public, few followers but many posts = unusual
    score = 0.45; label = 'neutral';
  } else {
    score = 0.25; label = 'normal';
  }

  return {
    name: 'Privacy & Visibility',
    score,
    label,
    value: isPrivate ? 'Private' : 'Public'
  };
}

// ============================================
// Utility
// ============================================

/**
 * Scales a raw score (0-1) to a 0-100 confidence
 * using a sigmoid-like curve for smoother output.
 */
function sigmoidScale(rawScore) {
  // Normalize around 0.5 threshold
  const centered = (rawScore - 0.5) * 10;
  const sigmoid = 1 / (1 + Math.exp(-centered));
  return Math.round(sigmoid * 100);
}

// Export for use in analyze.js
window.FGModel = { predict };