const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authController = {
    register: async (req, res) => {
        try {
            const { username, email, password } = req.body;

            // Validate input
            if (!username || !email || !password) {
                return res.status(400).json({ error: 'All fields are required' });
            }

            // Check if user exists
            const [existingUsers] = await db.execute(
                'SELECT id FROM users WHERE email = ? OR username = ?',
                [email, username]
            );

            if (existingUsers.length > 0) {
                return res.status(400).json({ error: 'User already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create user
            const [result] = await db.execute(
                'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                [username, email, hashedPassword]
            );

            // Generate token
            const token = jwt.sign(
                { userId: result.insertId },
                process.env.JWT_SECRET || 'your-jwt-secret',
                { expiresIn: '24h' }
            );

            res.status(201).json({
                message: 'User created successfully',
                token,
                user: {
                    id: result.insertId,
                    username,
                    email
                }
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    },

    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            // Validate input
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required' });
            }

            // Find user
            const [users] = await db.execute(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );

            if (users.length === 0) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const user = users[0];

            // Check password
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Generate token
            const token = jwt.sign(
                { userId: user.id },
                process.env.JWT_SECRET || 'your-jwt-secret',
                { expiresIn: '24h' }
            );

            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    is_admin: user.is_admin
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    },

    getProfile: async (req, res) => {
        try {
            const [users] = await db.execute(
                `SELECT id, username, email, is_admin, created_at 
                 FROM users WHERE id = ?`,
                [req.user.id]
            );

            if (users.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json(users[0]);
        } catch (error) {
            res.status(500).json({ error: 'Server error' });
        }
    },

    updateProfile: async (req, res) => {
        try {
            const { username, email } = req.body;
            
            await db.execute(
                'UPDATE users SET username = ?, email = ? WHERE id = ?',
                [username, email, req.user.id]
            );

            res.json({ message: 'Profile updated successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Update failed' });
        }
    }
};

module.exports = authController;