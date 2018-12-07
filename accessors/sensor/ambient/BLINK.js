/**
 * BLINK: BLE Motion Sensor
 * ===============================
 *
 * BLink is a BLE sensor tag with motion sensors. It transmits all sensor readings in advertisements so listeners do
 * not have to connect.
 *
 *
 *
 * @module
 * @author Wenpeng Wang <ww2cg@virginia.edu>
 * @display-name BLINK
 */

var ble = require('ble');

//save the last known value for output ports
var LK_current_motion = null;
var LK_motion_since_last_adv = null;
var LK_motion_last_min = null;

var current_motion = null; // 1 if the PIR is currently detecting motion, 0 otherwise
var motion_since_last_adv = null; // 1 if the PIR detected motion at any point since the last adv was transmitted
var motion_last_minute    = null; //

function setup() {

	createPort('Current_motion', ['read', 'eventPeriodic'], {
		type: 'numeric',
		units: 'times'
	});

	createPort('Motion_since_last_adv', ['read', 'eventPeriodic'], {
		type: 'numeric',
		units: 'times'
	});

	createPort('Motion_last_min', ['read', 'eventPeriodic'], {
		type: 'numeric',
		units: 'times'
	});

}

function* init() {

	addOutputHandler('Current_motion', current_motion_output);
	addOutputHandler('Motion_since_last_adv', motion_since_last_adv_output);
	addOutputHandler('Motion_last_min', motion_last_min_output);

	var BLINK_mac = getParameter('mac_address', null);

	//get a handle to the hardware
	ble_hw = yield* ble.Central();

	// Using BLE may fail
	if (ble_hw === null) {
		console.error('Unable to get access to a BLE device.');
		return;
	}

	// Start the scan for any devices
	ble_hw.scan([], 'squall+PIR', BLINK_mac, function* (peripheral) {
		var now = new Date();
		console.log('Data time: ' + now);


		var msd = peripheral.advertisement.manufacturerData;

		if (peripheral.advertisement.manufacturerData) {
            // Need at least 3 bytes. Two for manufacturer identifier and
            // one for the service ID.
            if (peripheral.advertisement.manufacturerData.length >= 3) {
                // Check that manufacturer ID and service byte are correct
                var manufacturer_id = peripheral.advertisement.manufacturerData.readUIntLE(0, 2);
                var service_id = peripheral.advertisement.manufacturerData.readUInt8(2);
                if (manufacturer_id == 0x02E0 && service_id == 0x13) {
                    // OK! This looks like a PIR packet
                    if (peripheral.advertisement.manufacturerData.length == 6) {
                        var pir = peripheral.advertisement.manufacturerData.slice(3);

                        var current_motion        = pir.readUInt8(0); // 1 if the PIR is currently detecting motion, 0 otherwise
                        var motion_since_last_adv = pir.readUInt8(1); // 1 if the PIR detected motion at any point since the last adv was transmitted
                        var motion_last_minute    = pir.readUInt8(2); // 1 if the PIR detected motion at any point in the last minute

                        LK_current_motion = current_motion;
						LK_motion_since_last_adv = motion_since_last_adv;
						LK_motion_last_min = motion_last_minute;

                        // if (current_motion > 0){
                        // 	send('Motion_since_last_adv', current_motion);
                        // }
                        //send('Current_motion', current_motion);
                        send('Motion_since_last_adv', motion_since_last_adv);

                        //send('Motion_last_min', motion_last_minute);

                        return;

                    }
                }
            }
        }
	});
}

function any_output (port, val) {
	if (val == null) {
		console.error('Could not find a BLEES sensor.');
		throw 'Could not find a BLEES sensor.';
	}

	send(port, val);
}





var current_motion_output = function() { return any_output('Current_motion', LK_current_motion); };
var motion_since_last_adv_output = function () { return any_output('Motion_since_last_adv', LK_motion_since_last_adv); };
var motion_last_min_output = function() { return any_output('Motion_last_min', LK_motion_last_min); };
