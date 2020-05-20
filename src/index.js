"use strict";
const debug = require("debug")("sbi:scale");
const Emitter = require("events");

const SerialPort = require("serialport");
const Readline = require("@serialport/parser-readline");

const m = require("mathjs");

const sbi = require("./lib/sbi");

const TTY_DEFAULTS = {
  ttyDevice: "/dev/ttyUSB0",

  baudRate: 9600,
  dataBits: 8,
  parity: "none",
  stopBits: 1,
  rtscts: false,
  xon: false,
  xoff: false,
  xany: false,

  responseTimeout: 200, // in milliseconds

  precision: 1, // decimal places
};

//
// default error handler (just throws the error)
//
function throwIt(err) {
  if (err) throw new Error(err);
}

class Scale extends Emitter {
  constructor(options = {}, callback) {
    super();

    let scale = this;

    scale.options = { ...TTY_DEFAULTS, ...options };

    scale.tty = new SerialPort(scale.options.ttyDevice, {
      // defaults
      baudRate: scale.options.baudRate,
      dataBits: scale.options.dataBits,
      parity: scale.options.parity,
      stopBits: scale.options.stopBits,
      rtscts: scale.options.rtscts,
      xon: scale.options.xon,
      xoff: scale.options.xoff,
      xany: scale.options.xany,
      //
      autoOpen: false,
    });

    scale.parser = scale.tty.pipe(new Readline({ delimiter: "\r\n" }));

    // auto open the scale if a callback is provided
    if (callback) {
      scale.open(callback);
    }
  }

  //
  // scale.open( (err) => { ... } );
  //
  open(callback) {
    let scale = this;

    callback = callback || throwIt;

    // attempt to open the scale's tty port
    scale.tty.open((err) => {
      if (err) return callback(err);

      debug("checking for autoPrint");
      process.nextTick(() => {
        if (scale.tty.read(1)) {
          scale.tty.close();
          callback(new Error("AUTO-PRINT-ERROR"));
        }

        // send a command to the scale, just to make sure it is really a scale
        debug("probing the scale");
        scale.query(sbi.DEVICE_INFO, (err, devInfo) => {
          if (err) return callback(err);
          debug(`probe found a scale: ${devInfo}`);
          callback(undefined, scale);
          scale.emit("open"); // Success!
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

    scale.tty.close((err) => {
      if (err) {
        return callback(err);
      }
      scale.emit("close");
      callback(undefined); // success!
    });
  }

  //
  // send( sbi.Tare, (err) => { ... } );
  //
  // Send and a buffer/string to the scale's tty device and wait for it to drain.
  //
  send(buff, callback) {
    let scale = this;
    debug(`sending "${buff.trim()}" (${buff.length} bytes) to scale`);
    scale.tty.write(buff, (err) => {
      if (err) {
        return callback(err);
      }
      scale.tty.drain(callback);
    });
  }

  //
  // query( sbi.PRINT, (err,response) => { ... } [, responseTimeout] )
  //
  // Send a query to the scale's tty device and wait for the response
  //
  query(cmd, callback, responseTimeout) {
    let scale = this;

    scale.send(cmd, (err) => {
      if (err) {
        return callback(err);
      }

      let timeout = undefined;

      let getResponse = (data) => {
        debug(`got "${data.trim()}" (${data.length} bytes) back`);
        clearTimeout(timeout);
        callback(undefined, data); // success!
      };

      timeout = setTimeout(() => {
        callback(new Error("TIMEOUT"));
        scale.parser.removeListener("data", getResponse);
      }, responseTimeout || scale.options.responseTimeout); // wait a reasonable amount of time

      scale.parser.once("data", getResponse);
    });
  }

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
  extractWeight(data, callback) {
    if (data.length !== 14) {
      return callback(new Error("bad weight - wrong length"));
    }
    if (!(data[0] === " " || data[0] === "+" || data[0])) {
      return callback(new Error("bad weight - wrong sign"));
    }
    let sign = data[0] === "-" ? -1 : 1;
    let weight = m.round(
      sign * Number(data.substring(1, 11)),
      this.options.precision
    );
    if (isNaN(weight)) {
      return callback(new Error("bad weight - not a number"));
    }
    let uom = data.substr(11, 3).trim();
    // Note: empty uom means the scale isn't stable yet.
    if (!(uom === "" || uom === "g" || uom === "/lb")) {
      return callback(new Error("bad weight - uom"));
    }

    callback(undefined, weight, uom); // success!
  }

  //
  // scale.weight( (err,weight,uom) => { ... } )
  //
  weight(callback) {
    let scale = this;
    scale.query(sbi.PRINT, (err, data) => {
      if (err) {
        return callback(err);
      }
      scale.extractWeight(data, callback);
    });
  }

  //
  // scale.tare( (err) => { ... } )
  //
  tare(callback) {
    this.send(sbi.TARE, callback || throwIt);
  }

  //
  // scale.deviceInfo( (err,data) => { ... } )
  //
  deviceInfo(callback) {
    this.query(sbi.DEVICE_INFO, (err, data) => {
      if (err) return callback(err);
      callback(undefined, data.trim());
    });
  }

  //
  // serialNumber( (err,data) => { ... } )
  //
  serialNumber(callback) {
    this.query(sbi.SERIAL_NUMBER, (err, data) => {
      if (err) return callback(err);
      callback(undefined, data.trim());
    });
  }

  //
  // message( msg, (err) => { ... } )
  //
  message(msg, callback) {
    this.send(sbi.MSG(msg || ""), callback || throwIt);
  }

  //
  // toggle( msg, (err) => { ... } )
  //
  toggle(msg, callback) {
    this.send(sbi.TOGGLE_WEIGH_MODE, callback || throwIt);
  }

  //
  // status( (err,statusMsg) => { ... } );
  //
  // where statusMsg
  //  'disconnected' = serial port connected but a compatible scale wasn't found
  //  'locked' = a scale is connected but it's display is locked (powered off)
  //  'ready' = a scale is connected and receiving commands
  //
  status(callback = throwIt) {
    let scale = this;

    // first check if the scale is connected...
    scale.deviceInfo((err) => {
      if (err) return callback(undefined, "disconnected");

      // we are connected to a scale, now see if it's display is locked...
      scale.query(sbi.PRINT, (err) => {
        if (err) return callback(undefined, "locked");
        return callback(undefined, "ready");
      });
    });
  }

  //
  // monitor( (err,poll) => { ... }, pollEvery ) // pollEvery n milliseconds for weight changes
  //
  // watch the scale and emit events for every change in weight, key pressed, power state, etc.
  // calls back the interval of the monitor poll, which can be canceled with scale.cancel(poll)
  //

  monitor(callback, pollEvery = 200) {
    let scale = this;

    let lastWeight = undefined;
    let lastUom = undefined;

    scale.send(sbi.LOCK_KEYBOARD, (err) => {
      if (err) {
        return callback(err);
      }

      callback(
        undefined,
        setInterval(() => {
          scale.weight((err, weight, uom) => {
            if (err) scale.emit("error", err);

            if (!(weight === lastWeight && uom === lastUom)) {
              scale.emit("weight", weight, uom);
              lastWeight = weight;
              lastUom = uom;
            }

            scale.query(sbi.LAST_KEY_PRESS, (err, data) => {
              if (err) scale.emit("error", err);
              if (data !== sbi.KEY.NO_KEY) {
                scale.emit("key", data, sbi.KEY_LOOKUP[data]);
              }
            });
          });
        }, pollEvery)
      );
    });
  }

  cancel(poll, callback = throwIt) {
    let scale = this;
    clearInterval(poll);
    scale.send(sbi.RELEASE_KEYBOARD, callback);
  }
}

module.exports = { Scale: Scale, TTY_DEFAULTS: TTY_DEFAULTS };
