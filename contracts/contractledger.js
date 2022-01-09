const config = require('../config');
const provider = require('../provider');
const Ledger = require('./ledger')
const fs = require('fs')
		
const eventUpdateTimerMin = 5;  
const maxBlockInterval = 100000

class ContractLedger extends Ledger {
	
    constructor(contractAddr, contractAbi, genesis, stakingAddr) {
		super();
		
		// HOLD THE DIRECT REFERENCES TO EACH ADDRESS IN HERE
		this.tokenLedger = {}
		this.stakedLedger = {}
		
		// SEE WHO OWNS OR IS STAKING A SPECIFIC NFT ID
		this.addressLedger = {}
		this.addressStakedLedger = {}
			
		// IMPORTANT VARIABLES FOR WEB3
		this.contractAbi = contractAbi;
		this.contractAddr = contractAddr;
		this.stakingAddr = stakingAddr ? stakingAddr.toUpperCase() : undefined;
		this.genesis = genesis;		
		this.contract = new provider.web3.eth.Contract(this.contractAbi, this.contractAddr);
		this.latestBlockNumber = -1
		
		// CACHING
		this.cacheFilePath = __dirname + `/../cache/${this.contractAddr}.json`;
		const doesCacheExist = fs.existsSync(this.cacheFilePath);
		this.cacheData = doesCacheExist ? JSON.parse(fs.readFileSync(this.cacheFilePath)) : {
			version: 1.00,
			genesis: this.genesis,
			indices: []
		};
		
		// NO NEED TO GO IN THE PAST WE'VE ALREADY BEEN THROUGH IT BEFORE
		if (doesCacheExist) {
			this.addressStakedLedger = this.cacheData.addressStakedLedger;
			this.addressLedger = this.cacheData.addressLedger;
			this.tokenLedger = this.cacheData.addressStakedLedger;
			this.stakedLedger = this.cacheData.stakedLedger;
			this.latestBlockNumber = this.cacheData.latestBlockNumber
		}			
		
		// TIMERS
		if (genesis) {
			this.updateTimer = setInterval(this.fetch.bind(this), 60000 * eventUpdateTimerMin)
		}
		
		this.updating = false
    }
		
	async fetch() {
		if (this.updating) { // already updating
			// console.log("[" + this.contractAddr + "]: BLOCKCHAIN IS BUSY UPDATING...")
			return;
		}
		
		this.updating = true
		
		const latestBlock = await provider.web3.eth.getBlock("latest")	

		if (this.latestBlockNumber >= latestBlock.number) { // dont update if we've already caught up
			// console.log("[" + this.contractAddr + "]: BLOCKCHAIN IS ALREADY UPDATE TO DATE...")
			this.updating = false
			return;
		}
				
		if (this.latestBlockNumber == -1) { // first time, we do search from genesis
			this.latestBlockNumber = this.genesis - 1;
		}
				
		// console.log("[" + this.contractAddr + "]: CATCHING UP TO THE BLOCKCHAIN...")
		let pastEvents = await this.getPastEventsFromBlock(this.contract, this.latestBlockNumber + 1, latestBlock.number)
								
		pastEvents.forEach(event => {
			this.handleEvent(event, config.env == "local")
		});
		
		this.latestBlockNumber = latestBlock.number
		this.updating = false
		
		// CACHE INDEX BUILDING, HERE WE STORE ALL TRACKED LEDGER STUFF
		
		this.cacheData.addressStakedLedger = this.addressStakedLedger;
		this.cacheData.addressLedger = this.addressLedger;
		this.cacheData.tokenLedger = this.addressStakedLedger;
		this.cacheData.stakedLedger = this.stakedLedger;
		this.cacheData.latestBlockNumber = this.latestBlockNumber
		
		try {
			fs.writeFileSync(this.cacheFilePath, JSON.stringify(this.cacheData), { encoding:'utf8', flag: 'w' });
		} catch {
			console.log(`could not save cache index to ${this.cacheFilePath}`)
		}
		
		// END OF CACHE INDEX BUILDER
		
		console.log("[" + this.contractAddr + "]: CAUGHT UP TO THE BLOCKCHAIN... NUM OF PAST EVENTS: " + pastEvents.length)
	}
	
	// STAKE CONTRACT
	unsetStake(addr, nftId) {
		let eth_address = addr.toUpperCase()
		
		delete this.stakedLedger[nftId]
		
		if (this.addressStakedLedger[eth_address] != undefined)
		{
			const index = this.addressStakedLedger[eth_address].indexOf(nftId);
			if (index > -1) {
				this.addressStakedLedger[eth_address].splice(index, 1);
			}
			
			if (this.addressStakedLedger[eth_address].length == 0) {
				delete this.addressStakedLedger[eth_address]
			}
		}
	}
	
	setStake(addr, nftId) {
		let eth_address = addr.toUpperCase()
		
		this.stakedLedger[nftId] = addr;
				
		if (this.addressStakedLedger[eth_address] == undefined) {
			this.addressStakedLedger[eth_address] = [nftId]
		} else {
			this.addressStakedLedger[eth_address].push(nftId)
		}
	}
	
	// NORMAL CONTRACT
	
	unsetOwner(addr, nftId) {
		let eth_address = addr.toUpperCase()
		
		if (this.addressLedger[eth_address] != undefined)
		{
			const index = this.addressLedger[eth_address].indexOf(nftId);
			if (index > -1) {
				this.addressLedger[eth_address].splice(index, 1);
			}
			
			if (this.addressLedger[eth_address].length == 0) {
				delete this.addressLedger[eth_address]
			}
		}
	}
	
	setOwner(addr, nftId) {
		let eth_address = addr.toUpperCase()
		
		if (this.addressLedger[eth_address] == undefined) {
			this.addressLedger[eth_address] = [nftId]
		} else {
			this.addressLedger[eth_address].push(nftId)
		}
	}
	
	handleEvent(event, logEvent) {
		let blockNumber = parseInt(event['blockNumber'])
		let tokenId = parseInt(event['returnValues']['tokenId'])
		let sender = event['returnValues']['from'].toUpperCase()
		let recipient = event['returnValues']['to'].toUpperCase()
				
		// controls the owners array
		this.unsetOwner(sender, tokenId)
		this.setOwner(recipient, tokenId)
		
		// direct token ledger array which has the owner in
		this.tokenLedger[tokenId] = recipient
		
		if (this.stakingAddr) {
						 
			if (sender == this.stakingAddr) {
				this.unsetStake(recipient, tokenId)
				if (logEvent) {
					console.log(`[UNSTAKE] ${tokenId} -> ${recipient}`)
				}
			}
			else if (recipient == this.stakingAddr) {
				this.setStake(sender, tokenId)
				if (logEvent) {
					console.log(`[STAKE] ${tokenId} <- ${sender}`)
				}
			}
			
		}
		
		if (logEvent) {
			console.log(`[TRANSFER] ${tokenId}: ${sender} -> ${recipient}`)
		}
	} 
	
	filterDict(query, nftDict) {
		let addrArr = {}
		
		// (a1) criteria functions, all we need to return true in order to pass
		// must also santize input in (a2)
		let criteriaFunc = [
			["min", (n, q) => n.length >= q.min],
			["max", (n, q) => n.length <= q.max]
		]
		
		for (const [addr, nfts] of Object.entries(nftDict)) {
			
			let meetsCriteria = false
			
			for (let func of criteriaFunc) {
				if (query[func[0]] != -1) {
					meetsCriteria = func[1](nfts, query)
					if (!meetsCriteria)
						break;
				}
			}
						
			if (meetsCriteria) {
				addrArr[addr] = [...nfts]
			}
		}
		
		return addrArr
	}
	
	filter(query) {
		let mergedDict = {}
		let targetArr = [this.addressLedger, this.addressStakedLedger]
		
		// (a2) input sanitization for queries
		let queryParsed = {}
		queryParsed["min"] = query.min ? (!isNaN(parseInt(query.min)) ? parseInt(query.min) : -1) : -1;
		queryParsed["max"] = query.max ? (!isNaN(parseInt(query.max)) ? parseInt(query.max) : -1) : -1;

		targetArr.forEach( dict => {	
			for (const [addr, nfts] of Object.entries(this.filterDict(queryParsed, dict))) {
				mergedDict[addr] = mergedDict[addr] ? [...mergedDict[addr], ...nfts] : nfts
			}
		})
		
		return mergedDict
	}
	
	getUnstakedNfts(addr) {
		let eth_address = addr.toUpperCase()
				
		if (this.addressLedger[eth_address] == undefined) {
			return []
		} else {
			return this.addressLedger[eth_address]
		}
	}
	
	getStakedNfts(addr) {	
		if (!this.stakingAddr) return []; // staking disabled so return empty
		
		let eth_address = addr.toUpperCase()
				
		if (this.addressStakedLedger[eth_address] == undefined) {
			return []
		} else {
			return this.addressStakedLedger[eth_address]
		}
	}
	
	getOwnedNfts(addr) {
		return [...this.getUnstakedNfts(addr), ...this.getStakedNfts(addr)]
	}
	
	// PIXEL ITEM
	
	balancesOf(address, itemArr) {
		try {			
			let itemIds = JSON.parse(itemArr)
			if (!provider.web3.utils.isAddress(address))
				return {}
		
			return new Promise((resolve, reject) => {
				let addressArr = []
				for (let i = 0; i < itemIds.length; i++) {
					addressArr.push(address)
				}
				
				let outArr = []
				
				this.contract.methods.balanceOfBatch(addressArr, itemIds).call(function (err, res) {
					if (err) {
						//console.log(err);
						reject(err)
					}
					
					let i=0;
					res.forEach(quantity => {
						outArr.push({ "id": itemIds[i++], "quantity": quantity });
					})
					
					resolve(outArr)
				})
			});
		} catch {
			return {};
		}
	}
	
	// EVENT STUFF
	
	async getPastEventsFromBlock(contract, startBlock, latestBlock) {
		let arr = []
		let currBlock = startBlock;		
		
		const useIndexCache = this.cacheData.indices.length > 0;
		let currentIndex = !useIndexCache ? 0 : this.cacheData.indices.length;
		
		while (currBlock < latestBlock) {
			process.stdout.write(`${Math.round(latestBlock - currBlock)} blocks left.. `)
						
			let maxIntervalAllowed = useIndexCache && currentIndex < this.cacheData.indices.length ? this.cacheData.indices[currentIndex++] : maxBlockInterval;
			let page = await this.getPastEvents(contract, currBlock, maxIntervalAllowed)
			let newCurrBlock = page[0] // the new current block to switch to
			let pageTokenArr = page[1] // page token array list
			
			if (pageTokenArr) {
				arr = [...arr, ...pageTokenArr]
				currBlock += newCurrBlock
			}
		}
		console.log("Finished fetching past events.")
		
		return arr;
	}
	
	async getPastEvents(contract, currBlock, interval) {
		try {
			let results = await contract.getPastEvents("Transfer", {
				fromBlock: currBlock, 
				toBlock: currBlock + interval
			})
			
			this.cacheData.indices.push(interval)
			
			console.log(`DONE. ` + interval)
			return [interval + 1, results]
		}
		catch (error) {
			if (error.message.includes("query returned more than 10000 results")) {
				let newInterval = Math.max(1, Math.ceil(interval / 2))
				process.stdout.write(`${newInterval}.. `);
				return this.getPastEvents(contract, currBlock, newInterval)
			} else if (error.message.includes("query timeout exceeded")){ 
				return this.getPastEvents(contract, currBlock, interval)
			} else {
				// something very bad went wrong here
				console.log(error) 
				return [interval + 1, []];
			}
		}
	}
	
	async saveToFile() {
		fs.writeFile(
			`./${this.contractAddr}.json`,
			JSON.stringify(this.addressLedger),
			function (err) {
				if (err) {
					console.error('Failed to save');
				} else {
					console.log(`Saved to ${this.contractAddr}.json`)
				}
			}.bind(this)
		);
	}
	
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = ContractLedger;