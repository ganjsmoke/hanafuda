
# Auto Deposit Hanafuda Bot

This project is an automated Ethereum transaction bot to perform multiple deposits to a smart contract using multiple wallets. The bot reads private keys from a text file and sends transactions according to the user-defined amount and number of repetitions.

## Features
- **Multi-wallet Support:** Reads multiple private keys from `private_keys.txt` to process transactions.
- **Customizable ETH Amount:** Users can set a custom amount of ETH or use the default value.
- **Automatic Transaction Retrying:** Automatically retries transactions if they fail.
- **Detailed Logs:** Displays each wallet's address and transaction hash for better tracking.
- **Secure Key Handling:** Only the wallet addresses are printed, private keys are kept secure in memory.

## Requirements
- Node.js installed on your machine.

## Getting Started

### Step 1: Clone the Repository
Open your terminal and run the following command to clone this repository:
```
git clone https://github.com/ganjsmoke/hanafuda.git
```

### Step 2: Navigate to the Project Directory
```
cd hanafuda
```


### Step 3: Install Dependencies
Run the following command to install the required packages:
```
npm install web3@1.8.0 chalk@2
```

### Step 4: Add Private Keys
- Create a file named `private_keys.txt` in the project directory.
- Add your private keys, one per line. Example:
  ```
  0xabc123...
  0xdef456...
  ```
  
### Step 5: Run the Bot
Use the following command to start the bot:
```
node index.js
```

### Step 6: Input Parameters
- Enter the number of transactions you want to perform.
- Choose whether to use the default ETH amount or enter a custom value.

### Example Output
```
Processing transactions for wallet: 0x1234abcd...
Transaction 1 successful with hash: 0xabc123...
All wallets processed.
```

## Troubleshooting
- **Error: No private keys found:** Make sure you have created the `private_keys.txt` file and added the private keys.
- **Gas estimation error:** Ensure that the contract address and ABI are correct.
- **Connection issues:** Verify that the RPC URL is reachable and valid.


## Author
Bot created by: [https://t.me/airdropwithmeh](https://t.me/airdropwithmeh)
