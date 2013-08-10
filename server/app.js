
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , dl  = require('delivery')
  fs  = require('fs');

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

var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

var IMAGE_FILEPATH = __dirname + '/public/images/';

// Load requirements
var io = require('socket.io');

io = io.listen(server);

//list of deployed machines by name
var MACHINES = [
  "gsapp_1"
];

//reporting frequency in ms - the higher the number, the less frequent updates can be sent from machines
var FREQ = 5000;

// Add a connect listener
io.sockets.on('connection', function(socket) { 

    console.log('Client connected.');

    socket.on('config', function(config) {
        console.log('config:');
        console.dir(config);

        //check if machine is 
        if(typeof config.name == 'string' && MACHINES.indexOf(config.name) > -1){
          console.log('about to confirm');
          socket.emit('confirm', {"id": "1111111", "freq": FREQ});

          socket.on('report', function(data) {
            console.log('reporting!');
            console.dir(data);
            console.dir(data.imports[0]);
            console.dir(data.imports[1]);

          });

        }else{
          console.log('confirm error');
        }
    });

    //set up file transfer listener through Delivery.js
    console.log("\n\n\nINITIALIZE DELIVERY")
    var delivery = dl.listen(socket);

    delivery.on('receive.success',function(file){

      console.log('received file from Delivery.js');

      fs.writeFile( IMAGE_FILEPATH+file.name, file.buffer, function(err){
        if(err){
          console.log('File could not be saved.');
        }else{
          console.log('File saved.');
        };
      });
    });

    // Disconnect listener
    socket.on('disconnect', function() {
        console.log('Client disconnected.');
    });
});
