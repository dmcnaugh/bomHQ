/**
 * Created with JetBrains WebStorm.
 * User: dave
 * Date: 6/08/13
 * Time: 10:27 AM
 * To change this template use File | Settings | File Templates.
 */

function GetStats($scope) {

    $scope.plotdata = [];
    $scope.xstats = 'Cow';
    $scope.stats = [];

    console.log($scope.statType);
    console.log($scope.stations);

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

    console.log($scope.sym);

    for(var stn=0; stn < $scope.stations.length; stn++) { // var:stations initialised before this script is included

        $.getJSON("/data/"+$scope.stations[stn]+"/"+$scope.statType, function(result) {
          $scope.$apply(function() {
            //console.log(result);
            $scope.plotdata.push(result);

            if(result.data[0].length == 0) return;

            var stat = new Object();
            stat.station = result.label;
            stat.last = result.data[result.data.length-1][1];
            stat.min = Math.min.apply(null, result.data.map(function(e) { return e[1]; }));
            stat.max = Math.max.apply(null, result.data.map(function(e) { return e[1]; }));

            stat.sum = result.data.map(function(e) { return e[1]; }).reduce(function (a,b) { return a + b; });
            stat.avg = Math.round(stat.sum/result.data.length*10)/10; //round to 1 d.p.

            $scope.stats.push(stat);
            console.log($scope.stats);

            $.plot($("#chart"), $scope.plotdata, { // existing div#chart for flot chart
                colors: ["red", "green", "blue"],
                xaxis: { mode: "time", timezone: "browser", timeformat: "%a %H:%M" },
                yaxis: { },
                shadowSize: 4,
                legend: { show: true, position: "nw" },
                lines: { show: true },
                points: { show: false }
            });
          });
        });
    }

}