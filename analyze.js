// ============================================
// FakeGuard — analyze.js (FINAL VERSION)
// Backend + Dataset + ML Integrated
// ============================================

// 🔥 ✅ MOVED TO TOP (FIX)
async function fetchSuggestions() {
  const input = document.getElementById('a-username').value;

  if (!input) {
    document.getElementById('username-suggestions').innerHTML = '';
    return;
  }

  try {
    const res = await fetch(`http://127.0.0.1:5000/suggest-usernames?q=${input}`);
    const suggestions = await res.json();

    const box = document.getElementById('username-suggestions');

    box.innerHTML = suggestions.map(name => `
      <div class="suggestion-item" onclick="selectUsername('${name}')">
        ${name}
      </div>
    `).join('');

  } catch (e) {
    console.error("Suggestion fetch error:", e);
  }
}

function selectUsername(name) {
  document.getElementById('a-username').value = name;
  document.getElementById('username-suggestions').innerHTML = '';

  // auto-fill profile
  fetchProfileData();
}


// 🔥 FETCH PROFILE DATA (from profiles.json via backend)
async function fetchProfileData() {
  const username = document.getElementById('a-username').value.trim();

  if (!username) return;

  document.getElementById('input-section').classList.add('hidden');
  document.getElementById('loading-section').classList.remove('hidden');

  try {
    const res = await fetch("http://127.0.0.1:5000/fetch-profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username })
    });

    if (res.status === 404) {
      alert("User not found in database");
      document.getElementById('loading-section').classList.add('hidden');
      document.getElementById('input-section').classList.remove('hidden');
      return;
    }

    const data = await res.json();

    // Auto-fill inputs
    document.getElementById('a-followers').value = data.followers;
    document.getElementById('a-following').value = data.following;
    document.getElementById('a-posts').value = data.posts;
    document.getElementById('a-likes').value = data.likes;
    document.getElementById('a-comments').value = data.comments;
    document.getElementById('a-age').value = data.accountAge;
    document.getElementById('a-pic').value = data.hasPic;
    document.getElementById('a-bio').value = data.hasBio;
    document.getElementById('a-private').value = data.isPrivate;
    document.getElementById('a-url').value = data.hasUrl;
    document.getElementById('a-numericname').value = data.numericName;

    document.getElementById('loading-section').classList.add('hidden');
    document.getElementById('input-section').classList.remove('hidden');

  } catch (err) {
    alert("Failed to fetch profile data");
    console.error(err);
  }
}

// 🔥 MAIN ANALYSIS (calls backend ML)
async function runAnalysis() {
  const username = document.getElementById('a-username').value.trim();

  if (!username) {
    const err = document.getElementById('analyze-error');
    err.textContent = 'Please enter a username.';
    err.classList.remove('hidden');
    setTimeout(() => err.classList.add('hidden'), 3000);
    return;
  }

  const features = {
    followers: parseInt(document.getElementById('a-followers').value) || 0,
    following: parseInt(document.getElementById('a-following').value) || 0,
    posts: parseInt(document.getElementById('a-posts').value) || 0,
    likes: parseInt(document.getElementById('a-likes').value) || 0,
    comments: parseInt(document.getElementById('a-comments').value) || 0,
    accountAge: parseInt(document.getElementById('a-age').value) || 0,
    hasPic: parseInt(document.getElementById('a-pic').value) || 0,
    isPrivate: parseInt(document.getElementById('a-private').value) || 0,
    hasBio: parseInt(document.getElementById('a-bio').value) || 0,
    hasUrl: parseInt(document.getElementById('a-url').value) || 0,
    numericName: parseInt(document.getElementById('a-numericname').value) || 0,
  };

  document.getElementById('input-section').classList.add('hidden');
  document.getElementById('result-section').classList.add('hidden');
  document.getElementById('loading-section').classList.remove('hidden');

  try {
    const res = await fetch("http://127.0.0.1:5000/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(features)
    });

    const result = await res.json();

    const formattedResult = {
      result: result.result,
      confidence: result.confidence,
      timestamp: new Date().toISOString(),
      modelVersion: "2.0",
      rawScore: result.confidence / 100,
      factors: [
        {
          name: "Engagement Rate",
          score: Math.min(1, features.likes / (features.followers + 1)),
          label: features.likes < 10 ? "suspicious" : "normal"
        },
        {
          name: "Follower Ratio",
          score: Math.min(1, features.followers / (features.following + 1)),
          label: features.following > features.followers ? "suspicious" : "normal"
        },
        {
          name: "Profile Completeness",
          score: (features.hasPic + features.hasBio) / 2,
          label: features.hasPic && features.hasBio ? "normal" : "neutral"
        }
      ]
    };

    displayResult(username, formattedResult, features);

    saveToHistory({
      username,
      result: result.result,
      confidence: result.confidence,
      date: formattedResult.timestamp,
      features
    });

  } catch (err) {
    alert("Backend error. Make sure Flask server is running.");
    console.error(err);
  }
}

// ============================================
// RESULT DISPLAY (UNCHANGED)
// ============================================

function displayResult(username, result, features) {
  document.getElementById('loading-section').classList.add('hidden');
  document.getElementById('result-section').classList.remove('hidden');

  const isFake = result.result === 'fake';
  const isSuspicious = result.result === 'suspicious';
  const verdict = document.getElementById('result-verdict');
  verdict.className = 'result-verdict ' + result.result;

  document.getElementById('verdict-icon').innerHTML = isFake
  ? `<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
  : isSuspicious
  ? `<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1"/></svg>`
  : `<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;

  document.getElementById('verdict-label').textContent =
  isFake ? 'Likely Fake Account'
  : isSuspicious ? 'Suspicious Account'
  : 'Likely Real Account';
  document.getElementById('verdict-username').textContent = `@${username}`;

  document.getElementById('conf-value').textContent = result.confidence + '%';

  setTimeout(() => {
    const bar = document.getElementById('conf-bar');
    bar.style.width = result.confidence + '%';
    bar.style.background = isFake 
  ? 'var(--red)' 
  : isSuspicious 
  ? '#f59e0b' 
  : 'var(--green)';
  }, 100);

  const list = document.getElementById('factors-list');
  list.innerHTML = result.factors.map(f => `
    <div class="factor-item">
      <span class="factor-name">${f.name}</span>
      <div class="factor-bar-wrap">
        <div class="factor-bar ${f.label}" style="width: ${Math.round(f.score * 100)}%"></div>
      </div>
      <span class="factor-tag ${f.label}">
        ${f.label === 'suspicious' ? '⚠ Suspicious' :
          f.label === 'normal' ? '✓ Normal' : '~ Neutral'}
      </span>
    </div>
  `).join('');

  document.getElementById('result-meta').innerHTML = `
    Model v${result.modelVersion} · 
    ${new Date(result.timestamp).toLocaleString()} ·
    Raw score: ${result.rawScore.toFixed(2)}
  `;
}

// ============================================
// RESET
// ============================================

function resetAnalysis() {
  document.getElementById('result-section').classList.add('hidden');
  document.getElementById('loading-section').classList.add('hidden');
  document.getElementById('input-section').classList.remove('hidden');
}