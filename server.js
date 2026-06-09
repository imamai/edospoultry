// cPanel entry point — delegates to the pre-built Next.js standalone server
process.env.PORT = process.env.PORT || 3000;
process.env.HOSTNAME = 'localhost';

require('./.next/standalone/server.js');
