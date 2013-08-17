/////// SET UP DATABASE CONNECTION WITH MONGOOSE ///////
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/louis');
var Schema = mongoose.Schema;

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'models.js::Mongoose database connection error:'));
db.once('open', function callback () {
  console.log('models.js::opened louis db with mongoose');
});



var MachineSchema = new Schema({
  name:  String,
  password: String,
  location: {
    city: String,
    country: String,
    timezone: String,
    lon: String,
    lat: String
  },
  imports: Schema.Types.Mixed,
  exports: Schema.Types.Mixed,
  initialized: { type: Date, default: Date.now },
  last_login: { type: Date, default: Date.now }
}, { 
  autoIndex: false
});

var Machine = mongoose.model('machine', MachineSchema);
exports.Machine = Machine;


var PhotoSchema = new Schema({
  machine_id: String,
  import_name: String,
  type: String,
  previous: String,
  next: String,
  timestamp: String,
  series_timestamp: String,
  offset: String,
  count: String,
  encoding: String
}, { 
  autoIndex: false
});

var Photo = mongoose.model('photo', PhotoSchema);
exports.Photo = Photo;