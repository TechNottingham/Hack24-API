export var Get = function(req, res) {
  return req.models.Team.find(function(err, teams) {
    if (err) return console.log(err);
    return res.send(teams);
  });
};

export var GetById = function(req, res) {
  return req.models.Team.findById(req.params.id)
    .populate('members')
    .exec(function(err, team) {
      if (!err) {
        return res.send(team);
      } else {
        return console.log(err);
      }
    });
};

export var GetByName = function(req, res) {
  return req.models.Team.findOne({ 'name': req.params.name })
    .populate('members')
    .exec(function(err, team) {
      if (!err) {
        return res.send(team);
      } else {
        return console.log(err);
      }
    });
};


export var Create = function(req, res) {
  var team;
  console.log("POST: ");
  console.log(req.body);
  team = new req.models.Team({
    name: req.body.name,
    motto: req.body.motto
  });
  team.save(function(err) {
    if (!err) {
      return console.log("created");
    } else {
      return console.log(err);
    }
  });
  return res.send(team);
};


export var Update = function(req, res) {
  return req.models.Team.findById(req.params.id, function(err, team) {
    team.name = req.body.name;
    team.motto = req.body.motto;
    team.modified = Date.now;
    return team.save(function(err) {
      if (!err) {
        console.log("updated");
      } else {
        console.log(err);
      }
      return res.send(team);
    });


  });
};

export var Delete = function(req, res) {
  return req.models.Team.findById(req.params.id, function(err, team) {
    return team.remove(function(err) {
      if (!err) {
        console.log("removed");
        return res.send('');
      } else {
        console.log(err);
      }
    });
  });
};


export var AddMember = function(req, res) {
  return req.models.Team.findById(req.params.id, function(err, team) {
    team.modified = Date.now;
    return req.models.findById(req.params.id, function(err, user, team) {
      if (!err) {
        team.members.push(user);
        return team.save(function(err) {
          if (!err) {
            console.log("updated");
          } else {
            console.log(err);
          }
          return res.send(team);
        });
      } else {
        console.log(err);
        return res.status(404).send('User not found');
      }
    });


  });
};
