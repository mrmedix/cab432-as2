var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');


/******* Message processing ******/
var azure = require('azure-storage');
var salient = require('salient');
var uuid = require('node-uuid');

var queueSvc = azure.createQueueService('as2', process.env.AZURE_STORAGE_KEY);
var tableSvc = azure.createTableService('as2', process.env.AZURE_STORAGE_KEY);
var entGen = azure.TableUtilities.entityGenerator;
var sentimentAnalyser = new salient.sentiment.BayesSentimentAnalyser();
/********* **********/

var routes = require('./routes/index');
var messages = require('./routes/messages');


var app = express();

// view engine setup
app.use('/public', express.static('public'));
app.use(express.static((__dirname, 'views')));


// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/', routes);
app.use('/messages', messages);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});


// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    next(err);
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  next(err);
});

/******* Message processing ******/

routes.get('/deleteTable', function (req, res) {
  tableSvc.deleteTableIfExists('sentiments', function(error) {
    if (!error) res.json();
    else res.json(error);
  });
});


// Gets a tweet from the Queue,
// does sentiment analysis on the status text,
// inserts result into the Table.
//
// Should this be refactored into smaller functions?
// Positively yes, but it works well enough for now!
function getAndInsertMessage() {
  queueSvc.getMessage('tweets', function (error, serverMessage) {
    if (!error && serverMessage != null) {
      var message;
      try {
        message = JSON.parse(serverMessage.messageText);
      } catch (ex) {
        console.log(ex);
      }

      queueSvc.deleteMessage('tweets', serverMessage.messageId, serverMessage.popReceipt, function (error) {
        if (error) {
          console.log(error.message);
          setImmediate(getAndInsertMessage);
        } else {
          if (message != null && message.tweet.text != null && message.tweet.lang === 'en') {
            tableSvc.createTableIfNotExists('sentiments', function (error) {
              if (!error) {
                // Retweeted statuses usually get truncated, so a quick check to see if there is an 'inner' tweet
                // should give more accurate sentiment scores.
                var statusText = message.tweet.hasOwnProperty('retweeted_status') ? message.tweet.retweeted_status.text : message.tweet.text;
                var score = sentimentAnalyser.classify(statusText);

                var entity = {
                  PartitionKey: entGen.String(message.searchString),
                  // Query results are sorted by PK and RK, combining timestamp and uuid to
                  // enable retrieving tweets in the right order and also avoid collisions when inserting into table
                  // from multiple servers.
                  RowKey: entGen.String(new Date().toJSON()+ '-' + uuid.v1()),
                  sentimentScore: entGen.Double(score),
                  statusText: statusText,
                  user: message.tweet.user.screen_name,
                  permalink: 'https://twitter.com/statuses/' + message.tweet.id_str
                };
                tableSvc.insertEntity('sentiments', entity, function (error) {
                  if (error) {
                    console.log(error.message);
                  }
                  setImmediate(getAndInsertMessage);
                });
              }
            });
          } else {
            setImmediate(getAndInsertMessage);
          }
        }
      });
    } else {
      setImmediate(getAndInsertMessage);
    }
  });
}
// Collect messages perpetually from the queue
getAndInsertMessage();

/********* End Message Processing **********/


module.exports = app;
