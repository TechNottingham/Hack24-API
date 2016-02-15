require('source-map-support').install();

var Server = require('../build/server/server.js').Server;

var server = new Server();
server.listen().then((info) => {
  console.log(`Server started on port ${info.Port}`);
}).catch((err) => {
  console.error('Server could not be started');
  console.error(err);
  process.exit(1);
});