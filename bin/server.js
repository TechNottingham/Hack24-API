require('source-map-support').install();

var Server = require('../build/server/server').Server;

var server = new Server();
server.listen()
      .then((info) => {
        console.log(`Server started on port ${info.Port}`)
      })