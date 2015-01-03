var mongoose = require('mongoose');
var service = require("soa-example-core-service");
var config = require("soa-example-service-config").config();

var invalidAuthAttemptController = require('./controllers/InvalidAuthAttemptController');

mongoose.connect(config.mongoUri);

var app = service.createApiServer(config.bannedIpServicePort);

app.post('/invalid', invalidAuthAttemptController.invalidAuthAttempt);