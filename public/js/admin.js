class AdminPanel {
    constructor() {
        this.auth = new Auth();
        this.currentTab = 'dashboard';
        this.init();
    }

    async init() {
        if (!this.auth.checkAuth()) return;
        
        if (!this.auth.user?.is_admin) {
            window.location.href = '/home';
            return;
        }
        
        this.bindEvents();
        this.loadTab('dashboard');
    }

    bindEvents() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });
        
        // Upload form
        const uploadForm = document.getElementById('uploadForm');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => this.handleUpload(e));
        }
        
        // Search and filter
        const searchInput = document.getElementById('searchMovies');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.searchMovies());
        }
    }

    switchTab(tab) {
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        // Show selected tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tab);
        });
        
        this.currentTab = tab;
        this.loadTab(tab);
    }

    async loadTab(tab) {
        switch(tab) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'movies':
                await this.loadMovies();
                break;
            case 'users':
                await this.loadUsers();
                break;
            case 'upload':
                await this.loadGenres();
                break;
        }
    }

    async loadDashboard() {
        try {
            // Load stats
            const [moviesRes, usersRes] = await Promise.all([
                fetch('/api/movies'),
                this.auth.fetchWithAuth('/api/users/stats')
            ]);
            
            if (moviesRes.ok) {
                const moviesData = await moviesRes.json();
                document.getElementById('totalMovies').textContent = moviesData.pagination?.total || 0;
            }
            
            // You would need to implement user stats endpoint
            document.getElementById('totalUsers').textContent = 'N/A';
            document.getElementById('totalViews').textContent = 'N/A';
            document.getElementById('storageUsed').textContent = 'N/A';
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        }
    }

    async loadMovies() {
        try {
            const response = await fetch('/api/movies?limit=100');
            const data = await response.json();
            
            if (response.ok) {
                this.displayMovies(data.movies);
                this.populateGenreFilter(data.movies);
            }
        } catch (error) {
            console.error('Failed to load movies:', error);
        }
    }

    displayMovies(movies) {
        const table = document.getElementById('moviesTable');
        if (!table) return;
        
        table.innerHTML = movies.map(movie => `
            <tr>
                <td>${movie.title}</td>
                <td>${movie.genre}</td>
                <td>${movie.year || 'N/A'}</td>
                <td>${movie.average_rating || 'N/A'}</td>
                <td class="action-buttons">
                    <button class="action-btn edit" onclick="admin.editMovie(${movie.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn delete" onclick="admin.deleteMovie(${movie.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    populateGenreFilter(movies) {
        const select = document.getElementById('filterGenre');
        if (!select) return;
        
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

    async searchMovies() {
        const search = document.getElementById('searchMovies').value;
        const genre = document.getElementById('filterGenre').value;
        
        try {
            const url = new URL('/api/movies', window.location.origin);
            if (search) url.searchParams.append('search', search);
            if (genre) url.searchParams.append('genre', genre);
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (response.ok) {
                this.displayMovies(data.movies);
            }
        } catch (error) {
            console.error('Failed to search movies:', error);
        }
    }

    async loadUsers() {
        try {
            // You would need to implement a users endpoint
            document.getElementById('usersTable').innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px;">
                        User management feature coming soon
                    </td>
                </tr>
            `;
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    }

    async loadGenres() {
        try {
            const response = await fetch('/api/movies');
            const data = await response.json();
            
            if (response.ok) {
                this.populateGenreFilter(data.movies);
            }
        } catch (error) {
            console.error('Failed to load genres:', error);
        }
    }

    async handleUpload(e) {
        e.preventDefault();
        
        if (!this.auth.token) {
            alert('Please login to upload movies');
            return;
        }
        
        const form = e.target;
        const formData = new FormData();
        
        // Collect form data
        formData.append('title', document.getElementById('movieTitle').value);
        formData.append('description', document.getElementById('movieDescription').value);
        formData.append('year', document.getElementById('movieYear').value);
        formData.append('genre', document.getElementById('movieGenre').value);
        formData.append('director', document.getElementById('movieDirector').value);
        formData.append('cast', document.getElementById('movieCast').value);
        formData.append('duration', document.getElementById('movieDuration').value);
        formData.append('video', document.getElementById('movieFile').files[0]);
        
        // Show progress bar
        const progressBar = document.getElementById('uploadProgress');
        const progressFill = progressBar.querySelector('.progress-fill');
        progressBar.style.display = 'block';
        
        try {
            const response = await fetch('/api/admin/movies', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.auth.token}`
                },
                body: formData
            });
            
            // Simulate progress
            let progress = 0;
            const interval = setInterval(() => {
                progress += 5;
                progressFill.style.width = `${progress}%`;
                
                if (progress >= 100) {
                    clearInterval(interval);
                }
            }, 100);
            
            const data = await response.json();
            
            if (response.ok) {
                alert('Movie uploaded successfully!');
                form.reset();
                progressBar.style.display = 'none';
                progressFill.style.width = '0%';
                
                // Switch to movies tab
                this.switchTab('movies');
            } else {
                alert(data.error || 'Upload failed');
                progressBar.style.display = 'none';
                progressFill.style.width = '0%';
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed. Please try again.');
            progressBar.style.display = 'none';
            progressFill.style.width = '0%';
        }
    }

    async editMovie(movieId) {
        // In a real application, you would show a modal with the movie form
        alert('Edit movie feature coming soon');
    }

    async deleteMovie(movieId) {
        if (!confirm('Are you sure you want to delete this movie?')) return;
        
        try {
            const response = await this.auth.fetchWithAuth(`/api/admin/movies/${movieId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                alert('Movie deleted successfully');
                this.loadMovies();
            } else {
                const data = await response.json();
                alert(data.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Delete failed');
        }
    }
}

// Initialize admin panel
const admin = new AdminPanel();