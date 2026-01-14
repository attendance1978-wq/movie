class HomePage {
    constructor() {
        this.auth = new Auth();
        this.currentPage = 1;
        this.totalPages = 1;
        this.init();
    }

    async init() {
        if (!this.auth.checkAuth()) return;

        this.bindEvents();
        this.updateUserInfo();
        this.checkAdminFeatures();
        await this.loadFeaturedMovies();
        await this.loadContinueWatching();
        await this.loadMovies();
    }

    bindEvents() {
        // Search
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');
        
        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => this.searchMovies());
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.searchMovies();
            });
        }
        
        // Genre buttons
        document.querySelectorAll('.genre-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const genre = e.target.dataset.genre;
                this.filterByGenre(genre);
            });
        });
        
        // Sort and filter
        const sortSelect = document.getElementById('sortSelect');
        const genreSelect = document.getElementById('genreSelect');
        
        if (sortSelect) {
            sortSelect.addEventListener('change', () => this.loadMovies());
        }
        
        if (genreSelect) {
            genreSelect.addEventListener('change', () => this.loadMovies());
        }
        
        // Pagination
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.changePage(-1));
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.changePage(1));
        }
        
        // Explore button
        const exploreBtn = document.getElementById('exploreBtn');
        if (exploreBtn) {
            exploreBtn.addEventListener('click', () => {
                document.getElementById('movies').scrollIntoView({ behavior: 'smooth' });
            });
        }
    }

    updateUserInfo() {
        const usernameElement = document.getElementById('username');
        if (usernameElement && this.auth.user) {
            usernameElement.textContent = this.auth.user.username;
        }
    }

    async loadFeaturedMovies() {
        try {
            const response = await fetch('/api/movies/featured');
            const movies = await response.json();
            
            if (response.ok) {
                this.displayMovies(movies, 'featuredMovies');
            }
        } catch (error) {
            console.error('Failed to load featured movies:', error);
        }
    }

    async loadContinueWatching() {
        if (!this.auth.token) return;
        
        try {
            const response = await this.auth.fetchWithAuth('/api/progress/continue');
            if (response) {
                const movies = await response.json();
                this.displayMovies(movies, 'continueWatching');
            }
        } catch (error) {
            console.error('Failed to load continue watching:', error);
        }
    }

    async loadMovies() {
        const sort = document.getElementById('sortSelect')?.value || 'rating';
        const genre = document.getElementById('genreSelect')?.value || '';
        const search = document.getElementById('searchInput')?.value || '';
        
        try {
            const url = new URL('/api/movies', window.location.origin);
            url.searchParams.append('page', this.currentPage);
            url.searchParams.append('sort', sort);
            if (genre) url.searchParams.append('genre', genre);
            if (search) url.searchParams.append('search', search);
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (response.ok) {
                this.displayMovies(data.movies, 'allMovies');
                this.updatePagination(data.pagination);
                this.populateGenreSelect(data.movies);
            }
        } catch (error) {
            console.error('Failed to load movies:', error);
        }
    }

    displayMovies(movies, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (!movies || movies.length === 0) {
            container.innerHTML = '<p class="no-movies">No movies found</p>';
            return;
        }
        
        container.innerHTML = movies.map(movie => `
            <div class="movie-card" onclick="window.location.href='/player/${movie.id}'">
                <img src="${movie.thumbnail_path || 'https://via.placeholder.com/300x450'}" 
                     alt="${movie.title}" class="movie-poster">
                <div class="movie-info">
                    <h4 class="movie-title">${movie.title}</h4>
                    <div class="movie-meta">
                        <span>${movie.year || 'N/A'}</span>
                        <span>${Math.floor(movie.duration / 60)}h ${movie.duration % 60}m</span>
                        <span class="movie-rating">⭐ ${movie.average_rating || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    populateGenreSelect(movies) {
        const select = document.getElementById('genreSelect');
        if (!select) return;
        
        // Clear existing options except the first one
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        const genres = new Set();
        movies.forEach(movie => {
            if (movie.genre) {
                movie.genre.split(',').forEach(g => genres.add(g.trim()));
            }
        });
        
        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre;
            option.textContent = genre;
            select.appendChild(option);
        });
    }

    updatePagination(pagination) {
        if (!pagination) return;
        
        this.currentPage = pagination.page;
        this.totalPages = pagination.pages;
        
        const pageInfo = document.getElementById('pageInfo');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        
        if (pageInfo) {
            pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
        }
        
        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= this.totalPages;
        }
    }

    changePage(delta) {
        const newPage = this.currentPage + delta;
        if (newPage >= 1 && newPage <= this.totalPages) {
            this.currentPage = newPage;
            this.loadMovies();
        }
    }

    searchMovies() {
        this.currentPage = 1;
        this.loadMovies();
    }

    filterByGenre(genre) {
        const select = document.getElementById('genreSelect');
        if (select) {
            select.value = genre;
            this.currentPage = 1;
            this.loadMovies();
        }
    }
}

// Initialize home page
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('/home')) {
        new HomePage();
    }
});