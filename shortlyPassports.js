var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;
var session = require('express-session');

var db = require('./app/config');
var Users = require('./app/collections/users');
var mUser = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

//Views
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());

// Parse JSON (uniform resource locators)
app.use(bodyParser.json());

// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

passport.use(new GitHubStrategy({
  clientID: '0dd66e8e1e56bf89f7ff',
  clientSecret: 'beab57516d283d7113c4dd9597bbc6fbc66bde3b',
  callbackURL: 'http://localhost:4568/auth/github/callback'
},
function(accessToken, refreshToken, profile, done) {
  return done(null, profile);
}
));

app.use(session({secret: 'beab57516d283d7113c4dd9597bbc6fbc66bde3b'}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

var ensureAuth = function (req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } 
  res.redirect('/auth/github');
};

app.get('/auth/github', passport.authenticate('github'));
app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/login'}), 
  function (req, res) {
    res.redirect('/');
    console.log('we are here');
  });

app.get('/', ensureAuth,
function(req, res) {
  res.render('index');
});

app.get('/create',
function(req, res) {
  res.render('index');
});

app.get('/links', 
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;
  // Need console log here. Apparently it saves our code. 
  console.log(uri);

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  
  Users.fetch().then(function(found) {
    if (found) {
      var myUser = Users.find(function (user) {
        return user.get('username') === username;
      });

      if (myUser && myUser.validate(password)) {
        res.redirect('/');
      } else {
        res.redirect('/login');
      }      
    }
  });

});

app.get('/signup', function(req, res) {
  res.render('signup');
});

app.post('/signup', function(req, res) {
  var myUser = new mUser({ username: req.body.username, password: req.body.password });
  Users.add(myUser);
  myUser.save().then(function() {
    myUser.fetch().then(function(found) {
      if (found) {
        console.log('found');
        res.redirect('/login');
      } else {
        console.log('not found, i guess...');
        res.sendStatus(404);
      }
    });
  });
});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('login');
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
