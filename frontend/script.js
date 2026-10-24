
const API_URL = "/api";

const movieGrid = document.getElementById("movieGrid");
const watchlistGrid = document.getElementById("watchlistGrid");
const searchInput = document.getElementById("searchInput");
const genreFilter = document.getElementById("genreFilter");
const movieCount = document.getElementById("movieCount");
const message = document.getElementById("message");

let movies = [];
let watchlist = JSON.parse(
    localStorage.getItem("cinematch-watchlist") || "[]"
);

function createMovieCard(movie, saved = false) {
    const card = document.createElement("article");
    card.className = "movie-card";

    const icon = document.createElement("div");
    icon.className = "movie-icon";
    icon.textContent = "🎬";

    const title = document.createElement("h3");
    title.textContent = movie.title;

    const description = document.createElement("p");
    description.textContent = movie.description;

    const meta = document.createElement("div");
    meta.className = "movie-meta";

    const genre = document.createElement("span");
    genre.textContent = movie.genre;

    const rating = document.createElement("span");
    rating.className = "rating";
    rating.textContent = `★ ${movie.rating}`;

    meta.append(genre, rating);

    const button = document.createElement("button");
    button.textContent = saved ? "Remove from Watchlist" : "＋ Add to Watchlist";

    button.addEventListener("click", () => {
        if (saved) {
            watchlist = watchlist.filter(item => item.id !== movie.id);
        } else if (!watchlist.some(item => item.id === movie.id)) {
            watchlist.push(movie);
        }

        localStorage.setItem(
            "cinematch-watchlist",
            JSON.stringify(watchlist)
        );

        renderWatchlist();
        loadMovies();
    });

    card.append(icon, title, description, meta, button);
    return card;
}

async function loadMovies() {
    message.textContent = "Loading movies...";

    try {
        const params = new URLSearchParams();

        if (searchInput.value.trim()) {
            params.set("search", searchInput.value.trim());
        }

        if (genreFilter.value) {
            params.set("genre", genreFilter.value);
        }

        const response = await fetch(
            `${API_URL}/movies?${params.toString()}`
        );

        if (!response.ok) {
            throw new Error("Unable to load movies");
        }

        movies = await response.json();
        movieGrid.replaceChildren(
            ...movies.map(movie => createMovieCard(movie))
        );

        movieCount.textContent = `${movies.length} movie(s) found`;
        message.textContent = movies.length ? "" : "No movies found.";
    } catch (error) {
        message.textContent =
            "Could not connect to the movie API. Please try again.";
        movieGrid.replaceChildren();
        movieCount.textContent = "";
    }
}

function renderWatchlist() {
    watchlistGrid.replaceChildren(
        ...watchlist.map(movie => createMovieCard(movie, true))
    );
}

document.getElementById("searchButton")
    .addEventListener("click", loadMovies);

searchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") loadMovies();
});

genreFilter.addEventListener("change", loadMovies);

renderWatchlist();
loadMovies();
