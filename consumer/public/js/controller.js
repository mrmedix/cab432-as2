
angular
    .module('Twitter-Sentiment', ["highcharts-ng"])
    .controller("mainController", MainController)
    .directive('repeatTwitterCall', function() {
        return function (scope) {
            if(scope.$last) {
                scope.$emit('RepeaterElement', scope.data.sentimentScore._);
            }
        }
    });


MainController.$inject = ["$scope", "$http", '$window'];


function MainController($scope, $http, $window) {
    $scope.formData = {};

    $scope.loadTrending = function() {
         $http.get('/getTrending')
            .then(function (resp) {
                 console.log(resp);
                $scope.content = resp.data[0].trends;
            }, function (error) {
                console.log(error);
            });
    };

    $scope.searchTwitter = function() {
        var searchTerm = $window.twitterHashtag.value;
        $http.get('/start/'+ searchTerm)
            .then(function (resp) {
                console.log("Start of stream");
                console.log(resp);


                $http.get('/messages/'+ searchTerm + '/' + new Date().toJSON())
                    .then(function (resp) {
                        console.log("Start of messages");
                        console.log(resp);

                        var seriesArray = $scope.chartConfig.series[0].data;
                        for(var i = 0; i < resp.data.entries.length; i++){
                            if (seriesArray.length >= 1000) {
                                seriesArray.splice(0,1);
                            }
                            var d = new Date(resp.data.entries[i].RowKey._.substr(0,24));
                            var date = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDay(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
                            seriesArray.push([date,resp.data.entries[i].sentimentScore._]);
                        }

                        $scope.tweet = resp.data.entries;

                        $scope.update(new Date().toJSON());

                    }, function (error) {
                        console.log(error);
                    });
            }, function (error) {
                console.log(error);
            });
    };


    $scope.stopSearch = function() {
        $http.get('/stop')
            .then(function (resp) {
                console.log("End of stream");
                console.log(resp);

            }, function (error) {
                console.log(error);
            });
    };



    $scope.update = function(lastSeen){


        console.log(lastSeen);
        var searchTerm = $window.twitterHashtag.value;

        console.log('In the watch element');
        console.log(lastSeen);
        console.log($scope.$last);

        $http.get('/messages/' + searchTerm + '/' + lastSeen.toString())
            .then(function (resp) {
                console.log('Getting latest messages');
                var seriesArray = $scope.chartConfig.series[0].data;
                for(var i = 0; i < resp.data.entries.length; i++){
                    if (seriesArray.length >= 1000) {
                        seriesArray.splice(0,1);
                    }
                    var d = new Date(resp.data.entries[i].RowKey._.substr(0,24));
                    var date = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDay(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
                    seriesArray.push([date,resp.data.entries[i].sentimentScore._]);
                }
                $scope.tweet.push.apply($scope.tweet, resp.data.entries);

                if(resp.data.entries.length > 0){
                    lastSeen = resp.data.entries[resp.data.entries.length-1].RowKey._;
                }


                setTimeout(function () {
                    $scope.update(lastSeen)
                }, 2000);

            }, function (error) {
                console.log(error);
            });

    };
/*
    $scope.$on('RepeaterElement', function(data){
        var seriesArray = $scope.chartConfig.series[0].data;

        for(var i = 0; i < data.currentScope.tweet.length; i++){
            var date = data.currentScope.tweet[i].Timestamp._.substr(6);
            seriesArray.push([date,data.currentScope.tweet[i].sentimentScore._]);
        }

    });*/


    $scope.chartConfig = {
        options: {
            chart: {
                type: 'line'
            }
        },
        series: [{
            data: []
        }],
        title: {
            text: 'Sentiment Analysis '
        },
        xAxis: {
            type: 'datetime',
            title: {
                text: 'Date'
            }
        },
        yAxis: {
            currentMin: -10,
            currentMax: 10,
            title: {text: 'Sentiment'}
        },
        loading: false
    };

}

