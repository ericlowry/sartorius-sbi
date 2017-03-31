# sartorius-sbi
Sartorius SBI Interface for NodeJS

# Scales Supported

- Sartorius PMA 7501
- Sartorius PMA 7501-X
- and others...

# Usage

```javascript 1.8

var Scale = require('sartorius-sbi');

var scale = new Scale({ ttyDevice: '/dev/ttyUSB0', baudRate: 9600 });

scale.on('connect', function(){
   console.log('connected to: ' + scale.options.ttyDevice); // -> "connected to: /dev/ttyUSB0"
   console.log('scale type: ' + scale.scaleType ); // -> "scale type: PMA7501-X00V1"
});

scale.on('weight', function(err,measure){
    if (err) { return console.error(err); }
    console.log( 'weight: ' + measure.weight + + measure.uom ); // -> "weight: 0.0g"
});

scale.connect(function(err){
    if (err) { return console.error('Unable To Connect To Serial Port'); }
  
    // tell the scale to zero itself
    scale.tare(function(){
        scale.weight(function(err,measure){
           if ( measure.uom === '/lb' ){
                  scale.toggle(); // switch to measuring grams
           }
           scale.monitorWeight(); // emit a 'weight' event whenever the scale changes
        });
    }); 
});

```

# Documentation
###### Coming Soon...

### Note:

The author (me) is willing to add support for other Sartorius lab scales and balances, contact me if your preferred device isn't supported
