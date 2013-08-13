
var url = require('url')
	, machine = require('../models/machine');

exports.index = function(req, res){
  res.render('index', { title: 'Express' });
};


exports.get = function(req, res){
	var url_parts = url.parse(req.url, true);
	var url_array = url_parts.pathname.split('/');//gets rid of the preceding empty string

	console.log('url_array: ');
	console.dir(url_array);

	switch(url_array[1]){
		case 'v1':
			switch(url_array[2]){
				case 'machine':
					if(url_array[3]){
						case 
					}

					machine.getMachines(res);
					break;
			}
			break;
		default:
			res.send(404, "please specify an API version number");
			break;
	}
}

exports.getMachine = function(req, res){
	machine.getMachines(res);
}

exports.getMachineById = function(req, res){
	console.log('getMachineById with _id: '+ req.params._id);
}