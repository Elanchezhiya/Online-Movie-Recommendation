
from flask import Flask, jsonify, request

app = Flask(__name__)

MOVIES = [
    {
        "id": 1,
        "title": "Interstellar",
        "genre": "Sci-Fi",
        "rating": 8.7,
        "description": "A journey beyond the stars."
    },
    {
        "id": 2,
        "title": "Inception",
        "genre": "Thriller",
        "rating": 8.8,
        "description": "Dreams within dreams."
    },
    {
        "id": 3,
        "title": "The Dark Knight",
        "genre": "Action",
        "rating": 9.0,
        "description": "A hero faces a dangerous enemy."
    },
    {
        "id": 4,
        "title": "The Martian",
        "genre": "Sci-Fi",
        "rating": 8.0,
        "description": "An astronaut fights to survive on Mars."
    }
]


@app.route("/api/health")
def health():
    return {"status": "healthy"}, 200


@app.route("/api/movies")
def get_movies():
    search = request.args.get("search", "").lower().strip()
    genre = request.args.get("genre", "").lower().strip()

    results = [
        movie for movie in MOVIES
        if search in movie["title"].lower()
        and genre in movie["genre"].lower()
    ]

    return jsonify(results)


@app.route("/api/recommendations")
def recommendations():
    return jsonify(
        sorted(MOVIES, key=lambda movie: movie["rating"], reverse=True)
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
