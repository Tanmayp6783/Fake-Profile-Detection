import json
import random

first_names = [
    "Aarav","Vivaan","Aditya","Vihaan","Arjun","Sai","Krishna","Rohan","Rahul","Virat",
    "Ananya","Diya","Isha","Riya","Neha","Kavya","Pooja","Meera","Tanvi","Shruti","shubham","tanmay","praddumn","shanayu","sakshi","aditi"
    ,"sanskruti","soham","sudarshan","satyarth","pranav","priyansh","priyanka","prisha","pratiksha","priyanshi","priyanshu","piyush","mayank",
    "mangesh","manjusha","shlok","pratahamesh","prajwal","sumedh"
]

last_names = [
    "Sharma","Patel","Singh","Verma","Joshi","Kapoor","Gupta","Mehta","Desai","Nair","patil","yadav","rao","reddy","gowda","chowdhury","das","sarkar","mishra","trivedi","bhatt","shah","jain","garg","agrawal",
    "kumar","khan","malhotra","chatterjee","dasgupta","ghosh","banerjee","sinha","choudhary","thakur","swamy","pillai","raut","sawant","goyal","bhattacharya","chopra","saxena","bhardwaj","verma","nambiar"
]

suffixes = ["official","live","world","daily","india","hub","zone","updates","vibes"]

profiles = []

for i in range(1200):
    fname = random.choice(first_names)
    lname = random.choice(last_names)

    # username styles
    style = random.choice(["clean","number","suffix"])

    if style == "clean":
        username = f"{fname.lower()}{lname.lower()}"
    elif style == "number":
        username = f"{fname.lower()}{random.randint(10,9999)}"
    else:
        username = f"{fname.lower()}_{random.choice(suffixes)}"

    is_fake = random.random() < 0.4  # 40% fake

    if not is_fake:
        # REAL PROFILE
        followers = random.randint(1000, 500000)
        following = random.randint(100, 2000)
        posts = random.randint(50, 2000)
        engagement_rate = random.uniform(0.01, 0.06)
        likes = int(followers * engagement_rate)
        comments = int(likes * random.uniform(0.05, 0.15))
        age = random.randint(6, 120)

        profile = {
            "username": username,
            "followers": followers,
            "following": following,
            "posts": posts,
            "likes": likes,
            "comments": comments,
            "accountAge": age,
            "hasPic": random.choice([0,1]),
            "hasBio": random.choice([0,1]),
            "isPrivate": random.choice([0,1]),
            "hasUrl": random.choice([0,1]),
            "numericName": int(any(char.isdigit() for char in username))
        }

    else:
        followers = random.randint(0, 3000)
        following = random.randint(500, 8000)
        posts = random.randint(0, 10)
        engagement_rate = random.uniform(0.0001, 0.01)
        likes = int(followers * engagement_rate)
        comments = int(likes * random.uniform(0.01, 0.1))
        age = random.randint(0, 12)

        profile = {
            "username": username,
            "followers": followers,
            "following": following,
            "posts": posts,
            "likes": likes,
            "comments": comments,
            "accountAge": age,
            "hasPic": random.choice([0,1]),
            "hasBio": random.choice([0,1]),
            "isPrivate": 0,
            "hasUrl": random.choice([0,1]),
            "numericName": 1
        }

    profiles.append(profile)

# 🔥 Add some special demo users
profiles.extend([
    {
        "username": "virat",
        "followers": 210000000,
        "following": 280,
        "posts": 1500,
        "likes": 600000,
        "comments": 20000,
        "accountAge": 120,
        "hasPic": 1,
        "hasBio": 1,
        "isPrivate": 0,
        "hasUrl": 1,
        "numericName": 0
    },
    {
        "username": "fake_influencer",
        "followers": 80000,
        "following": 200,
        "posts": 10,
        "likes": 20,
        "comments": 2,
        "accountAge": 6,
        "hasPic": 1,
        "hasBio": 0,
        "isPrivate": 0,
        "hasUrl": 1,
        "numericName": 0
    }
])

with open("profiles.json", "w") as f:
    json.dump(profiles, f, indent=2)

print("✅ 1200+ profiles generated in profiles.json")