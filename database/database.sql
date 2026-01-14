-- Create database
CREATE DATABASE IF NOT EXISTS movie_streaming;
USE movie_streaming;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Movies table
CREATE TABLE IF NOT EXISTS movies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    year INT,
    genre VARCHAR(100),
    duration INT, -- in minutes
    director VARCHAR(100),
    cast TEXT,
    rating DECIMAL(3,1) DEFAULT 0.0,
    poster_url VARCHAR(500),
    trailer_url VARCHAR(500),
    video_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Watch progress table
CREATE TABLE IF NOT EXISTS watch_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    movie_id INT NOT NULL,
    progress INT DEFAULT 0, -- in seconds
    duration INT, -- total duration in seconds
    last_watched TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_movie (user_id, movie_id)
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    movie_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_favorite (user_id, movie_id)
);

-- Watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    movie_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_watchlist (user_id, movie_id)
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    movie_id INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_movie_review (user_id, movie_id)
);

-- Insert sample data
INSERT INTO users (username, email, password, is_admin) VALUES
('admin', 'admin@stream.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', TRUE),
('user1', 'user1@email.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', FALSE);

INSERT INTO movies (title, description, year, genre, duration, director, cast, rating, poster_url, video_path) VALUES
('Inception', 'A thief who steals corporate secrets through dream-sharing technology.', 2010, 'Sci-Fi, Action', 148, 'Christopher Nolan', 'Leonardo DiCaprio, Joseph Gordon-Levitt', 8.8, 'https://example.com/inception.jpg', '/videos/inception.mp4'),
('The Shawshank Redemption', 'Two imprisoned men bond over a number of years.', 1994, 'Drama', 142, 'Frank Darabont', 'Tim Robbins, Morgan Freeman', 9.3, 'https://example.com/shawshank.jpg', '/videos/shawshank.mp4');

-- Create indexes for better performance
CREATE INDEX idx_movies_genre ON movies(genre);
CREATE INDEX idx_movies_year ON movies(year);
CREATE INDEX idx_watch_progress_user ON watch_progress(user_id);
CREATE INDEX idx_watch_progress_movie ON watch_progress(movie_id);