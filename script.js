async function checkProfile() {

  const resultDiv = document.getElementById("result");
  const loader = document.getElementById("loader");
  const btn = document.getElementById("checkBtn");

  const username = document.getElementById("username").value.trim();
  const followers = document.getElementById("followers").value;
  const following = document.getElementById("following").value;
  const posts = document.getElementById("posts").value;

  if (!username || !followers || !following || !posts) {
    alert("Please fill all fields");
    return;
  }

  resultDiv.classList.add("hidden");
  loader.classList.remove("hidden");
  btn.disabled = true;

  const data = {
    username: username,
    followers: parseInt(followers),
    following: parseInt(following),
    posts: parseInt(posts),
    has_pic: parseInt(document.getElementById("has_pic").value),
    has_bio: parseInt(document.getElementById("has_bio").value)
  };

  try {
    const response = await fetch("http://127.0.0.1:5000/predict", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(data)
    });

    const result = await response.json();

    let className = result.prediction === "REAL" ? "real" : "fake";
    resultDiv.className = `result ${className}`;
    resultDiv.innerHTML =
      `Prediction: ${result.prediction}<br>Fake Probability: ${result.probability}%`;
  }
  catch {
    resultDiv.className = "result fake";
    resultDiv.innerHTML = "Server not responding!";
  }

  loader.classList.add("hidden");
  btn.disabled = false;
  resultDiv.classList.remove("hidden");
}
