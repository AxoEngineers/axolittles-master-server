/*
==========================================================
  ___ _   _ _____ _____ _____ ____      _    ____ _____ 
 |_ _| \ | |  ___|_   _| ____|  _ \    / \  / ___|_   _|
  | ||  \| | |_    | | |  _| | |_) |  / _ \| |     | |  
  | || |\  |  _|   | | | |___|  _ <  / ___ \ |___  | |  
 |___|_| \_|_|     |_| |_____|_| \_\/_/   \_\____| |_|  
 
==========================================================

							NOTES

 (*) Author: Aleks                                       					
					
==========================================================
*/

// native dependencies
const readline = require("readline");
const path = require('path');

// our depdendencies
const api = require('./main');
const config = require('./config');
const cm = require('./contractmanager');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const express = require("express");
const app = express();
const router = express.Router();

if (config.env != "local") 
{
	const fs = require('fs');
	let references = fs.readFileSync('./game/StreamingAssets/aa/catalog.json', 'utf8');
	references = references.replace(new RegExp("http://localhost:3000", 'g'), "https://axoquarium.herokuapp.com");
	fs.writeFileSync('game/StreamingAssets/aa/catalog.json', references);
	console.log("Rewriting localhost references to catalog according to environment");
}

router.use('/', express.static('game'));
router.use('/WebGL', express.static('assetbundles'));
router.use('/avatar', express.static('av-fetcher/images'));

/// OUR OWN REST API (REPLACES MORALIS WOO!!)
/*router.get("/owned/:contract/:addr", async(req, res, next) => {
	if (req.params.addr == "filter") {
		res.send(await cm.getOwnedByFilter(req.params.contract, req.query))
	} else {
		res.send(await cm.getOwnedNfts(req.params.contract, req.params.addr))
	}
})*/

router.get("/all/:addr", async(req, res, next) => {
	res.send(await cm.getAllOwnedNfts(req.params.addr))
})

/*router.get("/staked/:contract/:addr", async(req, res, next) => {
	res.send(await cm.getStakedNfts(req.params.contract, req.params.addr))
})

router.get("/unstaked/:contract/:addr", async(req, res, next) => {
	res.send(await cm.getUnstakedNfts(req.params.contract, req.params.addr))
})*/

// Initialization Section
function promptInput() {
	rl.question("", function(str) {
		
		let cmd = str;
		let prefix = "/";
		
		if (cmd.startsWith(prefix))
		{
			cmd = cmd.substring(1);
		}
		
		if ((/[a-zA-Z]/).test(cmd.charAt(0)))
		{
			const args = cmd.trim().split(' ');
			const command = args.shift().toLowerCase();
		
			if (command == "exit") {
				process.exit(1);
			}
		}
		
		promptInput();
	});
}

(async () => {
	app.use('/', router);
	app.listen(config.port, () => {
		console.log(`Server running on port ${config.port}`);
	});
	
	// Pixelverse Item (PVIT)
	await cm.createStaticContracts()
	
	let handler = undefined
	
	// SEALS
	console.log("LOADING AXO NORMAL/STAKE CONTRACT ...")
	handler = await cm.registerContractLedger("0xf36446105fF682999a442b003f2224BcB3D82067", 13171333, "0xFa822d611e583A6fB879c03645dDfd1c8877252A")
	await handler.fetch()
	
})();

promptInput();