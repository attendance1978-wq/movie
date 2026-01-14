const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const db = require('./db');

const sessionStore = new MySQLStore({}, db);

module.exports = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    }
};