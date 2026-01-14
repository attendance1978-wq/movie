require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'movie_streaming'
});

connection.connect();

const password = process.env.DEFAULT_PASSWORD || 'password123';
const hash = bcrypt.hashSync(password, 10);

const sql = `
  UPDATE users 
  SET password = ? 
  WHERE password = 'placeholder'
`;

connection.query(sql, [hash], (err, results) => {
  if (err) throw err;
  console.log(`Updated ${results.affectedRows} user(s) with the new password.`);
  console.log(`Default password is: ${password}`);
  connection.end();
});
