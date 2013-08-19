var Machine = require(__dirname + '/models').Machine
    , Photo = require(__dirname + '/models').Photo
    , generatePassword = require('password-generator')
    , dl = require('delivery-wks')
    , fs = require('fs');



//path to store image files
var PHOTO_FILEPATH = __dirname + '/../public/photos/';
var PHOTO_URLPATH = '/photos/';

//token used to tokenize strings, such as filenames. Provided by machine at handshake
var STRING_TOKEN = null;
var FILE_PATTERN = null;

//reporting frequency in ms - the higher the number, the less frequent updates can be sent from machines
var FREQ = 60000;

var PHOTO_ENCODINGS = ['jpg', 'gif', 'png', 'bmp'];
var VIDEO_ENCODINGS = ['mp4', 'h264'];

//a shift register to only allow for DELIVERY_CACHE_MAX filenames to check for duplicates with recent deliveries
var DELIVERY_CACHE = [];
var DELIVERY_CACHE_MAX = 500;


function parseFileName( filename, filepath ){
    if(STRING_TOKEN == null) return false;
    if(FILE_PATTERN == null) return false;

    var file_array = filename.split( STRING_TOKEN );
    var file = {};

    file.name = filename;
    file.path = PHOTO_FILEPATH;

    file.import_name = file_array[FILE_PATTERN.import_name];
    file.type = file_array[FILE_PATTERN.type];
    
    if(file.type == 'timelapse'){
        file.series_timestamp = file_array[FILE_PATTERN.timestamp];
        file.offset = file_array[FILE_PATTERN.offset];
        file.count = parseInt( file_array[FILE_PATTERN.count] );
        file.timestamp = parseInt(file.series_timestamp) + ( parseInt(file.offset) * file.count );
    }else{
        file.timestamp = file_array[FILE_PATTERN.timestamp];
        file.series_timestamp = null;
        file.offset = null;
        file.count = null;
    }

    file.encoding = file_array[FILE_PATTERN.encoding].substr(1);

    file.url = PHOTO_URLPATH + filename;
    
    return file;
}


//init delivery.js for file transfer from machines
function initDelivery( _id, socket ){
    //set up file transfer listener through Delivery.js
    console.log("\n\n\nINITIALIZE DELIVERY");
    var delivery = dl.listen(socket);

    //listener for new file recieved
    delivery.on('receive.success',function(file){

        console.log('\n***\nreceived file from machine with _id: ' + _id + 'with filename:\n'+ file.name + '\n\n');

        //check for duplicates within the last DELIVERY_CACHE_MAX deliveries
        if(DELIVERY_CACHE.indexOf( file.name ) >= 0){
            console.log('duplicate file delivery attempt');
            if(DELIVERY_CACHE.length >= DELIVERY_CACHE_MAX){
                DELIVERY_CACHE.shift();
            }
            DELIVERY_CACHE.push( file.name );
            return false;
        }else{
            if(DELIVERY_CACHE.length >= DELIVERY_CACHE_MAX){
                DELIVERY_CACHE.shift();
            }
            DELIVERY_CACHE.push( file.name );
        }

        var file_object = parseFileName(file.name);

        if(PHOTO_ENCODINGS.indexOf( file_object.encoding.toLowerCase() ) >= 0 ){
            //save file locally
            fs.writeFile( PHOTO_FILEPATH + file.name, file.buffer, function(err){
                if(err){
                  console.log('File could not be saved, NOT writing to db');
                }else{
                    console.log('File saved, now writing to db');
                    console.log('\n*******FILE URL: '+ file_object.url);

                    var new_photo = new Photo({
                        machine_id: _id,
                        import_name: file_object.import_name,
                        filename: file.name,
                        filepath: PHOTO_FILEPATH,
                        url: file_object.url,
                        type: file_object.type,
                        timestamp: file_object.timestamp,
                        series_timestamp: file_object.series_timestamp,
                        offset: file_object.offset,
                        count: file_object.count,
                        encoding: file_object.encoding
                    });

                    new_photo
                        .save(function(err, ph){
                            if(err){
                                console.log('Error: attempted to save new photo with msg:'+ err);
                                return false;
                            }else{  
                                console.log('Success: created new photo with _id: ' + ph._id);
                            }
                        });
                }//end if/else err
            });//end fs.writeFile()

        }//end if photo
    });//end delivery.on    
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

    Photo
        .find()
        .sort({timestamp: -1})
        .limit(1)
        .exec(function(err, items){
            res.header("Access-Control-Allow-Origin", "*");
            res.send(200, items);
        });

}


/*-----  End of API  ------*/

