//jshint esversion:6
require("dotenv").config();
const express = require('express');
const body_parser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
// const mongoose_encryption = require('mongoose-encryption');
// const md5 = require('md5');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const session = require('express-session');
const passport = require('passport');
const passport_local_mongoose = require('passport-local-mongoose');
const mongoose_findorcreate = require('mongoose-findorcreate');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;

const app = express();

app.set("view engine", "ejs");

app.use(express.static("public"));

app.use(body_parser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "mylittlesecret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());

app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
});

userSchema.plugin(passport_local_mongoose);

userSchema.plugin(mongoose_findorcreate);

// userSchema.plugin(mongoose_encryption, {
//   secret: process.env.SECRET,
//   encryptedFields:["password"]
// });

const User = mongoose.model("user", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({
      facebookId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

app.route("/")
  .get(function(req, res) {
    res.render("home");
  });

app.get("/auth/google", passport.authenticate("google", {
  scope: ["profile"]
}));

app.get('/auth/google/secrets',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.route("/secrets")
  .get(function(req, res) {
    User.find({
      "secret": {
        $ne: null
      }
    }, function(err, foundUser) {
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          res.render("secrets", {
            usersithsecrets:foundUser
          });
        }
      }
    });
  });

app.route("/login")
  .get(function(req, res) {
    res.render("login");
  })
  .post(function(req, res) {
    // User.findOne({
    //   email: req.body.username
    // }, function(err, foundUser) {
    //   if (foundUser) {
    //     bcrypt.compare(req.body.password, foundUser.password, function(err, result) {
    //       if(result===true){
    //         res.render("secrets");
    //       }
    //     });
    //   } else {
    //     res.send(err);
    //   }
    // });
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });
    req.login(user, function(err) {
      if (err) {
        console.log(err);
      } else {
        passport.authenticate("local")(req, res, function() {
          res.redirect("/secrets");
        });
      }
    });
  });

app.route("/register")
  .get(function(req, res) {
    res.render("register");
  })
  .post(function(req, res) {
    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //   const newuser = new User({
    //     email: req.body.username,
    //     password: hash
    //   });
    //   newuser.save(function(err) {
    //     if (!err) {
    //       res.render("secrets");
    //     } else {
    //       res.send(err);
    //     }
    //   });
    // });
    User.register({
      username: req.body.username
    }, req.body.password, function(err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function() {
          res.redirect("/secrets");
        });
      }
    });
  });

app.route("/logout")
  .get(function(req, res) {
    req.logout();
    res.redirect("/");
  });

app.route("/submit")
  .get(function(req, res) {
    if (req.isAuthenticated()) {
      res.render("submit");
    } else {
      res.redirect("/login");
    }
  })
  .post(function(req, res) {
    console.log(req.user._id);
    User.findById(req.user.id, function(err, foundUser) {
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          foundUser.secret = req.body.secret;
          foundUser.save(function() {
            res.redirect("/secrets");
          });
        }
      }
    });
  });
//9022566766

app.listen(3000);
