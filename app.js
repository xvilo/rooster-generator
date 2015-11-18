var express = require('express'),
		app = express(),
		server = require('http').createServer(app);

var bodyParser = require('body-parser'),
		ical = require('ical-generator'),
		cal = ical(),
		moment = require('moment'),
		request = require("request");

//Settings
settings = {
	port: 4000,
	api: 'https://xvilo.com/cibap/json.php',
	year: moment().format('YYYY'),
	week: moment().week(),
	triggerAlert: 600
}

timetable = {
	"0":{"start": {"hour": 8, "minute": 45}, "end": {"hour": 9, "minute": 15}},
	"1":{"start": {"hour": 9, "minute": 15}, "end": {"hour": 9, "minute": 45}},
	"2":{"start": {"hour": 9, "minute": 45}, "end": {"hour": 10, "minute": 15}},
	"3":{"start": {"hour": 10, "minute": 30}, "end": {"hour": 11, "minute": 00}},
	"4":{"start": {"hour": 11, "minute": 00}, "end": {"hour": 11, "minute": 30}},
	"5":{"start": {"hour": 11, "minute": 30}, "end": {"hour": 12, "minute": 00}},
	"6":{"start": {"hour": 12, "minute": 00}, "end": {"hour": 12, "minute": 30}},
	"7":{"start": {"hour": 12, "minute": 30}, "end": {"hour": 13, "minute": 00}},
	"8":{"start": {"hour": 13, "minute": 00}, "end": {"hour": 13, "minute": 30}},
	"9":{"start": {"hour": 13, "minute": 30}, "end": {"hour": 14, "minute": 00}},
	"10":{"start": {"hour": 14, "minute": 00}, "end": {"hour": 14, "minute": 30}},
	"11":{"start": {"hour": 14, "minute": 45}, "end": {"hour": 15, "minute": 15}},
	"12":{"start": {"hour": 15, "minute": 15}, "end": {"hour": 15, "minute": 45}},
	"13":{"start": {"hour": 15, "minute": 45}, "end": {"hour": 16, "minute": 15}},
	"14":{"start": {"hour": 16, "minute": 15}, "end": {"hour": 16, "minute": 45}},
	"15":{"start": {"hour": 16, "minute": 45}, "end": {"hour": 17, "minute": 15}},
	"16":{"start": {"hour": 16, "minute": 45}, "end": {"hour": 17, "minute": 15}}
};

//Core
cibap = {
	init: function() {
		app.use(bodyParser.json());

		app.all('*', function(req, res, next) {
		    res.header("Access-Control-Allow-Origin", "*");
  			res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, TokenId, userid");
  			next();
		});

		server.listen(settings.port);
		console.log('Server is running on port: '+settings.port);

		app.get('/:soort/:type', cibap.ical);
		var event = ical().createEvent();
	},
	ical: function(req, res, next) {
		console.log('generating schedule for '+req.params.type);
		cal.setDomain('cibaptothetop.nl').setName('Cibap: '+req.params.type);
		var host = settings.api+'?klas='+req.params.type+'&soort='+req.params.soort+'&week='+settings.week+'&jaar='+settings.year;

		process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
		request(host, function(error, response, body) {
			if(error || !body) {
				res.send(error);
				next();
				return console.log(error);
			}

			if (!/^[\],:{}\s]*$/.test(body.replace(/\\["\\\/bfnrtu]/g, '@').
			replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
			replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
				return res.send(false);
			}

			var body = JSON.parse(body);

			for (i = 0; i < 5; i++) {
				var day = i+1,
						old = '';
				if(!body[day]) {
					return;
				}

				body[day].forEach(function(houre, key){
					if(key == 15) {
						create(old, key);
					} else {
						if(old == '') {
							old = timetable[key].start;
						}

						if(houre[0] != body[day][key+1][0]) {
							create(old, key);
							old = '';
						}
					}

					function create(start, close) {
						var startLes = moment(start).weekday(day);
						var endLes = moment(timetable[close].end).weekday(day);
						if(houre[0]) {
							cal.addEvent({
							    start: startLes._d,
							    end: endLes._d,
							    summary: houre[0],
							    description: houre[2],
							    location: houre[1]
							});
						}
					}
				});

				if(i == 4) {
					var events = cal.events();

					events.forEach(function(event) {
						event.createAlarm({
						    type: 'audio',
						    trigger: settings.triggerAlert, // 5min before event
						});
					});

					cal.serve(res);
					cal.clear();
					next();
				}
			}
		});
	}
};

cibap.init();
