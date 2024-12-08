const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const sslCertPath = path.resolve(__dirname, './certs/us-east-1-bundle.pem');
const client = new Client({
  connectionString: 'postgres://dev_user:HouseTabzDev@housetabz-dev-db.cl0qgkuk8wqo.us-east-1.rds.amazonaws.com:5432/housetabz_dev_db?sslmode=require',
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync(sslCertPath).toString(),
  },
});

(async () => {
  try {
    console.log('Testing connection with pg library...');
    await client.connect();
    console.log('Connected to database successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
  } finally {
    await client.end();
  }
})();
