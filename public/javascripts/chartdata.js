/**
 * Created with JetBrains WebStorm.
 * User: dave
 * Date: 6/08/13
 * Time: 10:27 AM
 * To change this template use File | Settings | File Templates.
 */

var plotdata = [];
var sym = "";

switch(statType) { // var:statType initialised before this script is included
    case "temp":
        sym = "&deg;C";
        break;
    case "press":
        sym = "&nbsp;hPa";
        break;
    case "rain":
        sym = "&nbsp;mm";
        break;
    case "hum":
        sym = "%";
        break;
};

for(var stn=0; stn < stations.length; stn++) { // var:stations initialised before this script is included

    $.getJSON("/data/"+stations[stn]+"/"+statType, function(result) {

        //console.log(result);
        plotdata.push(result);

        if(result.data[0].length == 0) return;

        var last = result.data[result.data.length-1][1];
        var min = Math.min.apply(null, result.data.map(function(e) { return e[1]; }));
        var max = Math.max.apply(null, result.data.map(function(e) { return e[1]; }));

        var sum = result.data.map(function(e) { return e[1]; }).reduce(function (a,b) { return a + b; });
        var avg = Math.round(sum/result.data.length*10)/10; //round to 1 d.p.

        var html = "<tr>";
        html += "<td headers='station'>"+result.label+"</td>";
        html += "<td headers='min'>"+min+sym+"</td>";
        html += "<td headers='max'>"+max+sym+"</td>";
        html += "<td headers='avg'>"+avg+sym+"</td>";
        html += "<td headers='last'>"+last+sym+"</td>";
        html += "</tr>";

        $("#vals").append(html); // existing tbody#vals for statistics table

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