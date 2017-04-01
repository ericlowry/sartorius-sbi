#!/usr/local/bin/node

const Scale = require('..');
//const sbi = require('../lib/sbi');

var cmd;
var msg;

const args = require('commander')

    .version( require('../package.json').version )

    .option( '--ttyDevice <string>', 'device name [/dev/tty.USB0]', undefined, '/dev/tty.USB0' )
    .option( '--baudRate <int>', '1200, [9600] or 38400', parseInt, 9600 )
    .option( '--dataBits <int>', '7 or [8]', parseInt, 8 )
    .option( '--stopBits <int>', '0 or [1]', parseInt, 1 )
    .option( '--parity <string>', 'odd, even or [none]', undefined, 'none' )

    .option( '--rtscts', 'ready-to-send, clear-to-send' )
    .option( '--xon', 'xon handshake' )
    .option( '--xoff', 'xoff handshake' )
    .option( '--xany', 'xany handshake' )

    .option( '--responseTimeout <int>', 'response timeout [200] milliseconds', parseInt, 200 )
    .option( '--precision <int>', 'weight precision [1] or 2 decimal places', parseInt, 1 )
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

args.command('display [msg]')
    .description('send an operator message to the scale, like READY or ERROR')
    .action((_msg)=>{
        cmd = 'display';
        msg = _msg;
    });

args.parse(process.argv);

switch(cmd){
    case 'tare':
        console.log('tare - coming soon');
        break;
    case 'info':
        cosole.log('info - coming soon');
        break;
    case 'weight':
        cosole.log('weight - coming soon');
        break;
    default:
        args.help();
        break;
}

