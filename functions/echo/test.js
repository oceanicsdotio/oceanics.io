const addon = require("./pkg/neritics");

/**
 * Running from commandline requires >= Node v12
 */

const message = addon.hello_world("you");
console.log(message);


