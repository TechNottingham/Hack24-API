var application_root = __dirname,
    express = require("express"),
    path = require("path"),
    mongoose = require('mongoose'),
    users = require('./routes/users'),
    teams = require('./routes/teams'),
    models = require('./models'),
    bodyParser  = require('body-parser');


var app = express();

// Database
mongoose.connect(process.env.MONGODB_HOST + 'hack24DB');

function createModels (req, res, next) {
  req.models = {
    User: mongoose.model('User', models.User),
    Team: mongoose.model('Team', models.Team)
  };
  return next();
}

// Config
app.use(bodyParser.json());
app.use(express.static(path.join(application_root, "public")));

app.get('/users',createModels,users.get);
app.get('/users/:id',createModels, users.getById);
app.get('/users/:id',createModels, users.getByName);
app.delete('/users/:id',createModels, users.delete);
app.post('/users/',createModels, users.create);
app.put('/users/:id,createModels', users.update);

app.get('/teams',createModels, teams.get);
app.get('/teams/:id',createModels, teams.getById);
app.delete('/teams/:id',createModels, teams.delete);
app.post('/teams/',createModels, teams.create);
app.put('/teams/:id',createModels, teams.update);

app.get('/api', function (req, res) {
  res.send('Hack24 API is running');
});

// Launch server

app.listen(3000);
console.log('Listening on port 3000...');




