class MoviePlayer {
    constructor() {
        this.movieId = window.location.pathname.split('/').pop();
        this.videoPlayer = document.getElementById('videoPlayer');
        this.auth = new Auth();
        this.init();
    }

    async init() {
        await this.loadMovieInfo();
        this.setupVideoPlayer();
        this.bindEvents();
        this.loadRecommendations();
        this.loadReviews();
    }

    async loadMovieInfo() {
        try {
            const response = await fetch(`/api/movies/${this.movieId}`);
            const movie = await response.json();
            
            if (response.ok) {
                this.displayMovieInfo(movie);
                this.setupStreaming();
            }
        } catch (error) {
            console.error('Failed to load movie info:', error);
        }
    }

    displayMovieInfo(movie) {
        document.getElementById('movieTitle').textContent = movie.title;
        document.getElementById('movieYear').textContent = movie.year;
        document.getElementById('movieDuration').textContent = `${Math.floor(movie.duration / 60)}h ${movie.duration % 60}m`;
        document.getElementById('movieRating').textContent = `⭐ ${movie.average_rating || 'N/A'}`;
        document.getElementById('movieDescription').textContent = movie.description || 'No description available.';
        
        // Update favorite button
        const favoriteBtn = document.getElementById('favoriteBtn');
        if (movie.is_favorite) {
            favoriteBtn.innerHTML = '<i class="fas fa-heart"></i> Remove from Favorites';
            favoriteBtn.classList.add('active');
        }
    }

    setupVideoPlayer() {
        if (this.videoPlayer) {
            // Load saved progress
            this.loadProgress();
            
            // Save progress periodically
            this.videoPlayer.addEventListener('timeupdate', () => {
                this.saveProgress();
            });
            
            // Save progress when video ends
            this.videoPlayer.addEventListener('ended', () => {
                this.saveProgress(true);
            });
        }
    }

    setupStreaming() {
        if (this.videoPlayer) {
            const videoSrc = `/api/stream/${this.movieId}`;
            this.videoPlayer.src = videoSrc;
        }
    }

    async loadProgress() {
        if (!this.auth.token) return;
        
        try {
            const response = await this.auth.fetchWithAuth(`/api/progress/${this.movieId}`);
            if (response) {
                const progress = await response.json();
                if (progress.progress > 0) {
                    this.videoPlayer.currentTime = progress.progress;
                    
                    // Ask user if they want to continue from last position
                    if (progress.progress > 60) { // If watched more than 1 minute
                        const shouldContinue = confirm('Continue from where you left off?');
                        if (!shouldContinue) {
                            this.videoPlayer.currentTime = 0;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load progress:', error);
        }
    }

    async saveProgress(completed = false) {
        if (!this.auth.token || !this.videoPlayer) return;
        
        const progress = Math.floor(this.videoPlayer.currentTime);
        const duration = Math.floor(this.videoPlayer.duration);
        
        if (duration > 0 && progress > 0) {
            try {
                await this.auth.fetchWithAuth(`/api/progress/${this.movieId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        progress,
                        duration,
                        completed
                    })
                });
            } catch (error) {
                console.error('Failed to save progress:', error);
            }
        }
    }

    bindEvents() {
        // Play button
        const playBtn = document.getElementById('playBtn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                if (this.videoPlayer.paused) {
                    this.videoPlayer.play();
                    playBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
                } else {
                    this.videoPlayer.pause();
                    playBtn.innerHTML = '<i class="fas fa-play"></i> Play';
                }
            });
        }
        
        // Favorite button
        const favoriteBtn = document.getElementById('favoriteBtn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', () => this.toggleFavorite());
        }
        
        // Back button
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.href = '/home';
            });
        }
        
        // Review submission
        const submitReviewBtn = document.getElementById('submitReview');
        if (submitReviewBtn) {
            submitReviewBtn.addEventListener('click', () => this.submitReview());
        }
        
        // Star ratings
        const stars = document.querySelectorAll('.star');
        stars.forEach(star => {
            star.addEventListener('click', () => this.setRating(star.dataset.rating));
        });
    }

    async toggleFavorite() {
        if (!this.auth.token) {
            alert('Please login to add favorites');
            return;
        }
        
        const favoriteBtn = document.getElementById('favoriteBtn');
        const isFavorite = favoriteBtn.classList.contains('active');
        
        try {
            if (isFavorite) {
                await this.auth.fetchWithAuth(`/api/movies/${this.movieId}/favorite`, {
                    method: 'DELETE'
                });
                favoriteBtn.innerHTML = '<i class="far fa-heart"></i> Add to Favorites';
                favoriteBtn.classList.remove('active');
            } else {
                await this.auth.fetchWithAuth(`/api/movies/${this.movieId}/favorite`, {
                    method: 'POST'
                });
                favoriteBtn.innerHTML = '<i class="fas fa-heart"></i> Remove from Favorites';
                favoriteBtn.classList.add('active');
            }
        } catch (error) {
            console.error('Failed to update favorite:', error);
        }
    }

    async loadRecommendations() {
        try {
            const response = await fetch(`/api/stream/${this.movieId}/recommended`);
            const recommendations = await response.json();
            
            if (response.ok) {
                this.displayRecommendations(recommendations);
            }
        } catch (error) {
            console.error('Failed to load recommendations:', error);
        }
    }

    displayRecommendations(movies) {
        const container = document.getElementById('recommendations');
        if (!container) return;
        
        container.innerHTML = movies.map(movie => `
            <div class="movie-card" onclick="window.location.href='/player/${movie.id}'">
                <img src="${movie.thumbnail_path || 'https://via.placeholder.com/300x450'}" 
                     alt="${movie.title}" class="movie-poster">
                <div class="movie-info">
                    <h4 class="movie-title">${movie.title}</h4>
                    <div class="movie-meta">
                        <span>${movie.year}</span>
                        <span class="movie-rating">⭐ ${movie.average_rating || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async loadReviews() {
        try {
            const response = await fetch(`/api/movies/${this.movieId}`);
            const movie = await response.json();
            
            if (response.ok && movie.reviews) {
                this.displayReviews(movie.reviews);
            }
        } catch (error) {
            console.error('Failed to load reviews:', error);
        }
    }

    displayReviews(reviews) {
        const container = document.getElementById('reviewsList');
        if (!container) return;
        
        if (reviews.length === 0) {
            container.innerHTML = '<p>No reviews yet. Be the first to review!</p>';
            return;
        }
        
        container.innerHTML = reviews.map(review => `
            <div class="review-item">
                <div class="review-header">
                    <span class="review-user">${review.username}</span>
                    <span class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</span>
                </div>
                <div class="review-content">${review.comment || 'No comment provided.'}</div>
                <small class="review-date">${new Date(review.created_at).toLocaleDateString()}</small>
            </div>
        `).join('');
    }

    setRating(rating) {
        const stars = document.querySelectorAll('.star');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.textContent = '★';
                star.classList.add('active');
            } else {
                star.textContent = '☆';
                star.classList.remove('active');
            }
        });
        
        this.selectedRating = rating;
    }

    async submitReview() {
        if (!this.auth.token) {
            alert('Please login to submit a review');
            return;
        }
        
        if (!this.selectedRating) {
            alert('Please select a rating');
            return;
        }
        
        const comment = document.getElementById('reviewText').value;
        
        try {
            const response = await this.auth.fetchWithAuth(`/api/movies/${this.movieId}/review`, {
                method: 'POST',
                body: JSON.stringify({
                    rating: this.selectedRating,
                    comment
                })
            });
            
            if (response.ok) {
                alert('Review submitted successfully!');
                this.loadReviews();
                
                // Reset form
                document.getElementById('reviewText').value = '';
                this.setRating(0);
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to submit review');
            }
        } catch (error) {
            console.error('Failed to submit review:', error);
            alert('Failed to submit review');
        }
    }
}

// Initialize player when page loads
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('/player/')) {
        new MoviePlayer();
    }
});