
var url = require('url')
	, machine = require('../models/machine');

exports.index = function(req, res){
  res.render('index', { title: 'Express' });
};


exports.getMachine = function(req, res){
	machine.getMachines(res);
}

exports.getMachineById = function(req, res){
	console.log('getMachineById with _id: '+ req.params._id);
	machine.getMachineById(res, req.params._id);
}



exports.getImageLatest = function(req, res){
	machine.getImageLatest(res, req.params._id);
}