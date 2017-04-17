#!/usr/local/bin/node

const Scale = require('../src').Scale;
const TTY_DEFAULTS = require('../src').TTY_DEFAULTS;

let cmd;
let msg;

function getString(v){ return v; }
function getInt(i) { return parseInt(i); }

const args = require('commander')

    .version( require('../package.json').version )

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
    ;

args.command('info')
    .description('show information about the scale')
    .action(()=>{
        cmd = 'info';
    });

args.command('tare')
    .description('zero-tare the scale')
    .action(()=>{
        cmd = 'tare';
    });

args.command('weight')
    .description('show current weight')
    .action(()=>{
        cmd = 'weight';
    });

args.command('toggle')
    .description('toggle the scale mode ( weight | parts/lb )')
    .action(()=>{
        cmd = 'toggle';
    });

args.command('message [msg]')
    .description('send an operator message to the scale, like READY or ERROR')
    .action((_msg)=>{
        cmd = 'message';
        msg = _msg;
    });

args.command('monitor')
    .description('monitor the weight and scale keys pressed')
    .action(()=>{
        cmd = 'monitor';
    });

args.parse(process.argv);

if (!cmd) { args.help(); }

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

new Scale( scaleOptions, (err,scale) => {

    if (err) {
        switch (err.message){

            case 'AUTO-PRINT-ERROR':
                console.error('Please Adjust Scale "PRINT" Settings: SETUP > PRINT > MAN.AUT > MAN.W/O');
                break;

            default:
                console.error(err);
        }
        return;
    }

    switch (cmd) {

        case 'info':
            scale.deviceInfo( (err,data) => {
                if (err) { scale.close(); return console.error(err); }
                console.log(`Scale Type    : ${data}`);
                scale.serialNumber( (err,data) => {
                    if (err) { scale.close(); return console.error(err); }
                    console.log(`Serial Number : ${data}`);
                    scale.close();
                });
            });
            break;

        case 'tare':
            scale.tare( (err) => {
                if (err) { console.error(err); } else { console.log('Tared!'); }
                scale.close();
            });
            break;

        case 'weight':
            scale.weight( (err,weight,uom) => {
                if (err) { scale.close(); return console.error(err); }
                console.log(`Weight: ${weight} ${ !uom ? '(unsteady)' : uom }`);
                scale.close()
            });
            break;

        case 'message':
            scale.message( msg, (err) => {
                if (err) { console.error(err); } else { console.log('Message Sent!'); }
                scale.close();
            });
            break;

        case 'toggle':
            scale.toggle( msg, (err) => {
                if (err) { console.error(err); } else { console.log('Mode Toggled!'); }
                scale.close();
            });
            break;

        case 'monitor':

            scale.status( (err,status) => {
                if (err || status !== 'ready') {
                    scale.close();
                    if (err) return console.error(err);

                    if (status === 'disconnected')
                        return console.error('scale is disconnected');

                    if (status === 'locked')
                        return console.error('scale is locked, please turn on the scale');

                    return console.error("scale ins't ready: " + status);
                }

                scale.monitor( (err,poll) => {
                    if (err) {
                        scale.close();
                        return console.error
                    }
                    console.log('scale is active, press ^C to quit');

                    scale.on('weight', (weight, uom) => {
                        console.log(`weight: ${weight} ${uom}`);
                    });

                    scale.on('key', (key, name) => {
                        console.log(`key: ${name} ${key}`);

                        if (name === 'TOGGLE') {
                            scale.toggle();
                        }

                        if (name === 'TARE') {
                            scale.tare();
                        }

                    });

                    scale.on('error', (err) => {
                        console.error(err.message);
                        process.nextTick(() => {
                            process.exit(1);
                        });
                    });

                    // detect when the user presses ctrl-c
                    process.on('SIGINT', ()=>{
                        console.log("\nreleasing scale")
                        scale.cancel(poll,(err)=>{
                            process.exit();
                        });

                    });

                });
            });
            break;

        default:
            args.help();
            break;
    }
});