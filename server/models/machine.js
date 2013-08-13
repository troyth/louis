var Machine = require(__dirname + '/models').Machine
    , generatePassword = require('password-generator')
    , dl = require('delivery-wks')
    , fs = require('fs');



//path to store image files
var IMAGE_FILEPATH = __dirname + '/../public/images/';

//token used to tokenize strings, such as filenames. Provided by machine at handshake
var STRING_TOKEN = null;
var FILE_PATTERN = null;

//reporting frequency in ms - the higher the number, the less frequent updates can be sent from machines
var FREQ = 5000;


function parseFileName( filename, filepath ){
    if(STRING_TOKEN == null) return false;
    if(FILE_PATTERN == null) return false;

    var file_array = filename.split( STRING_TOKEN );
    var file = {};

    console.log('\n\n----------------------------');
    console.log('file_array: ');
    console.dir(file_array);
    console.log('FILE_PATTERN.encoding: '+ FILE_PATTERN.encoding);
    console.log('----------------------------\n\n');

    file.name = filename;
    file.path = IMAGE_FILEPATH;

    file.import_name = file_array[FILE_PATTERN.import_name];
    file.type = file_array[FILE_PATTERN.type];
    file.timestamp = file_array[FILE_PATTERN.timestamp];
    file.offset = file_array[FILE_PATTERN.offset];
    file.count = file_array[FILE_PATTERN.count];
    file.encoding = file_array[FILE_PATTERN.encoding].substr(1);
    
    return file;
}


//init delivery.js for file transfer from machines
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
                //parse filename into object of file attributes
                var file_object = parseFileName(file.name);

                console.log('\n\n----------------------------');
                console.log('file_object:');
                console.dir(file_object);
                console.log('mach:');
                console.dir(mach);
                

                //add object of file attributes to images array
                mach.images.addToSet( file_object );

                console.log('mach.images AFTER:');
                console.dir(mach.images);
                console.log('----------------------------\n\n');

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

exports.initialize = function( config, socket ){

    STRING_TOKEN = config.token;
    FILE_PATTERN = config.file_pattern;

    Machine
        .findOne({ 'name': config.name })
        .exec(function(err, existing_machine){
            
            if (err) {
                console.log('Error: attempting to query machine from database with name: ' + config.name);
                return false;
            }else{
                console.log('existing_machine: '+ existing_machine);
                //machine is not yet in database
                if(existing_machine == null){
                    //create machine
                    var pw = generatePassword(12, false);

                    var new_machine = new Machine({
                        name: config.name,
                        password: pw,
                        imports: config.imports,
                        exports: config.exports
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
                                socket.emit('confirm.success', {"id": mach.id, "freq": FREQ, "password": pw});
                            }
                        });
                }
                //machine is already in database
                else{
                    console.log('existing machine with _id:' + existing_machine.id);
                    if(existing_machine.password !== config.password){
                        console.log('Error: password mismatch');
                        console.log('Machine sent ' + config.password + ', database pw is ' + existing_machine.password);

                        socket.emit('confirm.error', 'password');
                        return false;
                    }
                    console.log('Password match successful');

                    initDelivery( existing_machine.id, socket );

                    //send confirmation to existing machine with the database _id
                    socket.emit('confirm.success', {"id": existing_machine.id, "freq": FREQ});
                }
                        
            }
        });

    socket.on('report', function(data) {
      console.log('receiving report from: '+ data.id );
    });

    return true;
}



/*===========================
=            API            =
===========================*/

/**
*
* getMachines
*
* Returns the list of available connected machines and their imports and exports
*
**/
exports.getMachines = function(res){

    Machine
        .find().exec(function(err, machines){
            if(err) res.send(500, err);

            //remove unnecessary and sensitive properties (eg. password)
            var list = [];

            machines.forEach(function(m){
                list.push({
                    _id: m._id,
                    name: m.name,
                    location: {
                        country: m.country,
                        city: m.city,
                        timezone: m.timezone,
                        lon: m.lon,
                        lat: m.lat
                    },
                    imports: m.imports,
                    exports: m.exports
                });
            });

            res.send(200, list);
        })
}

/**
*
* getMachineById
*
**/
exports.getMachineById = function(res, _id){

    Machine
        .findById(_id, function(err, m){
            if(err) res.send(500, "error getting machine by id: " + err);

            var return_m = {
                _id: m._id,
                name: m.name,
                location: {
                    country: m.country,
                    city: m.city,
                    timezone: m.timezone,
                    lon: m.lon,
                    lat: m.lat
                },
                imports: m.imports,
                exports: m.exports
            }

            res.send(200, return_m);
        });
}

/**
*
* getImageLatest
*
**/
exports.getImageLatest = function(res, _id){
    Machine
        .findById(_id, function(err, m){

            for(var i in m.imports){
                var imp = m.imports[i];
                console.log('imp: ');
                console.dir(imp);
                console.log('imp.type: '+ imp.type);
                console.log('\n\n')
                if(imp.type == "timelapse" || imp.type == "photo"){

                    res.send(200, imp.name);
                }
            }
        });
}


/*-----  End of API  ------*/

