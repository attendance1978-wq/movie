const db = require('../config/db');

const adminAuth = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Check if user is admin
        const [users] = await db.execute(
            'SELECT is_admin FROM users WHERE id = ? AND is_admin = TRUE',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        next();
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = adminAuth;