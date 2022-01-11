
define([], function () {
		
	const manager = new LoginManager({
		signMsg: "Login To Pixelverse"
	});
	
	return manager;

});

class LoginManager {
    constructor(args) {
        this.config = args;
		this.web3 = new Web3()
        this.user = null;
    }
		
    async ConnectWallet(web3URL, callback, err) {
		
        let self = this;
		try {
					
			const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
			
			if (accounts.length > 0) {
					
				const ethAddress = accounts[0]
											
				const signature = await window.ethereum.request({ 
					method: 'personal_sign',
					params: [ethAddress, self.config.signMsg]
				});
				
				const recovered = await window.ethereum.request({ 
					method: 'personal_ecRecover',
					params: [self.config.signMsg, signature]
				});
				
				if (recovered == ethAddress) {
				
					self.config.userAddress = ethAddress;
					self.config.signature = signature;
										
					console.log('--------------------')
					console.log(`Obtaining NFTs owned by... ${self.config.userAddress}`)
					console.log('--------------------')
								
					let fetchUrl = web3URL + 'all/' + self.config.userAddress;
								
					await fetch(fetchUrl)
					  .then(response => response.text())
					  .then(data => { callback(self.config.userAddress, self.config.signature, data) })
					  .catch(error => err(error.code, error.message))
				}
				else
				{
					console.log("Something went wrong generating your signature.")
					
				}
				
			} else {
				err(-1, "You have no ethereum account selected.")
			}
		
          } catch (error) {
              const code = error.code;
              const message = error.message;
			  err(code, message);
          }
         
    }

}