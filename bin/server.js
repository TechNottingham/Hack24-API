var Server = require('../build/server/server');

const server = new Server.Server();
server.listen()
      .then((info) => {
        console.log(`Server started on port ${info.Port}`)
      })