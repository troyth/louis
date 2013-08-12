var Machine = require(__dirname + '/models').Machine
    , generatePassword = require('password-generator')
    , dl = require('delivery')
    , fs = require('fs');



//path to store image files
var IMAGE_FILEPATH = __dirname + '/public/images/';

//reporting frequency in ms - the higher the number, the less frequent updates can be sent from machines
var FREQ = 5000;



exports.create = function(name){
    var pw = generatePassword(12, false);

    var machine = new Machine({
        name: name,
        password: pw
    });

    machine
        .save(function(err, mach){
            if(err){
                console.log('Error: attempted to save new machine with msg:'+ err);
                return null;
            }else{  
                console.log('Success: created new machine with password: ' + pw );
                return { "id": mach.id, "password": pw }
            }
        });
}

//check if machine exists by name
//return null or the id
exports.exists = function(name){
    Machine.findOne({ 'name': name }, function (err, machine) {
        if (err) return null;

        console.log('checking if machine exists, machine: '+ machine);
        return machine.id;
    });
}


function initDelivery( _id, socket ){
    //set up file transfer listener through Delivery.js
    console.log("\n\n\nINITIALIZE DELIVERY");
    var delivery = dl.listen(socket);

    //listener for new file recieved
    delivery.on('receive.success',function(file){

      console.log('received file from machine with _id: ' + _id);

      //save file locally
      fs.writeFile( IMAGE_FILEPATH + file.name, file.buffer, function(err){
        if(err){
          console.log('File could not be saved, NOT writing to db');
        }else{
          console.log('File saved, now writing to db');

          Machine
            .findById(_id, function(err, mach){

                mach.images.addToSet( IMAGE_FILEPATH + file.name );

                mach.save(function(err){
                    if(err){
                        console.log('error: machine.js::initDelivery() attempting to update machine with new file through delivery.js: '+ err);
                    }else{
                        console.log('Success: updated machine with new file through delivery.js');
                    }
                });
            });
        }
      });
    });
}

exports.initialize = function( name, socket ){

    var machine_id;

    Machine
        .findOne({ 'name': name })
        .exec(function(err, machine){
            //machine is not yet in database
            if (err) {
                //create machine
                var pw = generatePassword(12, false);

                var new_machine = new Machine({
                    name: name,
                    password: pw
                });

                new_machine
                    .save(function(err, mach){
                        if(err){
                            console.log('Error: attempted to save new machine with msg:'+ err);
                            return false;
                        }else{  
                            console.log('Success: created new machine with password: ' + pw );
                            initDelivery( mach.id, socket );

                            //send confirmation to machine with _id and new password
                            socket.emit('confirm', {"id": _id, "freq": FREQ, "password": pw});
                        }
                    });

            }
            //machine is already in database
            else{
                console.log('existing machine with _id:' + machine.id);
                //TODO: check password

                initDelivery( machine.id, socket );

                //send confirmation to machine with _id
                socket.emit('confirm', {"id": machine.id, "freq": FREQ});
            }
        });

    socket.on('report', function(data) {
      console.log('receiving report from: '+ data.id );
    });

    return true;
}