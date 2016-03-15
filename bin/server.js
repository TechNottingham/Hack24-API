"use strict";

require('source-map-support').install();

const Log = require('../build/server/logger').Log;

function ensureEnvironment(vars) {
  var missing = vars.filter((val) => process.env[val] === undefined);
  if (missing.length > 0) {
    missing.forEach((name) => Log.error('Environment variable %s is not set', name));
    process.exit(1);
  }
}

ensureEnvironment([
  'HACKBOT_PASSWORD',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  'PUSHER_URL'
]);

var Server = require('../build/server/server.js').Server;

var server = new Server();
server.listen().then((info) => {
  Log.info(`Server started on port ${info.Port}`);
  process.send('started');
}).catch((err) => {
  Log.error('Server could not be started');
  Log.error(err);
  process.exit(1);
});