var express = require('express');
var router = express.Router();
var http = require('http');
var twitter = require('twitter');

router.get('/', function (req, res) {
   res.sendfile('views.html');
});

router.get('/getTrending', function (req, res) {
    var twClient = new twitter({
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
        access_token_key: process.env.TWITTER_ACCESS_KEY,
        access_token_secret: process.env.TWITTER_ACCESS_SECRET
    });

    // Get United States trending topics (WOEID 23424977)
    twClient.get('trends/place.json', {id: "23424977"}, function (error, trends, response) {
        res.json(trends);
    });
});


router.get('/start/:searchString', function (req, res) {
    var producerOptions  = {
        hostname: '104.210.108.19',
        port: 3000,
        path: '/' + encodeURIComponent(req.params.searchString),
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    };
    http.get(producerOptions, function (producerRes) {
        var body = [];
        producerRes.on('data', function (chunk) {
            body.push(chunk);
        });

        producerRes.on('end', function () {
            body = body.join();
            //res.render('index');
            res.json(body);
        });
    });
});

// Sends an invalid filter to the producer, effectively stopping the stream
router.get('/stop/', function (req, res) {
    var producerOptions = {
        hostname: '104.210.108.19',
        port: 3000,
        path: '/%20',
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    };
    http.get(producerOptions, function (producerRes) {
        var body = [];
        producerRes.on('data', function (chunk) {
            body.push(chunk);
        });

        producerRes.on('end', function () {
            body = body.join();
            //res.render('index');
            res.json(body);
        });


    });
});

// Endpoint to send a ping response to the load balancer
router.get('/probe', function (req, res) {
    res.json();
});

module.exports = router;
