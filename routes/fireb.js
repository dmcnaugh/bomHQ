/**
 * Created with JetBrains WebStorm.
 * User: dmcnaughton
 * Date: 31/08/13
 * Time: 9:48 PM
 * To change this template use File | Settings | File Templates.
 */
var Firebase = require('firebase');

exports = module.exports = inject(function() {

    exports.root = new Firebase('https://bomhq.firebaseio.com/');
    
    return exports;

});