const fs = require('fs');
const request = require('axios');
const https = require('https');
var gm = require('gm');

async function fetchAndSave(id) {
	let results = await request.get("https://api.opensea.io/api/v1/asset/0xf36446105ff682999a442b003f2224bcb3d82067/" + id  +"?format=json")
	try {
		let json = results.data
				
		return new Promise((resolve, reject) => {
			
			if (json.image_thumbnail_url == undefined) {
				reject(id);
				return;
			}
			
			https.get(json.image_thumbnail_url, function(response) {
				gm(response)
				.selectFrame(0)
				.write('images/' + id + '.png', function(err) {
					if (err) { console.log(err); reject(id); }
				});
				resolve(id);
			});
		});
	} catch(err) {
		console.log(err)
		return {}
	}
}

(async function () {
	
	let index = 0;
	let completed = 0;
	
	for (let i = 1; i <= 10000; i++) {		
		if (fs.existsSync("images/" + i + ".png")) {
			continue;
		}
		index++;
	
		fetchAndSave(i).then(id => {
			completed++;
			console.log(completed + `(${id})`);
		}).catch(id => {
			console.log(" could not get " + id );
			completed++;
		});
		
		if (index % 10 == 0) {
			console.log("waiting... ");
			await new Promise((resolve, reject) => {
				let timer = setInterval(function () { 
					if (completed >= index) {
						console.log("done... ");
						clearInterval(timer);
						resolve();
					}
				}, 1000);
			});
		}
	}
	
	await new Promise((resolve, reject) => {
		let timer = setInterval(function () { 
			if (completed >= index) {
				console.log("done... ");
				clearInterval(timer);
				resolve();
				}
			}, 1000);
		});
	
})();