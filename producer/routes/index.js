var express = require('express');
var router = express.Router();
var twitter = require('twitter');
var azure = require('azure-storage');

var twClient = new twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_SECRET
});

var streaming = false;

/* GET home page. */
router.get('/:searchString/', function (req, res) {
    if (streaming === true) {
        console.log('destroying stream');
        globalStream.destroy();
    }

    var queueName = 'tweets';

    var queueSvc = azure.createQueueService('as2', process.env.AZURE_STORAGE_KEY);
    queueSvc.createQueueIfNotExists(queueName, function (error) {
        if (error) {
            console.log(error.message);
        } else {


            console.log('starting stream... ');

            globalStream = twClient.stream('statuses/filter', {track: req.params.searchString});
            // Send success message to client
            res.json({response: 'started twitter stream'});

            streaming = true;

            globalStream.on('data', function (tweet) {

                var message;
                try {
                    message = JSON.stringify({
                        searchString: req.params.searchString,
                        tweet: tweet
                    });
                } catch (ex) { console.log(ex);/*Fail silently and continue on, the consumer should handle null messages gracefully*/}
                //console.log(tweet.id);
                queueSvc.createMessage(queueName, message, function (error) {
                    if (error) {
                        console.log(error.message);
                    }
                });
            });

            globalStream.on('error', function (error) {
                console.log('============ STREAM ERROR =============');
                console.log(error);
                console.log('============ STREAM ERROR =============');

            });
        }
    });
});

module.exports = router;