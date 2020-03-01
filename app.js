//jshint esversion:6
require("dotenv").config();
const express = require('express');
const body_parser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const mongoose_encryption = require('mongoose-encryption');

const app = express();

app.set("view engine", "ejs");

app.use(express.static("public"));

app.use(body_parser.urlencoded({
  extended: true
}));

mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

userSchema.plugin(mongoose_encryption, {
  secret: process.env.SECRET,
  encryptedFields:["password"]
});

const User = mongoose.model("user", userSchema);

app.route("/")
  .get(function(req, res) {
    res.render("home");
  });

app.route("/login")
  .get(function(req, res) {
    res.render("login");
  })
  .post(function(req, res) {
    User.findOne({
      email: req.body.username
    }, function(err, foundUser) {
      if (foundUser) {
        if (foundUser.password === req.body.password) {
          res.render("secrets");
        }
      } else {
        res.send(err);
      }
    });
  });

app.route("/register")
  .get(function(req, res) {
    res.render("register");
  })
  .post(function(req, res) {
    const newuser = new User({
      email: req.body.username,
      password: req.body.password
    });
    newuser.save(function(err) {
      if (!err) {
        res.render("secrets");
      } else {
        res.send(err);
      }
    });
  });

app.listen(3000);
