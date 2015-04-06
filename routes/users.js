var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var User = new Schema({
    name: { type: String, required: true },
    slackUsername: { type: String, required: false },
    modified: { type: Date, default: Date.now }
});
var UserModel = mongoose.model('User', User);

exports.get = function(req, res) {
    return UserModel.find(function (err, users) {
    if (!err) {
      return res.send(users);
    } else {
      return console.log(err);
    }
  });
};

exports.getById = function(req, res) {
    return UserModel.findById(req.params.id, function (err, user) {
    if (!err) {
      return res.send(user);
    } else {
      return console.log(err);
    }
  });
};

exports.create = function(req, res) {
  var user;
  console.log("POST: ");
  console.log(req.body);
  user = new UserModel({
    name: req.body.name,
    slackUsername: req.body.slackUsername
  });
  user.save(function (err) {
    if (!err) {
      return console.log("created");
    } else {
      return console.log(err);
    }
  });
  return res.send(user);
};


exports.update =  function (req, res){
  return UserModel.findById(req.params.id, function (err, user) {
    user.name= req.body.name;
    user.slackUsername= req.body.slackUsername;
    return user.save(function (err) {
      if (!err) {
        console.log("updated");
      } else {
        console.log(err);
      }
      return res.send(user);
      });


    });
  };

  exports.delete =  function (req, res){
    return UserModel.findById(req.params.id, function (err, user) {
        return user.remove(function (err) {
          if (!err) {
            console.log("removed");
            return res.send('');
          } else {
            console.log(err);
          }
        });
      });
  };
