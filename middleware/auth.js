const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
        
        // Check if user exists
        const [users] = await db.execute(
            'SELECT id, username, email, is_admin FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            throw new Error();
        }

        req.user = users[0];
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate' });
    }
};

const adminMiddleware = (req, res, next) => {
    if (!req.user || !req.user.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

module.exports = { authMiddleware, adminMiddleware };