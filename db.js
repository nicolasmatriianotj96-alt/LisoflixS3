const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => console.log('DB erro:', err.message));
pool.query('SELECT 1').then(() => console.log('DB conectado')).catch(err => console.log('DB erro conexão:', err.message));

module.exports = pool;