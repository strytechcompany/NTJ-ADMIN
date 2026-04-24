const net = require('net');
const port = 5002;

const server = net.createServer();

server.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`❌ Port ${port} is STILL BUSY.`);
    process.exit(1);
  }
});

server.once('listening', () => {
  console.log(`✅ Port ${port} is FREE.`);
  server.close();
});

server.listen(port);
