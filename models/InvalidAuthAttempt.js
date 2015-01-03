var mongoose = require('mongoose');

var InvalidAuthAttemptSchema = new mongoose.Schema({
	type: String,
    ipAddress : String,
    username: String,
    password: String,
    accessToken: String,
	created: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InvalidAuthAttempt', InvalidAuthAttemptSchema);