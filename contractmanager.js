const fs = require('fs');
const config = require('./config')

const ContractLedger = require('./contracts/contractledger');
const StorefrontLedger = require('./contracts/storefrontledger');

class ContractManager
{
	constructor() {
		this.contracts = {}
	}
		
	// contracts that dont require events
	async createStaticContracts() {
		
	}
		
	async getOwnedByFilter(contractAddress, query) {
		let contract = this.getContract(contractAddress);
		if (contract && contract.filter) { return contract.filter(query) }
		return [];
	}
		
	async getAllOwnedNfts(address) {
		let nftsOwned = [];
		
		for (const [contractAddr, contract] of Object.entries(this.contracts)) {
			let localAddrs = []
			let ownedNfts = await contract.getOwnedNfts(address)
			ownedNfts.forEach(nft => {
				localAddrs.push(typeof nft === 'string' && nft.startsWith("SF_") ? `${nft}` : `${contractAddr}:${nft}`)
			})
			nftsOwned = [...nftsOwned, ...localAddrs]
		}

		return nftsOwned;
	}
	
	async getOwnedNfts(contractAddress, address) {
		let contract = this.getContract(contractAddress);
		if (contract && contract.getOwnedNfts) { return contract.getOwnedNfts(address) }
		return [];
	}
	
	async getUnstakedNfts(contractAddress, address) {
		let contract = this.getContract(contractAddress);
		if (contract && contract.stakingAddr && contract.getUnstakedNfts) { return contract.getUnstakedNfts(address) }
		return [];
	}
	
	async getStakedNfts(contractAddress, address) {
		let contract = this.getContract(contractAddress);
		if (contract && contract.stakingAddr && contract.getStakedNfts) { return contract.getStakedNfts(address) }
		return [];
	}
		
	async getItemBalancesOf(ethAddress, itemIds) {
		let contract = this.getContract(config.contracts.pixelitem);
		if (contract && contract.balancesOf) { return contract.balancesOf(ethAddress, itemIds) }
		return 0;
	}
	
	async registerStorefrontLedger() {
		let eth_address = config.contracts.storefront.toUpperCase()
		let ledger = new StorefrontLedger(eth_address)
		this.contracts[eth_address] = ledger;
		return ledger;
	}
	
	async registerContractLedger(smartContractAddr, genesis, stakingContractAddr) {
		let eth_address = smartContractAddr.toUpperCase()
		
		return new Promise( (function(resolve, reject) {
			fs.readFile(`abi/${eth_address}.abi`, 'utf8', (async function(err, abiData) {
				if (err) { reject(err); return; }
				let ledger = new ContractLedger(eth_address, JSON.parse(abiData), genesis, stakingContractAddr)
				this.contracts[eth_address] = ledger;
				resolve(ledger);
			}).bind(this) );
		}).bind(this) );
	}
	
	getContract(contractAddr) {
		return this.contracts[contractAddr.toUpperCase()];
	}
	
	getKeys() {
		return Object.keys(this.contracts)
	}
}

var instance = new ContractManager()

module.exports = instance;