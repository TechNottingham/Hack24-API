var application_root = __dirname,
    express = require("express"),
    path = require("path"),
    mongoose = require('mongoose'),
    users = require('./routes/users'),
    bodyParser  = require('body-parser');


var app = express();

// Database
mongoose.connect(process.env.MONGODB_HOST + 'hack24DB');

// Config
app.use(bodyParser.json());
app.use(express.static(path.join(application_root, "public")));

app.get('/users', users.get);
app.get('/users/:id', users.getById);
app.delete('/users/:id', users.delete);
app.post('/users/', users.create);
app.put('/users/:id', users.update);

app.get('/api', function (req, res) {
  res.send('Hack24 API is running');
});

// Launch server

app.listen(3000);
console.log('Listening on port 3000...');




