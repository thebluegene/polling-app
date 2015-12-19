var myApp = angular.module('myApp', ['ngRoute'])
.config(['$routeProvider',
    function($routeProvider) {
        $routeProvider.
            when('/login', {
                templateUrl: '../partials/login.html',
                controller: 'authController'
            }).
            when('/signup', {
                templateUrl: '../partials/signup.html',
                controller: 'authController'
            }).
            when('/currentuser', {
                templateUrl: '../partials/user-info.html',
                controller: 'authController'
            }).
            when('/poll', {
                templateUrl: '../partials/poll-list.html',
                controller: 'AppController'
            }).
            when('/selected/:pollID', {
                templateUrl: '../partials/poll.html',
                controller: 'AppController'
            }).
            otherwise({
                redirectTo: '/poll'
            });
    }]);

$('#login').submit(function(){
    var $inputs=$('#login :input');
    console.log($inputs);
});

myApp.controller('authController', function($scope, $http, $location){
   $scope.user={email:'',password:''};
   $scope.alert='';
   $scope.loggedin=function(){
       if(localStorage.getItem('username')){
           return true;
       }
       else{
           return false;
       }
   };
   
   $scope.login=function(user){
       console.log('log in');
       $http.post('/login', user)
       .success(function(data){
            localStorage.setItem('username', data.username);
            $scope.loggeduser=data;
            $location.path('/poll');
        })
        .error(function(){
            $scope.alert = 'Login failed';
        });
   };
   $scope.signup=function(user){
       $http.post('/signup', user)
       .success(function(data){
           $scope.alert = data.alert;
       })
       .error(function(){
           $scope.alert = 'Registration failed';
       });
   };
   $scope.userinfo = function(){
       $http.get('/currentuser')
       .success(function(data){
           $scope.loggeduser = data;
       })
       .error(function(){
           $location.path('/signin');
       });
   };
   $scope.logout=function(){
       $http.get('/logout')
       .success(function(data){
           localStorage.clear();
           $scope.loggeduser = {};
           $location.path('/signin');
       })
       .error(function(){
           $scope.alert = 'Logout failed';
       });
   };
});

//Main controller for individual polls
myApp.controller('AppController', ['$scope','$http', '$rootScope', '$routeParams', '$location',
function($scope, $http, $rootScope, $routeParams, $location){
    console.log('Hello world from controller');
    $scope.URL = document.URL.replace('#',"%23");
    
    
    $rootScope.$on('CallParentMethod', function(){
        $scope.parentmethod();
        console.log('emitted from childmethod');
    });
    $scope.parentmethod = function(){
        $http.get('/questions').success(function(response){
            console.log('I got the data I requested: ' + response);
            $scope.questions = response;
            $scope.quest = '';
            
            if($routeParams.pollID){
                var id=$routeParams.pollID;
                for(var question in $scope.questions){
                    if($scope.questions[question]._id==id){
                        $scope.quested = $scope.questions[question];
                    }
                }
            }
        });
    };
    $scope.parentmethod();
    $scope.remove = function(id){
        console.log(id);
        $http.delete('/questions/' + id).success(function(response){
            $scope.parentmethod();
        });
    };
    
    $scope.show = function(user){
        if(localStorage.getItem('username') == user){
            console.log('they match');
            return true;
        }
        return false;
    };
    
    $scope.anotherOption=function(quested, newChoice){
        console.log(quested);
        quested.count.push(0);
        var data = {newChoice: newChoice, count:quested.count};
        $http.put('/questions/'+quested._id, data);
        $scope.parentmethod();
        $('.another-option').val('');
        
    };
   
    $scope.results = function(quest){
        var isSelected = false;
        
        for(var i in quest.options){
            if(quest.options[i] == quest.selected){
                isSelected = true;
                quest.count[i]++;
                console.log(quest.count);
                $http.put('/questions/'+ quest._id, quest.count);
            }
        }
        if (isSelected==true){
            quest.polled = true;
            setTimeout(function(){showResults(quest.options, quest.count)}, 0);
        }
        else{
            alert("You didn't select an option!");
            console.log('hello');  
        }
    };
    
    $scope.selected = function(quest){
        $location.path('/selected');
    };
    
    function showResults(options, count, polled){
        console.log(options, count);       
        $scope.quested.polled = true; 
        var ctx = document.getElementById('poll').getContext('2d');
        var data = {labels: options, datasets: [{data:count}]};
        new Chart(ctx).Bar(data);
    }
    
}]);


//Controller to add polls
myApp.controller('AddPoll',['$scope', '$http', '$rootScope',
function($scope,$http, $rootScope){
    $scope.newQ;
    $scope.choices = [{id:'choice0', count:0},{id:'choice1', count:0}];
    
    function allForms(){
        for(var each in $scope.choices){
            console.log($scope.choices[each].value);
            if($scope.choices[each].value == null || $scope.newQ == null){
                return false;
            }
        }
        return true;
    }
    
    $scope.addOption = function(){
        var newItemNo=$scope.choices.length;
        
        if(allForms()){
            $scope.choices.push({'id':'choice'+newItemNo, 'count':0});
        }
        else{
            alert('Make sure all forms are filled out!');
        }
    };
    
    //Adds question to current polls. Calls parentmethod to refresh.
    $scope.addQuestion = function(){
        if(allForms()){
            var values = [];
            var counter = [];
            
            $scope.childmethod = function(){
                $rootScope.$emit('CallParentMethod', {});
            };
            
            for (var thing in $scope.choices){
                values.push($scope.choices[thing].value);
                counter.push($scope.choices[thing].count);
            }
            var data = {question:$scope.newQ, options:values, count: counter, username: localStorage.getItem('username')};
            console.log('data: '+ data.question);
            $http.post('/questions', data).success(function(response){
                console.log('response: '+ response);
            });
            
            $scope.newQ = '';
            $scope.choices = [{id:'choice1', count:0},{id:'choice2', count:0}];
            $scope.childmethod();
        }
        else{
            alert('Make sure all forms are filled out!');
        }
    };
}]);