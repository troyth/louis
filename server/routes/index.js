
var url = require('url');

exports.index = function(req, res){
  res.render('index', { title: 'Express' });
};


exports.get = function(req, res){
	var url_parts = url.parse(req.url, true);
	var url_array = url_parts.pathname.split('/');//gets rid of the preceding empty string

	console.log('url_array: ');
	console.dir(url_array);

	console.log('url_parts: ');
	console.dir(url_parts);
}