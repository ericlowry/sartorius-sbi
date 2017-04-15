# sartorius-sbi
Sartorius SBI Interface for NodeJS

# Scales Supported

- Sartorius PMA 7501
- Sartorius PMA 7501-X
- and others...

# Usage

```javascript

var Scale = require('sartorius-sbi').Scale;

var scale = new Scale({ ttyDevice: '/dev/ttyUSB0', baudRate: 9600 });

scale.on('connect', () => {
   scale.deviceInfo( (err,devInfo) => console.log(`scale: ${devInfo}`) ); // -> "scale: PMA7501-X00V1"
});

scale.on('weight', (err,measure) => {
    if (err) { return console.error(err); }
    console.log( 'weight: ' + measure.weight + + measure.uom ); // -> "weight: 0.0g"
});

scale.connect( (err) => {
    if (err) { return console.error('Unable To Connect To Serial Port'); }
  
    // tell the scale to zero itself
    scale.tare( () => {
        scale.weight( (err,measure) => {
           if ( measure.uom === '/lb' ){
                  scale.toggle(); // switch to measuring grams
           }
           scale.monitor(); // emit 'weight' and 'keypress' events whenever the scale changes
        });
    }); 
});

```

# Documentation
###### Coming Soon...

### Note:

The author (me) is willing to add support for other Sartorius lab scales and balances, contact me if your preferred device isn't supported
