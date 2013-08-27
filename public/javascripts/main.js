/**
 * Created with JetBrains WebStorm.
 * User: dave
 * Date: 6/08/13
 * Time: 10:27 AM
 * To change this template use File | Settings | File Templates.
 */

var app = angular.module('bomApp', ['btford.socket-io']);


app.config(function($routeProvider, $locationProvider) {

    $routeProvider.when('/', {
        templateUrl: "hello.html",
        controller: function(MenuTab) { MenuTab.change('');}
    });
    $routeProvider.when('/jobs', {
        templateUrl:"/Jobs",
        controller: "JobStats"
    });
    $routeProvider.when('/chart/:statType', {
        templateUrl:"/Chart",
        controller: "GetStats"
    });
    $routeProvider.when('/radar', {
        templateUrl:"/Radar",
        controller: "RadarImage"
    });
    $routeProvider.when('/pm', {
        templateUrl:"pm.html",
        controller: "ProcessMonitor"
    });
    $routeProvider.otherwise({redirectTo: '/'});
//    $locationProvider.html5Mode(true);
});


//app.run(function($route){})


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

app.filter('stamp2date', function() {
    return function(stamp) {

        if(stamp) {
            var res = stamp.toString();
            var utcDate = new Date(0);

            utcDate.setUTCFullYear(parseInt(res.slice(0,4)));
            utcDate.setUTCMonth(parseInt(res.slice(4,6)) - 1);
            utcDate.setUTCDate(parseInt(res.slice(6,8)));
            utcDate.setUTCHours(parseInt(res.slice(8,10)));
            utcDate.setUTCMinutes(parseInt(res.slice(10,12)));

            return utcDate;
        }
    }
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

            scope.$watch(attr['ngModel'], function(newVal, oldVal) {
                scope[attr['bind']][oldVal] = false;
                scope[attr['bind']][newVal] = true;

            });
        }
    }
});

app.directive('countdown', function($timeout) {
    return {
        restrict: 'A',
        scope: {
            ngModel: '=',
            zerotrigger: '&'
        },
        template: '{{ngModel}}',
        link: function(scope, element, attr) {

            var prom = null;

            var countdown = function () {

                if(scope.ngModel == 0) {
                    scope.zerotrigger();
                } else {
                    scope.ngModel--;
                    scope.$apply();
                    prom = $timeout(countdown, 1000);
                }
            };

            element.on('$destroy', function() {
                $timeout.cancel(prom);
            });

            prom = $timeout(countdown, 1000);

        }
    }
});

app.directive('chart', function() {
    return {
        restrict: 'E',
        link: function (scope, element, attr) {

            var chart = null;
            var param = JSON.parse(attr['chartparam']);

            scope.$watch(attr['ngModel'], function(newVal, oldVal) {
                if(newVal.length == 0) return;
                if(!chart) {
                    chart = $.plot(element, newVal , param);
                } else {
                    chart.setData(newVal);
                    chart.setupGrid();
                    chart.draw();
                }
            }, true);
        }
    }
});

app.controller('Menu', function ($scope, MenuTab) {

    $scope.menu = MenuTab;

});

app.controller('JobStats', function($scope, $http, socket, MenuTab) {

    MenuTab.change('jobs');

    $scope.update = function() {

        socket.emit("jobstats", { }, function(result) {

            $scope.jobs = result;

        });
    };

    $scope.update();

});

app.controller('ProcessMonitor', function($scope, $http, MenuTab) {

    MenuTab.change('pm');

    $scope.update = function() {

        $http.get("http://debian-box.local:9615").success(function(result) {

            $scope.pm = result;
            console.log(result);

        });
    };

    $scope.update();

});

app.controller('GetStats', function ($scope, $http, $routeParams, socket, MenuTab) {

    $scope.stations = [ 'canterbury' , 'sydney-observatory-hill', 'sydney-olympic-park']; //TODO: would prefer to get this from server side

    MenuTab.change($routeParams.statType);
    $scope.statType = $routeParams.statType;

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

    $scope.plotdata = [];
    $scope.stats = [];
    $scope.period = 80;

    $scope.updateStats = function(station) {

        var statPos = $scope.stats.map(function(v) {return v.station;}).indexOf(station);
        if(statPos >= 0) { $scope.stats.splice(statPos, 1); }

        var plotPos = $scope.plotdata.map(function(v) {return v.label;}).indexOf(station);
        if(plotPos >= 0) {

            var result = $scope.plotdata[plotPos];

            var stat = {};
            stat.station = result.label;
            stat.last = result.data[result.data.length-1][1];
            stat.min = Math.min.apply(null, result.data.map(function(e) { return e[1]; }));
            stat.max = Math.max.apply(null, result.data.map(function(e) { return e[1]; }));

            stat.sum = result.data.map(function(e) { return e[1]; }).reduce(function (a,b) { return a + b; });
            stat.avg = Math.round(stat.sum/result.data.length*10)/10; //round to 1 d.p.

            $scope.stats.push(stat);

        };

    };

    $scope.update = function() {

        $scope.plotdata = [];

        for(var stn=0; stn < $scope.stations.length; stn++) { // var:stations initialised before this script is included

            socket.emit('data', { station: $scope.stations[stn], type: $scope.statType, period: $scope.period }, function(result) {

                if(result.data == undefined) return;  //TODO: not sure if this is the best test

                $scope.plotdata.push(result);

                $scope.updateStats(result.label);

            });
        }
    };

    socket.forward('stats', $scope);
    $scope.$on('socket:stats', function (ev, res) {

        console.log(res);

        for(var stn=0; stn < $scope.stations.length; stn++) { // var:stations initialised before this script is included

            var pos = $scope.plotdata.map(function(v) {return v.label;}).indexOf($scope.stations[stn]);

            console.log(pos, res.reqDate, typeof res.reqDate, res[$scope.stations[stn]][$scope.statType]);
//            console.log(res.reqDate);

            if(pos >= 0) {

                $scope.plotdata[pos].data.push([ res.reqDate, res[$scope.stations[stn]][$scope.statType] ]);

                $scope.updateStats($scope.stations[stn]);

            };
        };

        $scope.$apply($scope.plotdata);

    });

    $scope.update();

});

app.controller('RadarImage', function ($scope, $http, $routeParams, $timeout, socket, MenuTab) {

    MenuTab.change('radar');

    $scope.images = [];
    $scope.range = 'IDR713';
    $scope.span = 20;
    $scope.view = [];
    $scope.stamp = [];

    $scope.vis = {
        back: true,
        topo: true,
        water: true,
        rail: false,
        loc: true,
        SH: true
    };

    $scope.speed = 125;

    /**
     * TODO: I wonder if some if this should be moved to the directive:pause or similar
     */
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

        if($scope.prom) { $timeout.cancel($scope.prom); $scope.prom = null; }

        $scope.images = [];
        $scope.view = [];
        $scope.stamp = [];

        socket.emit('imglist', { range: $scope.range, span: $scope.span }, function(result) {

            $scope.stamp = result;

            for(var i=0, l=result.length; i < l; i++) {
                $scope.view.push(false);
                $scope.images.push("/img/"+$scope.range+"/"+result[i]);
            }

            $scope.slide = $scope.view.length - 1;
            $scope.view[$scope.slide] = true;

            $scope.prom = $timeout($scope.timerDo, 2000);

        });
    };

    socket.forward('radar', $scope);
    $scope.$on('socket:radar', function (ev, res) {
        console.log(res);
        if(res.range == $scope.range) {
            $scope.view.push(false);
            $scope.stamp.push(res.stamp);
            $scope.images.push("/img/"+$scope.range+"/"+res.stamp);
        };
        /**
         * TODO: maybe we should
         * $scope.view.shift
         * $scope.stamp.shift
         * $scope.images.shift
         */
    });

    $scope.refresh();

});