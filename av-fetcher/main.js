const request = require('axios');
const fs = require('fs');

async function fetchSeal(id) {
	let results = await request.get("https://cloudflare-ipfs.com/ipfs/QmXUUXRSAJeb4u8p4yKHmXN1iAKtAV7jwLHjw35TNm5jN7/" + id)
	try {
		let json = results.data
		return json;
	} catch(err) {
		console.log(err)
		return {}
	}
}

(async function () {
	let sealDict = {}
	
	let fetched = 0;
	for (let i = 1; i <= 10000; i++) {
		sealDict[i] = await fetchSeal(i)
		fetched++;
		console.log(i)
	}
			
	fs.writeFile("seals.json", JSON.stringify(sealDict), function(err, result) {
		if(err) console.log('error', err);
	});
	
})();