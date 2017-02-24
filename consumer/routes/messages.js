var express = require('express');
var router = express.Router();
var azure = require('azure-storage');

var tableSvc = azure.createTableService('as2', process.env.AZURE_STORAGE_KEY);
var entries;

router.get('/:searchString', function (req, res) {
    var searchString = req.params.searchString;

    entries = [];

    var sentimentsQuery = new azure.TableQuery().where('PartitionKey eq ?', searchString);
    getEntries(sentimentsQuery, null, function (error) {
        if (!error) {
            res.json({count: entries.length, entries: entries});
        } else {
            res.json(error);
        }
    });
});

// Send only messages not yet received by the client
router.get('/:searchString/:lastSeen', function (req, res) {
    var searchString = req.params.searchString;
    var lastSeen = req.params.lastSeen;
    entries = [];
    var lastSeenQuery = new azure.TableQuery().where('PartitionKey eq ? and RowKey > ?', searchString, lastSeen);
    getEntries(lastSeenQuery, null, function (error) {
        if (!error) {
            res.json({count: entries.length, entries: entries});
        } else {
            res.json(error);
        }
    });
});

// Max entries returned in one query is 1000, so we need to check if there are more entries
// and append those to the Entries result object before sending it to the client.
// https://azure.microsoft.com/en-us/documentation/articles/storage-nodejs-how-to-use-table-storage/
// https://github.com/Azure/azure-storage-node/blob/master/examples/samples/continuationsample.js
function getEntries(query, continuationToken, callback) {
    tableSvc.queryEntities('sentiments', query, continuationToken, function (error, result) {
        if (!error) {
            entries.push.apply(entries, result.entries);
            var token = result.continuationToken;
            if (token) {
                getEntries(query, token, callback);
            } else {
                callback();
            }
        } else {
            callback(error);
        }
    });
}

module.exports = router;