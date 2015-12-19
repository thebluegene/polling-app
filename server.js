'use strict';
var express = require('express');
var app = express();

var mongojs = require('mongojs');
var mongo = require('mongodb').MongoClient;

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var bodyParser = require('body-parser');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var UserSchema = new Schema({
    username: {
        type: String,
        trim: true
    },
    password: {
        type: String,
        trim: true
    }
});
var QSchema = new Schema({
    question: String,
    options: Array,
    count: Array,
    username: String
});
mongoose.model('User', UserSchema);
mongoose.model('questions', QSchema)

var User = mongoose.model('User');
var questions = mongoose.model('questions');

var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

mongoose.connect(process.env.MONGOLAB_URI || 'mongodb://localhost/users');

app.use(express.static(__dirname + "/client"));
app.use(bodyParser.json());
app.use(session({
    store: new MongoStore({
        url: process.env.MONGOLAB_URI || 'mongodb://localhost/test'
    }),
    secret: 'mySecretKey',
    resave: true,
    saveUninitialized: true
}));


//LOG IN AND SIGN UP ROUTES
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(
    function(username, password, done) {
        User.findOne({
            'username': username
        }, function(err, user) {
            if (err) {
                throw err;
            }
            if (!user) {
                return done(null, false, {
                    alert: 'Incorrect username.'
                });
            }
            if (user.password != password) {
                return done(null, false, {
                    alert: 'Incorrect password.'
                });
            }
            return done(null, user);
        });
    }
));
passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

//CHECK IF AUTHENTICATED
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.send(401);
}

//LOG IN AND SIGN UP ROUTES
app.post('/login', passport.authenticate('local'), function(req, res) {
    res.json(req.user);
});

app.get('/currentuser', isAuthenticated, function(req, res) {
    res.json(req.user);
});
app.post('/signup', function(req, res) {

    var u = new User();
    u.username = req.body.username;
    u.password = req.body.password;
    u.save(function(err) {
        if (err) {
            res.json({
                'alert': 'Registration error'
            });
        }
        else {
            res.json({
                'alert': 'Registration success'
            });
        }
    });
});

app.get('/logout', function(req, res) {
    console.log('logout');
    req.logout();
    res.send(200);
});


//QUESTIONS PART OF SERVERs
;app.get('/questions', function(req, res) {
    console.log('I recieved a GET request');
    questions.find(function(err, docs) {
        if (err) throw err;
        console.log(docs);
        res.json(docs);
    });

});

app.post('/questions', isAuthenticated, function(req, res) {
    var q = new questions();
    q.question = req.body.question;
    q.options = req.body.options;
    q.count = req.body.count;
    q.username = req.body.username;
    q.save(function(err) {
        if (err) throw err;
        res.json(q);
    });
});

app.delete('/questions/:id', isAuthenticated, function(req, res) {
    var id = req.params.id;
    //console.log(id);
    questions.remove({
        _id: mongojs.ObjectId(id)
    }, function(err, doc) {
        if (err) throw err;
        res.json(doc);
    });
});

app.put('/questions/:id', function(req, res) {
    var id = req.params.id;
    if (req.body.newChoice && req.body.count) {
        questions.update({
                _id: id
            }, {
                $addToSet: {
                    options: req.body.newChoice
                },
                $set: {
                    count: req.body.count
                }
            },
            function(err) {
                if (err) throw err;
            }
        );
    }
    else {
        questions.update({
                _id: id
            }, {
                $set: {
                    count: req.body
                }
            },
            function(err) {
                if (err) throw err;
            }
        );
    }
});
var port = process.env.PORT || 8080;
app.listen(port, function() {
    console.log('Listening on port ' + port + '...');
});