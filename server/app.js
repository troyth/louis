
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , dl  = require('delivery')
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

//list of deployed machines by name
var MACHINES = {
  "gsapp_1" : {
    "id": "0000001"
  }
};

//path to store image files
var IMAGE_FILEPATH = __dirname + '/public/images/';

//reporting frequency in ms - the higher the number, the less frequent updates can be sent from machines
var FREQ = 5000;

// Add a connect listener
io.sockets.on('connection', function(socket) { 

    console.log('Client connected.');

    socket.on('config', function(config) {
        console.log('\nINITIALIZING HANDSHAKE REQUEST');
        console.log('configuration sent:');
        console.dir(config);

        (function() {
          var config_name = config.name;

          //check if machine is 
          if(typeof config.name == 'string'){
            console.log('confirming handshake with machine ' + config_name );

            var machine_id = machine.exists(config_name);
            console.log('machine_id: '+ machine_id);
            //machine is already in database
            if(machine_id){
              //check password

              //machine exists, send back _id
              console.log('existing machine with _id:' + machine_id);
              socket.emit('confirm', {"id": machine_id, "freq": FREQ});
            }
            //machine is not yet in database
            else{
              var new_machine = machine.create(config_name);

              if(new_machine){
                console.log('new machine:');
                console.dir(new_machine);

                socket.emit('confirm', {"id": new_machine.id, "freq": FREQ});
              }else{
                console.log('error creating new machine');
              }

              
            }


            

            socket.on('report', function(data) {
              console.log('receiving report from: '+ data.id );
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

          }else{
            console.log('confirm error');
          }
        })();//end anonymous function
    });

        

    // Disconnect listener
    socket.on('disconnect', function() {
        console.log('Client disconnected.');
    });
});
