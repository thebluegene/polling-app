'use strict';
var express = require('express');
var app = express();

var mongojs = require('mongojs');
var db = mongojs('questions', ['questions']);

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
mongoose.model('User', UserSchema);
var User = mongoose.model('User');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

mongoose.connect('mongodb://heroku_q67rt94k:hfqflnv6fa95d7c7j3bg2lskn@ds033125.mongolab.com:33125/heroku_q67rt94k');
app.use(express.static(__dirname+"/client"));
app.use(bodyParser.json());
app.use(session(
    {store: new MongoStore({
        url: 'mongodb://heroku_q67rt94k:hfqflnv6fa95d7c7j3bg2lskn@ds033125.mongolab.com:33125/heroku_q67rt94k'
    }),
    secret:'mySecretKey',
    resave: true,
    saveUninitialized: true
}));


//LOG IN AND SIGN UP ROUTES
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(
    function(username, password, done){
        User.findOne({'username': username}, function(err, user){
            if(err){
                throw err;
            }
            if(!user){
                console.log('whats up');
                return done(null, false, {alert:'Incorrect username.'});
            }
            if(user.password != password){
                console.log('que paso');
                return done(null, false, {alert: 'Incorrect password.'});
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
function isAuthenticated(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
    res.send(401);
}

//LOG IN AND SIGN UP ROUTES
app.post('/login', passport.authenticate('local'), function(req, res){
    console.log(req.user);
    res.json(req.user);
});

app.get('/currentuser',isAuthenticated,function(req,res){
        res.json(req.user);
});
app.post('/signup',function(req,res){
 
var u =  new User();
    u.username = req.body.username;
    u.password = req.body.password;
    u.save(function(err){
        if (err) {
            res.json({'alert':'Registration error'});
        }else{
            res.json({'alert':'Registration success'});
        }
    });
});

app.get('/logout', function(req, res){
    console.log('logout');
    req.logout();
    res.send(200);
});




//QUESTIONS PART OF SERVER
app.get('/questions', function(req, res){
    console.log('I recieved a GET request');
    db.questions.find(function(err, docs){
        if(err) throw err;
        console.log(docs);
        res.json(docs);
    });
    
});

app.post('/questions', isAuthenticated, function(req, res){
   console.log(req.body); 
   db.questions.insert(req.body, function(err,doc){
       if(err) throw err;
       res.json(doc);
   });
});

app.delete('/questions/:id', isAuthenticated, function(req,res){
    var id = req.params.id;
    //console.log(id);
    db.questions.remove({_id: mongojs.ObjectId(id)}, function(err,doc){
       if(err) throw err; 
       res.json(doc);
    });
});

app.put('/questions/:id', function(req,res){
    var id=req.params.id;
    if(req.body.newChoice && req.body.count){
        db.questions.findAndModify({query:{_id: mongojs.ObjectId(id)},
            update:{$addToSet:{options: req.body.newChoice}, $set:{count: req.body.count}},
            new: true}, function(err,doc){
                if(err) throw err;
                res.json(doc);
            }
        );
    }
    else{
        console.log('count being saved');
        db.questions.findAndModify({query:{_id: mongojs.ObjectId(id)},
            update:{$set:{count: req.body}},
            new: true}, function(err,doc){
                if(err) throw err;
                res.json(doc);
        });
    }
});
var port = process.env.PORT || 8080;
app.listen(port, function () {
    console.log('Listening on port 8080...');
});