
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , fs  = require('fs')
  , machine = require('./models/machine');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(require('less-middleware')({ src: __dirname + '/public' }));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);


//create server
var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


//set up socket.io to listen to server
var io = require('socket.io');
io = io.listen(server);


// Add a connect listener
io.sockets.on('connection', function(socket) { 

    console.log('Client connected.');

    socket.on('config', function(config) {
        console.log('\nINITIALIZING HANDSHAKE REQUEST');
        console.log('configuration sent:');
        console.dir(config);

        //check if machine is 
        if(typeof config.name == 'string'){
          console.log('confirming handshake with machine ' + config.name );

          //initialize machine
          machine.initialize( config.name, socket );

        }else{
          console.log('confirm error');
        }
    });

        

    // Disconnect listener
    socket.on('disconnect', function() {
        console.log('Client disconnected.');
    });
});
