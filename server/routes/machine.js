var Machine = require(__dirname + '/models').Machine;
var generatePassword = require('password-generator');

exports.create = function(name){
	var pw = generatePassword(12, false);

	var machine = new Machine({
        name: name,
        password: pw
    });

    machine
        .save(function(err){
            if(err){
                console.log('Error: attempted to save new machine with msg:'+ err);
            }else{  
                console.log('Success: created new machine with password: ' + pw );
            }
        });
}