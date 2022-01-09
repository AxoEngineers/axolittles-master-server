const Ledger = require('./ledger')
const axios = require('axios')

class StorefrontLedger extends Ledger {
	
	constructor(assetAddr) {
		super()
		
		this.assetAddr = assetAddr;
	}
	
	// SUPPORT ALL STOREFRONT APES HERE
	filterAsset(creator, assetName) {
		if (creator.address == "0xefe708e6dd941e29965f34f4c5c6e78f0ebe3f5b") { // 24 PX CREATOR ADDRESS
			if (assetName.startsWith("PixelCat ")) {
				return "SF_PX24_CAT:" + parseInt(assetName.replace("PixelCat ", ""));
			}
			else if (assetName.startsWith("PixelApe ")) {
				return "SF_PX24_APE:" + parseInt(assetName.replace("PixelApe ", ""));
			}
		}
	}
	
	async getOwnedNfts(addr) {
		const url = `https://api.opensea.io/api/v1/assets?asset_contract_address=${this.assetAddr}&format=json&limit=50&owner=${addr}`
		
		let res = await axios.get(url).catch(err => { return {}; });
		
		if (res.data) {
			if (res.data.assets) {
				let nfts = [];
				res.data.assets.forEach(asset => {
					let filtered = this.filterAsset(asset.creator, asset.name);
					if (filtered) {
						nfts.push(filtered)
					}
				})
				return nfts;
			}
		}
		
		return [];
		
	}
	
}

module.exports = StorefrontLedger