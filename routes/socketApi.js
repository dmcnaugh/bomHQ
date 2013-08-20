
var imgList = function (req, res) {

    var range = req.range;
    var span = parseInt(req.span);

    var proj = { stamp: 1, _id: 0 };

    db.collection(range, function(err, collection) {
        if (err) throw err;
        collection.find({}, proj).sort({stamp: -1}).limit(span).toArray(function(err, result) {
            if (err) throw err;
            var table = result.map(function(e) { return parseInt(e.stamp); });
            table.sort(function (a,b) {return a - b;}); //(re)sort by reqDate (ascending)
            res(table);

        });
    });
};

var jobStats = function(req, res) {

    res(job.map(function(e) {
        return {
            name: e.name,
            running: e.running,
            at: e.cronTime.sendAt().toLocaleString(),
            timeout: Math.floor(e.cronTime.getTimeout()/1000),
            cronTime: e.cronTime.toString()
        };
    }));
}

var data = function(req, res) {

    var station = req.station;
    var stat = req.type;
    var period = parseInt(req.period);

    db.collection('OBS_SYD', function(err, collection) {
        if (err) throw err;
        var proj = { reqDate: 1, '_id': 0 };
        proj[station+'.'+stat] = 1;
        collection.find( {}, proj).sort({reqDate: -1}).limit(period).toArray(function(err, result) {
            //            if (err) throw err;
            if(result[0] && result[0][station] && result[0][station][stat] != undefined) {
                var table = result.map(function(e) { return [ e.reqDate.getTime(), e[station][stat]]; });
                table.sort(function (a,b) {return a[0] - b[0];}); //(re)sort by reqDate (ascending)

                res({ label: station, data: table });

            } else {
                res({ });
            }
        });
    });
}

exports = module.exports = function(io) {

    return io.sockets.on('connection', function (socket) {

        socket.on('imglist', imgList);

        socket.on('jobstats', jobStats);

        socket.on('data', data);

    });
};
