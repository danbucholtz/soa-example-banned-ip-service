var Q = require("q");

var schedule = require('node-schedule');
var redisUtil = require('soa-example-redis-util');

var InvalidAuthAttempt = require("../models/InvalidAuthAttempt");

var bannedIpService = require("soa-example-banned-ip-service-api");

var NUM_FAILED_ATTEMPTS_PER_TWENTYFOUR_HOURS = 5;

schedule.scheduleJob("* * * * *", function() {
	getInvalidAuthAttempts();
});

var invalidAuthAttempt = function(req, res){

	var type = req.body.type;
	var ipAddress = req.body.ipAddress;
	var username = req.body.username;
	var password = req.body.password;
	var accessToken = req.body.accessToken;

	// TODO - factor in white list

	if ( type && ipAddress && ((username && password) || accessToken) ){
		invalidAuthAttemptInternal(type, ipAddress, username, password, accessToken).then(function(entity){
			res.send({success:(entity != null)});
		});
	}
	else{
		res.send({success:false, errorMessage:"The following fields are required:  Type, IP Address, and Username/Password or Access Token"});
	}
	
};

var invalidAuthAttemptInternal = function(type, ipAddress, username, password, accessToken){
	var deferred = Q.defer();

	var invalidAuthAttempt = new InvalidAuthAttempt();
	invalidAuthAttempt.type = type;
	invalidAuthAttempt.ipAddress = ipAddress;
	invalidAuthAttempt.username = username;
	invalidAuthAttempt.password = password;
	invalidAuthAttempt.accessToken = accessToken;
	invalidAuthAttempt.created = new Date();

	invalidAuthAttempt.save(function(err, entity){
		deferred.resolve(entity);
	});

	return deferred.promise;
};

var updateActiveBanList = function(){
	getInvalidAuthAttempts().then(function(bannedHosts){
		// store the list of banned hosts in redis
		var bannedHostJson = JSON.stringify(bannedHosts);
		redisUtil.put("banned", bannedHostJson);
	});
};

var getInvalidAuthAttempts = function(){
	var deferred = Q.defer();

	var yesterday = getYesterday();

	var criteria = [
		{
			$match: {
				created:{
					$gte: yesterday
				}
			}
		},
		{
			$group: {
				_id: "$ipAddress",
				attempts: {$sum: 1}
			}
		}
	];

	InvalidAuthAttempt.aggregate(criteria, function(err, results){
		if ( err ){
			console.log(err.toString());
		}
		else{
			var toReturn = new Array();
			for ( var i = 0; i < results.length; i++ ){
				var result = results[i];
				if ( result.attempts >= NUM_FAILED_ATTEMPTS_PER_TWENTYFOUR_HOURS ){
					
					var object = {
						host: result._id,
						attempts: result.attempts
					};

					toReturn.push(object);
				}
			}

			deferred.resolve(toReturn);
		}
	});

	return deferred.promise;
};

var getYesterday = function(){
	var date = new Date();

	var OneDayOfMillis = 24 * 60 * 60 * 1000; // hours * minutes * seconds * milliseconds

	var oneDayAgoInMillis = date.getTime() - OneDayOfMillis;

	date.setTime(oneDayAgoInMillis);

	return date;
};

module.exports = {
	invalidAuthAttempt: invalidAuthAttempt
}