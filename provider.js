const Web3 = require('web3');

const options = {
	timeout: 30000, // ms
	
	reconnect: {
	  auto: true,
	  delay: 5000,
	  maxAttempts: 10,
	  onTimeout: false,
	},

	clientConfig: {
		// Useful to keep a connection alive
		keepalive: true,
		keepaliveInterval: 60000, // ms
		maxReceivedFrameSize: 100000000,
		maxReceivedMessageSize: 100000000
	}
};

class Web3Manager
{
	constructor() {
		this.provider = new Web3.providers.WebsocketProvider("wss://mainnet.infura.io/ws/v3/eec17b9b88db492b91c9a6fe679dabf8", options)
		this.web3 = new Web3(this.provider)
		this.provider.on('error', e => console.log('WS Error', e))
	}
}

var instance = new Web3Manager();

module.exports = instance;