const { exec } = require('child_process');

// cPanel automatically injects the correct port into process.env.PORT
const port = process.env.PORT || 3000;

console.log(`Starting development server on port ${port}...`);

// This runs your exact local command on the server
const server = exec(`npm run dev -- --port ${port}`);

server.stdout.on('data', (data) => console.log(data));
server.stderr.on('data', (data) => console.error(data));
