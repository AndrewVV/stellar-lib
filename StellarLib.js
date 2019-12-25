
const StellarSdk = require('stellar-sdk');
const stellarNode = 'https://horizon-testnet.stellar.org'
const network = StellarSdk.Networks.TESTNET; // or PUBLIC
let publicKey = 'GAFA2DTPT56Q3TIE3BVETLS2NZKKLFBP2FIMRICO3QKAV7DBKQ4IGDR7';
let secretKey = 'SBMYE7SYJOESVDBPCJV2KNPMYOFLJP666CQD4CJIRWPIHYWSTVYMFMKS';
let address = "GAUIWLTEFV6SU3PGIYQJUT2XTEFS2IMB3R2KRRCHUFRC54ZOBQDOFRZP";
let amountForSend = "1";
let memo = "MEMO_FOR_TEST";

class StellarLib {
	constructor(){
		this.server = new StellarSdk.Server(stellarNode);
		// for test
		// this.getBalanceXlm(publicKey);
		// this.changeTrust("HSS", "GAMJ7BSU4KMWMJTUHNYOAWYGNMXHMVHLBO2K45QHFSAWAFAELYYIIWKA", "1001")
		// this.sendTx(address, amountForSend, memo);
		this.getTransactionsInfo(publicKey)

	}

	changeTrust(ticker, issuer, limit){
		return new Promise(async(resolve,reject)=>{
    	    try{
				let receivingKeys = StellarSdk.Keypair.fromSecret(secretKey)
				let account = await this.server.loadAccount(publicKey);
				let fee = await this.server.fetchBaseFee();
				let token = new StellarSdk.Asset(ticker, issuer);
				let transaction = new StellarSdk.TransactionBuilder(account, { 
						fee,
						networkPassphrase: network
					})
					.addOperation(StellarSdk.Operation.changeTrust({
						asset: token,
						limit
					}))
					.setTimeout(100)
					.build();
				transaction.sign(receivingKeys);
				let result = await this.server.submitTransaction(transaction);
				let txHash = result.hash
				console.log("txHash", txHash)
				return resolve(txHash)
			}catch(e){
				return reject(e);
			}
		})
	}

    getBalanceXlm(address){
    	return new Promise(async(resolve,reject)=>{
    	    try{
				let data = await this.server.accounts().accountId(address).call();
				let balances = data.balances;
				console.log(balances)
				let balance = balances[balances.length-1].balance;
				console.log(balance)
				return resolve(balance)
    	    }catch(e){
    	        return reject(e);
    	    }
		})
	}
    
    getLastTxHash(address){
    	return new Promise(async(resolve,reject)=>{
    	    try{
				let result = await this.server.transactions().forAccount(address).order('desc').call()
				let txInfo = result.records[0].hash;
				console.log(txInfo)
				return resolve(txInfo)
    	    }catch(e){
    	        return reject(e);
    	    }
		})
	}
	
    getAmountPayment(hash){
    	return new Promise(async(resolve,reject)=>{
    	    try{
				let result = await this.server.payments().forTransaction(hash).call()
				// console.log(result.records[0])
				let amount;
				if(result.records[0].type == 'payment') amount = result.records[0].amount;
				console.log("amount",amount)
				return resolve(amount)
    	    }catch(e){
    	        return reject(e);
    	    }
		})
	}

	getTransactionsInfo(address, startPaginToken=0){
    	return new Promise(async(resolve,reject)=>{
    	    try{
				let result = [];
				let lastPagingToken = startPaginToken;
				let allTx = await this.server.transactions().forAccount(address).cursor(lastPagingToken).limit(100).order('asc').call()
				allTx = allTx.records;
				for(let txKey in allTx){
					let tx = allTx[txKey];
					let hash = tx.hash;
					let memo = tx.memo;
					let paging_token = tx.paging_token;
					console.log(hash)
					let amount = await this.getAmountPayment(hash);
					let txData = this.formatTxData(hash, amount, memo, paging_token);
					if(paging_token > lastPagingToken){
						lastPagingToken = paging_token;
					}
					result.push(txData)
				}
				console.log(result)
				return resolve(result)
    	    }catch(e){
    	        return reject(e);
    	    }
		})		
	}

	formatTxData(hash, amount, memo, pagingToken){
		let txData = {
			txHash: hash,
			amount: amount, 
			memo: memo,
			pagingToken: pagingToken
		};
		return txData;
	  }

    sendTx(address, amount, memo){
    	return new Promise(async(resolve,reject)=>{
    	    try{
				let result = await this.isActiveAccount(address)
				if(result == 200){
					let account = await this.server.loadAccount(this.publicKey);
					let fee = await this.server.fetchBaseFee();
					let source = StellarSdk.Keypair.fromSecret(this.secretKey)
					let ticker = "TXT"
					let issuer = "GAS5K2A4KSNRKYAV4TIWHNCWD3OMYGDMCA63QVULTH5U3HQ4R63HXT4W"
					let txtToken = new StellarSdk.Asset(ticker, issuer);
					let transaction = new StellarSdk.TransactionBuilder(account, { 
							fee,
							networkPassphrase: StellarSdk.Networks.TESTNET
						})
						.addOperation(StellarSdk.Operation.payment({
							destination: address,
							asset: txtToken,
							amount: amount,
						}))
						.setTimeout(100)
						.addMemo(StellarSdk.Memo.text(memo))
						.build();
					transaction.sign(source);
					transaction.toEnvelope().toXDR('base64');
					const transactionResult = await this.server.submitTransaction(transaction);
					let txHash = transactionResult.hash;
					console.log("txHash", txHash)
				}
				return resolve(txHash)
    	    }catch(e){
    	        return reject(e);
    	    }
		})
	}
	
    isActiveAccount(address){
    	return new Promise(async(resolve,reject)=>{
    	    try{
				let result = await this.server.accounts().accountId(address).call()
				if(result) {
					return resolve(200)
				}
    	    }catch(e){
    	        return resolve(e.response.status);
    	    }
		})
	}

	createAccount(){
		return new Promise(async(resolve,reject)=>{
    	    try{
				const pair = StellarSdk.Keypair.random()
				let data = {
					publicKey: pair.publicKey(),
					secretKey: pair.secret()
				}
				console.log(data)
				return resolve(data)
			}catch(e){
    	        return reject(e);
			}
		})
	}

	activateAccount(address, memo=''){
		return new Promise(async(resolve,reject)=>{
    	    try{
    	    	console.log(address)
				let account = await this.server.loadAccount(this.maxPublicKey);
				let fee = await this.server.fetchBaseFee();
				let source = StellarSdk.Keypair.fromSecret(this.maxSecretKey)
				let transaction = new StellarSdk.TransactionBuilder(account, { 
					fee,
					networkPassphrase: StellarSdk.Networks.TESTNET 
				})
  					.addOperation(StellarSdk.Operation.createAccount({
  				    	destination: address,
  				    	startingBalance: '5'
  				  	}))
  				  	.setTimeout(30)
  				  	.addMemo(StellarSdk.Memo.text(memo))
					.build();
  				transaction.sign(source);
				transaction.toEnvelope().toXDR('base64');
				const transactionResult = await this.server.submitTransaction(transaction);
				let result = transactionResult.hash;
				return resolve(result)
			}catch(e){
    	        return reject(e);
			}
		})
	}

		// getMemo(address){
    // 	return new Promise(async(resolve,reject)=>{
    // 	    try{
	// 			let result = await this.server.transactions().forAccount(address).order('desc').call()
	// 			console.log(result.records)
	// 			let txInfo = result.records[0].memo;
	// 			console.log(txInfo)
	// 			return resolve(txInfo)
    // 	    }catch(e){
    // 	        return reject(e);
    // 	    }
	// 	})
	// }

}

module.exports = StellarLib;
let stellarLib = new StellarLib()