
'use strict';

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var Scale = require('../../src/index.js').Scale;
var TTY_DEFAULTS = require('../../src/index.js').TTY_DEFAULTS;

function getString(v){ return v; }
function getInt(i) { return parseInt(i); }

const args = require('commander')

    .version( require('../../package.json').version )

    .option( '-d --ttyDevice <dev>', 'device name [/dev/tty.USB0]', getString, TTY_DEFAULTS.ttyDevice )
    .option( '-b --baudRate <baud>', '1200, [9600] or 38400', getInt, 9600 )
    .option( '--dataBits <bits>', '7 or [8]', getInt, 8 )
    .option( '--stopBits <bits>', '0 or [1]', getInt, 1 )
    .option( '--parity <parity>', 'odd, even or [none]', getString, 'none' )

    .option( '--rtscts', 'ready-to-send, clear-to-send' )
    .option( '--xon', 'xon handshake' )
    .option( '--xoff', 'xoff handshake' )
    .option( '--xany', 'xany handshake' )

    .option( '--responseTimeout <ms>', 'response timeout [200] milliseconds', getInt, 200 )
    .option( '--precision <places>', 'weight precision [1] or 2 decimal places', getInt, 1 )

    .parse(process.argv)

    ;

let scaleOptions = {

    ttyDevice:          args.ttyDevice,
    baudRate:           args.baudRate,
    dataBits:           args.dataBits,
    stopBits:           args.stopBits,
    parity:             args.parity,

    rtscts:             !!args.rtscts,
    xon:                !!args.xon,
    xoff:               !!args.xoff,
    xany:               !!args.xany,

    responseTimeout:    args.responseTimeout,
    precision:          args.precision,

};

var serialNumber;
var deviceInfo;

var lastWeight;

var scale = new Scale( scaleOptions, function(err){
    if (err) {
        console.error('Unable To Connect To Serial Port');
        process.exit();
    }
    scale.deviceInfo(function(err,data) {
        if (err) return console.error(err);
        deviceInfo = data;

        scale.serialNumber(function (err, data) {
            if (err) return console.error(err);
            serialNumber = data;

            scale.monitor(function (err) {
                if (err) return console.error;

                scale.on('weight', function(weight,uom){
                    lastWeight = { weight: weight, uom: uom };
                    io.emit( 'weight', lastWeight ); // broadcast weight changes
                });

                scale.on('key', (key, name) => {

                    switch(name){

                        case 'TOGGLE':
                            scale.toggle(function(err) {
                                io.emit('toggled');
                            });
                            break;

                        case 'TARE':
                            scale.tare(function(err) {
                                io.emit('tared')
                            });
                            break;

                        default:
                            console.log('unhandled key press ' + key + ' (' + name + ')');
                    }

                });
            });
        });
    });
});

app.get('/', function(req,res){
    res.sendFile( __dirname + '/index.html');
});

io.on('connection', function(socket){
    console.log(`connect (${socket.id})`);

    // make sure the client gets the current weight;
    socket.emit( 'weight', lastWeight );

    socket.on('disconnect', function(){
        console.log(`disconnect (${socket.id})`);
    });

    socket.on( 'deviceInfo', function( msg, ack ){
        if (typeof ack === 'function'){
            ack(deviceInfo);
        }
    });

    socket.on( 'serialNumber', function( msg, ack ){
        if (typeof ack === 'function'){
            ack(serialNumber);
        }
    });

    socket.on( 'tare', function(){
        scale.tare();
    });

});

http.listen( 3000, function(err){
    if (err) return console.error(err);
    console.log('listening on *:3000');
});
