

const ESC = "\x1B";

const KEY = {

    NO_KEY:     '        000   ',
    NO_KEY_LP:  '        000   ',
    TARE:       '        051   ',
    TARE_LP:    '        053   ',
    TOGGLE:     '        042   ',
    TOGGLE_LP:  '        044   ',
    CLEAR:      '        120   ',
    CLEAR_LP:   '        122   ',
    ENTER:      '        119   ',
    ENTER_LP:   '        121   ',
    UP:         '        123   ',
    UP_LP:      '        125   ',
    DOWN:       '        124   ',
    DOWN_LP:    '        126   ',
    FUNC:       '        116   ',
    FUNC_LP:    '        118   '

};

// >        000   <
const KEY_LOOKUP = {

    '        000   ': 'NO_KEY',
    '        051   ': 'TARE',
    '        053   ': 'TARE_LP',
    '        042   ': 'TOGGLE',
    '        044   ': 'TOGGLE_LP',
    '        120   ': 'CLEAR',
    '        122   ': 'CLEAR_LP',
    '        119   ': 'ENTER',
    '        121   ': 'ENTER_LP',
    '        123   ': 'UP',
    '        125   ': 'UP_LP',
    '        124   ': 'DOWN',
    '        126   ': 'DOWN_LP',
    '        116   ': 'FUNC',
    '        118   ': 'FUNC_LP'

};

function _KP(key){
    return ESC + "f8" + key +"_";
}

function _MSG(msg){
    return ESC + 'a3' + msg + '_';
}

module.exports = {

    //
    // SBI commands (don't return a result)
    //

    AMBIENT_VERY_STABLE:    ESC + "K",
    AMBIENT_STABLE:         ESC + "L",
    AMBIENT_UNSTABLE:       ESC + "M",
    AMBIENT_VERY_UNSTABLE:  ESC + "N",

    LOCK_KEYBOARD:          ESC + "O",
    RELEASE_KEYBOARD:       ESC + "R",

    RESTART:                ESC + "S", // Restart (Reboot?) the scale
    TARE:                   ESC + "T", // Zero Tare The Scale

    TOGGLE_WEIGH_MODE:      ESC + "f0_", // Toggle the weighing mode between grams "g" and parts per pound "/lb"

    PRESS_KEY_TARE:         _KP(KEY.TARE),
    PRESS_KEY_TARE_LP:      _KP(KEY.TARE_LP),
    PRESS_KEY_TOGGLE:       _KP(KEY.TOGGLE),
    PRESS_KEY_TOGGLE_LP:    _KP(KEY.TOGGLE_LP),
    PRESS_KEY_CLEAR:        _KP(KEY.CLEAR),
    PRESS_KEY_CLEAR_LP:     _KP(KEY.CLEAR_LP),
    PRESS_KEY_ENTER:        _KP(KEY.ENTER),
    PRESS_KEY_ENTER_LP:     _KP(KEY.ENTER_LP),
    PRESS_KEY_UP:           _KP(KEY.UP),
    PRESS_KEY_UP_LP:        _KP(KEY.UP_LP),
    PRESS_KEY_DOWN:         _KP(KEY.DOWN),
    PRESS_KEY_DOWN_LP:      _KP(KEY.DOWN_LP),
    PRESS_KEY_FUNC:         _KP(KEY.FUNC),
    PRESS_KEY_FUNC_LP:      _KP(KEY.FUNC_LP),

    MSG:                    _MSG, // Display A Message On The Device's Display, Like 'READY'

    //
    // SBI queries (return a result )
    //

    PRINT:                  ESC + "P",   // Print the current weight
    DEVICE_INFO:            ESC + "x1_", // Request The Scale's Device Info
    SERIAL_NUMBER:          ESC + "x2_", // Request The Scale's Serial Number
    FIRMWARE_VERSION:       ESC + "x3_", // Request The Scale's Firmware Version
    MIN_WEIGHT:             ESC + "x4_", // show minimum weight value
    MAX_WEIGHT:             ESC + "x5_", // show maximum weight value
    LAST_KEY_PRESS:         ESC + "x8_", // last key pressed on the scale

    //
    // Misc
    //

    KEY: KEY,
    KEY_LOOKUP: KEY_LOOKUP,

};
