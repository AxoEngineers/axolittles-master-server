const fs = require('fs');
const path = require('path');
const config = require('./config');

// PROGRAM START

printArt();

function spacer() {
	console.log("==========================================================");
}

function printArt() {
	spacer();
	console.log(" *** Axolittles Master Server");
	console.log(` ** Developed by INFTERACT.. Version ${config.version}`);
	spacer();
}

function isDir(path) {
    try {
        var stat = fs.lstatSync(path);
        return stat.isDirectory();
    } catch (e) {
        // lstatSync throws an error if path doesn't exist
        return false;
    }
}

module.exports.spacer = spacer;