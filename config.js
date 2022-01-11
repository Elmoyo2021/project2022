const env = process.env;

const config = {
    db: { /* do not put password or any sensitive info here, done only for demo */
        host: env.DB_HOST || 'localhost',
        user: env.DB_USER || 'root',
        password: env.DB_PASSWORD || '7cfea67be41d2eac',
        database: env.DB_NAME || 'demo1',
        waitForConnections: true,
        connectionLimit: env.DB_CONN_LIMIT || 2,
        queueLimit: 0,
        debug: env.DB_DEBUG || false
    },
};

module.exports = config;