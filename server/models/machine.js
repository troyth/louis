var Machine = require(__dirname + '/models').Machine;
var generatePassword = require('password-generator');

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
                return err;
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
  		return machine.id;
	});
}