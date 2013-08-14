/**
 * Created with JetBrains WebStorm.
 * User: dave
 * Date: 6/08/13
 * Time: 10:27 AM
 * To change this template use File | Settings | File Templates.
 */

var app = angular.module('bomApp', []);

/*
app.config(function($routeProvider) {
    $routeProvider.when('/stats', {
        templateUrl:"/stats"
    });
    $routeProvider.when('/chart/:statType', {
        templateUrl:"/chart/bob",
        controller: "GetStats"
    });
});
*/

/**
 * Service: MenuTab
 * handles making the current menu tab .active - could certainly be done better
 */
app.factory('MenuTab', function() {

    return { tab: "BUCKLEY",
             is: function(tab) {
                 if(this.tab == tab) return {active: true};
             },
             change: function(tab) {
                 if(this.tab != tab) this.tab = tab;
             }
    };

});

/**
 * Directive: delta
 * works similarly to, but as an alternative to ng-change, and only causes a change in scope once the control (presumably an <input type='range'/>) is 'released'
 * n.b. works for mouse and for touch
 */
app.directive('delta', function() {
    return {
        restrict: 'A',
//        template: "<span>&nbsp;{{period/10}} hrs.</span>",  //doesn't work as it is inside the <input></input>
        link: function(scope, element, attr) {
            element.bind("mousedown touchstart", function () {
                element.deltaTemp = element.val();
                scope.deltaShow=true;
                scope.$apply(scope.deltaShow);
            });
            element.bind("mouseup touchend", function () {
                if(element.val() != element.deltaTemp) {
                    scope.$apply(attr.delta);
                }
                scope.deltaShow=false;
                scope.$apply(scope.deltaShow);
            });
        }
    }
})

/**
 * Directive: pause
 * cancels timeout events that are automatically changing an input (presumably an <input type='range'/>) while it is 'pressed' until it is 'released'
 * n.b. works for mouse and for touch
 * TODO: needs some reworking to be more general - maybe the timer promises should be attached to the element not the scope
 */
app.directive('pause', function($timeout) {
    return {
        restrict: 'A',
        link: function(scope, element, attr) {
            element.bind("mousedown touchstart", function () {
                $timeout.cancel(scope.prom);
            });
            element.bind("mouseup touchend", function () {
                scope.prom = $timeout(scope.timerDo, 2000);
            });
        }
    }
})

app.controller('Menu', function ($scope, $route, MenuTab) {

    $scope.menu = MenuTab;

});

app.controller('GetStats', function ($scope, $http, MenuTab) {

        $scope.menu = MenuTab;

        var plotdata = [];
        $scope.stats = [];
        $scope.period = 80;

        $scope.update = function() {

            //TODO: {{statType}} is kind of redundant as it just mirrors {{tab}}, needs to be refactored out?

            switch($scope.statType) { // var:statType initialised before this script is included
                case "temp":
                    $scope.sym = "&deg;C";
                    break;
                case "press":
                    $scope.sym = "&nbsp;hPa";
                    break;
                case "rain":
                    $scope.sym = "&nbsp;mm";
                    break;
                case "hum":
                    $scope.sym = "%";
                    break;
            };

            plotdata = [];
            $scope.stats = [];

            for(var stn=0; stn < $scope.stations.length; stn++) { // var:stations initialised before this script is included

                $http.get("/data/"+$scope.stations[stn]+"/"+$scope.statType+"/"+$scope.period).success(function(result) {

                    plotdata.push(result);

                    if(result.data[0].length == 0) return;

                    var stat = new Object();
                    stat.station = result.label;
                    stat.last = result.data[result.data.length-1][1];
                    stat.min = Math.min.apply(null, result.data.map(function(e) { return e[1]; }));
                    stat.max = Math.max.apply(null, result.data.map(function(e) { return e[1]; }));

                    stat.sum = result.data.map(function(e) { return e[1]; }).reduce(function (a,b) { return a + b; });
                    stat.avg = Math.round(stat.sum/result.data.length*10)/10; //round to 1 d.p.

                    $scope.stats.push(stat);

                    $.plot($("#chart"), plotdata, { // existing div#chart for flot chart
                        colors: ["red", "green", "blue"],
                        xaxis: { mode: "time", timezone: "browser", timeformat: "%a %H:%M" },
                        yaxis: { },
                        shadowSize: 4,
                        legend: { show: true, position: "nw" },
                        lines: { show: true },
                        points: { show: false }
                    });
                });
            }
        };

        $scope.$watch('menu.tab', function(val) {
            $scope.statType = val;
            $scope.update();
        });

});

app.controller('RadarImage', function ($scope, $http, $timeout, MenuTab) {

    $scope.menu = MenuTab;
    $scope.images = [];
    $scope.range = 'IDR713';
    $scope.span = 20;
    $scope.view = [];
    $scope.stamp = [];

    $scope.back = true;  //TODO: why did these break when I put it under $scope.vis...?
    $scope.topo = true;
    $scope.water = true;
    $scope.rail = false;
    $scope.loc = true;
    $scope.SH = true;

    $scope.speed = 125;


    $scope.timerDo = function() {

        $scope.view.unshift(false);
        last = $scope.view.pop();
        $scope.view[0] = last;
        if(last) {
            $scope.slide = 0;
        } else {
            $scope.slide++;
        }

        if($scope.view[$scope.view.length-1] == true) {
            $scope.prom = $timeout($scope.timerDo, 2000);
        } else {
            $scope.prom = $timeout($scope.timerDo, $scope.speed);
        }
    }

    $scope.refresh = function() {

        if($scope.prom) $timeout.cancel($scope.prom);

        $scope.images = [];
        $scope.view = [];
        $scope.stamp = [];

        $http.get("/imgList/"+$scope.range+"/"+$scope.span).success(function(result) {

            //console.log(result);

            for(var i=0; i<result.length; i++) {
                $scope.view.push(false);

                res = result[i].toString();

                year = parseInt(res.slice(0,4));
                month = parseInt(res.slice(4,6));
                day = parseInt(res.slice(6,8));
                hour = parseInt(res.slice(8,10));
                min = parseInt(res.slice(10,12));

                utcDate = new Date(0);
                utcDate.setUTCFullYear(year);
                utcDate.setUTCMonth(month);
                utcDate.setUTCDate(day);
                utcDate.setUTCHours(hour);
                utcDate.setUTCMinutes(min);

                $scope.stamp.push(utcDate);
                $scope.images.push("/img/"+$scope.range+"/"+result[i]);
            }

            $scope.slide = $scope.view.length - 1;
            $scope.view[$scope.slide] = true;

            $scope.prom = $timeout($scope.timerDo, 2000);

        })
    }

    $scope.update = function() {

        for(var i=0; i<$scope.view.length; i++) {
            $scope.view[i] = false;
        }
        $scope.view[$scope.slide] = true;

    }

    $scope.refresh();

});