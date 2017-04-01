'use strict';

const Emitter = require('events');

const SerialPort = require('serialport');

const m = require('mathjs');

const sbi = require('./lib/sbi');

const TTY_DEFAULTS = {

    ttyDevice: '/dev/ttyUSB0',

    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: "none",
    rtscts: false,
    xon: false,
    xoff: false,
    xany: false,

    responseTimeout: 200, // in milliseconds

    precision: 1, // decimal places

};

const NO_RESPONSE = new Error('scale is not responding');

//
// default error handler (just throws the error)
//
function throwIt(err){
    if (err ){ throw new Error(err); }
}

class Scale extends Emitter {

    constructor( options, callback ) {

        super();

        let scale = this;

        scale.options = Object.assign({}, TTY_DEFAULTS, options || {});

        scale.scaleType = undefined;
        scale.serialNumber = undefined;

        scale.responseHandler = undefined;

        scale.tty = new SerialPort( scale.options.ttyDevice, {

            "parser": SerialPort.parsers.readline("\r\n"),
            "autoOpen": false,

            // defaults

            "baudRate": scale.options.baudRate,
            "dataBits": scale.options.dataBits,
            "stopBits": scale.options.stopBits,
            "parity":   scale.options.parity,
            "rtscts":   scale.options.rtscts,
            "xon":      scale.options.xon,
            "xoff":     scale.options.xoff,
            "xany":     scale.options.xany

        });

        if (callback) {
            scale.open( (err) => {
                callback( err, scale );
            })
        }
    }

    //
    // scale.open( (err) => { ... } );
    //
    open( callback ) {

        let scale = this;

        callback = callback || throwIt;

        // attempt to open the scale's tty port
        scale.tty.open( (err) => {
             if (err) { return callback(err); }

            // ask the scale for it's device info
            scale.query(sbi.DEVICE_INFO, (err, deviceInfo) => {
                if (err) { return callback(err); }
                scale.deviceInfo = deviceInfo.trim();

                // ask the scale for it's serial number
                scale.query(sbi.SERIAL_NUMBER, (err, serialNumber) => {
                    if (err) { return callback(err); }
                    scale.serialNumber = serialNumber.trim();

                    // success!

                    callback( undefined, scale );
                    scale.emit('open');
                });
            });
        });
    }


    //
    // scale.close( (err) => { ... } )
    //
    // Close the scale's connection to it's tty device.
    //
    close(callback) {

        let scale = this;

        callback = callback || throwIt;

        scale.tty.close( (err) => {
            if (err) { return callback(err); }
            scale.emit('close');
            callback( undefined ); // success!
        });
    }

    //
    // send( sbi.Tare, (err) => { ... } );
    //
    // Send and a buffer/string to the scale's tty device and wait for it to drain.
    //
    send( buff, callback ){
        let scale = this;
        scale.tty.write( buff, (err) => {
            if (err) { return callback(err); }
            scale.tty.drain( callback );
        })
    }

    //
    // query( sbi.PRINT, (err,response) => { ... } [, responseTimeout] )
    //
    // Send a query to the scale's tty device and wait for the response
    //
    query( cmd, callback, responseTimeout ) {

        let scale = this;

        scale.send( cmd, (err) => {
            if (err) { return callback(err); }

            let timeout = undefined;

            let getResponse = (data) => {
                callback( undefined, data ); // success!
                scale.tty.removeListener( 'data', getResponse );
                clearTimeout(timeout);
            };

            timeout = setTimeout( ()=>{
                callback( new Error('TIMEOUT') );
                scale.tty.removeListener( 'data', getResponse );
            }, responseTimeout || scale.options.responseTimeout ); // wait a reasonable amount of time

            scale.tty.on( 'data', getResponse );
        });
    };

    //
    // extractWeight( data, (err,weight,uom) => { ... } )
    //
    // Extract a proper weight value from a scale response
    //
    //                                                       01234567890123
    // Note: scale responds with values that look like this '-      0.1 g  '
    //
    // data[0] = sign
    // data[1..10] = weight
    // data[11..13] = UOM
    //
    extractWeight( data, callback ){

        if ( data.length !== 14 ) { return callback(new Error('bad weight - wrong length')); }
        if ( !(data[0]===' '||data[0]==='+'||data[0]) ){ return callback(new Error('bad weight - wrong sign')); }
        let sign = (data[0]==='-'?-1:1);
        let weight = m.round( sign * Number( data.substring(1,11) ), this.options.precision );
        if ( weight === NaN ){ return callback( new Error('bad weight - not a number')); }
        let uom = data.substr(11,2).trim();
        if ( !( uom === '' || uom === 'g' || uom === '/lb' )){ return callback( new Error('bad weigh - uom')); }

        callback( undefined, weight, uom ); // success!

    }

    //
    // scale.weight( (err,weight,uom) => { ... } )
    //
    weight( callback ){
        let scale = this;
        scale.query(sbi.PRINT, (err,data) => {
            if (err) { return callback(err); }
            scale.extractWeight( data, callback );
        });
    }

    //
    // scale.tare( (err) => { ... } )
    //
    tare( callback ){
        this.send(sbi.TARE, callback || throwIt);
    }
}

module.exports = Scale;
