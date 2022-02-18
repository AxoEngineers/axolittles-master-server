const fs = require('fs');
const config = require('./config')

const ContractLedger = require('./contracts/contractledger');
const StorefrontLedger = require('./contracts/storefrontledger');
const axios = require('axios');

async function getAxosOwned(address) {
    try {
	const response = await axios.get('https://axo-backend-pvj2l.ondigitalocean.app/axos?address=' + address);
	let axos = response['data']['axosOwned'];
	let axosWithAddress = []
	for (var i = 0; i < axos.length; i++) { 
		axosWithAddress.push(address.toUpperCase() + ':' + axos[i]);
	}
		//console.log(axosWithAddress);
		return axosWithAddress;
    } catch (error) {
		console.error(error);
		return []
    }
}


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
		return getAxosOwned(address);
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