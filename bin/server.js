require('source-map-support').install();

function ensureEnvironment(vars) {
  var missing = vars.filter((val) => process.env[val] === undefined);
  if (missing.length > 0) {
    missing.forEach((name) => console.error('Environment variable %s is not set', name));
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
  console.log(`Server started on port ${info.Port}`);
}).catch((err) => {
  console.error('Server could not be started');
  console.error(err);
  process.exit(1);
});