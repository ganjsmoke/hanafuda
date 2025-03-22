const Web3 = require('web3');
const chalk = require('chalk');
const readline = require('readline');
const fs = require('fs');
const axios = require('axios');

// Initialize web3 with the provided RPC URL
const RPC_URL = "https://mainnet.optimism.io";
const CONTRACT_ADDRESS = "0xC5bf05cD32a14BFfb705Fb37a9d218895187376c";

// File to store tokens and auth data
const TOKEN_FILE = './tokendeposit.json';

// Constants
const REQUEST_URL = 'https://hanafuda-backend-app-520478841386.us-central1.run.app/graphql';
const REFRESH_URL = 'https://securetoken.googleapis.com/v1/token?key=AIzaSyDipzN0VRfTPnMGhQ5PSzO27Cxm3DohJGY';
const FEE_THRESHOLD = 0.00000030;  // Threshold in ETH

// Set up web3 instance
const web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));

// ABI for the depositETH function
const ABI = [
  {
    "constant": false,
    "inputs": [],
    "name": "depositETH",
    "outputs": [],
    "payable": true,
    "stateMutability": "payable",
    "type": "function"
  }
];

// Contract instance
const contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);

// Function to read user input from the console
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Read private keys from a text file
function readPrivateKeys() {
  try {
    const data = fs.readFileSync('private_keys.txt', 'utf8');
    return data.split('\n').map(key => key.trim()).filter(key => key.length > 0);
  } catch (error) {
    console.error('Error reading private keys:', error.message);
    process.exit(1);
  }
}

// Function to read the tokens from tokens.json
function getTokens() {
  try {
    const data = fs.readFileSync(TOKEN_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading tokens:', error.message);
    process.exit(1);
  }
}

// Function to save updated tokens to tokens.json
function saveTokens(tokens) {
  try {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
    console.log(chalk.yellow('Tokens updated successfully.'));
  } catch (error) {
    console.error(`Error saving tokens: ${error.message}`);
    process.exit(1);
  }
}

// Function to refresh the token
async function refreshTokenHandler() {
  const tokens = getTokens();
  console.log(chalk.yellow('Attempting to refresh token...'));
  try {
    const response = await axios.post(REFRESH_URL, null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken
      }
    });

    // Update tokens with new access and refresh tokens
    tokens.authToken = `Bearer ${response.data.access_token}`;
    tokens.refreshToken = response.data.refresh_token;
    saveTokens(tokens);  // Save updated tokens to file

    console.log(chalk.green('Token refreshed and saved successfully.'));
    return tokens.authToken;
  } catch (error) {
    console.error(`Failed to refresh token: ${error.message}`);
    return false;
  }
}

// Sync transaction with backend with retry mechanism
async function syncTransaction(txHash) {
  let tokens = getTokens();          // Fetch tokens from tokens.json
  const maxRetries = 4;              // Maximum number of retries
  const retryDelay = 5000;           // Delay between retries in milliseconds
  let authToken = tokens.authToken;  // Set initial authToken

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(
        REQUEST_URL,
        {
          query: `
            mutation SyncEthereumTx($chainId: Int!, $txHash: String!) {
              syncEthereumTx(chainId: $chainId, txHash: $txHash)
            }`,
          variables: {
            chainId: 10,  // Adjust based on your specific chain ID
            txHash: txHash
          },
          operationName: "SyncEthereumTx"
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken  // Include the authToken in headers
          }
        }
      );

      // Check if syncEthereumTx is true and break the loop if successful
      if (response.data && response.data.data && response.data.data.syncEthereumTx) {
        console.log(chalk.green(`Transaction ${txHash} successfully synced with backend.`));
        break;  // Exit the retry loop if sync is successful
      } else {
        throw new Error(`Sync response is null or unsuccessful.`);
      }

    } catch (error) {
      console.error(`Attempt ${attempt} - Error syncing transaction ${txHash}:`, error.message);

      // Refresh token on the third attempt
      if (attempt === 3) {
        console.log(chalk.yellow('Attempting to refresh token on the third try...'));
        
        const refreshedToken = await refreshTokenHandler();  // Refresh token
        if (refreshedToken) {
          authToken = refreshedToken;  // Update local authToken
          console.log(chalk.green('Token refreshed successfully. Retrying request with new token...'));
          attempt--;  // Decrement attempt to retry with the refreshed token
          continue; // Retry with the refreshed token immediately
        } else {
          console.error(chalk.red('Token refresh failed. Cannot retry further.'));
          break;
        }
      }

      // If not the last attempt, retry after a delay
      console.log(`Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));  // Wait before retrying
    }
  }
}

// Waits until the transaction fee is below the defined threshold in Ether
async function waitForLowerFee(gasLimit) {
  let gasPrice, txnFeeInEther;
  do {
    gasPrice = await web3.eth.getGasPrice();
    const txnFee = gasPrice * gasLimit;  // Transaction fee in Wei
    txnFeeInEther = web3.utils.fromWei(txnFee.toString(), 'ether');  // Convert txn fee to Ether

    if (parseFloat(txnFeeInEther) > FEE_THRESHOLD) {
      console.log(`Current transaction fee: ${txnFeeInEther} ETH, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 5000));  // Wait 5 seconds before checking again
    }
  } while (parseFloat(txnFeeInEther) > FEE_THRESHOLD);

  console.log(`Acceptable transaction fee detected: ${txnFeeInEther} ETH`);
  return gasPrice;  // Return acceptable gas price
}

// Execute transactions for all wallets
async function executeTransactionsForAllWallets(privateKeys, numTx, amountInEther) {
  for (const privateKey of privateKeys) {
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const address = account.address;

    console.log(chalk.blue(`Processing transactions for wallet: ${address}`));
    await executeTransactions(privateKey, numTx, amountInEther);
  }
  console.log('All wallets processed.');
}

// Function to execute transactions for a single wallet
async function executeTransactions(privateKey, numTx, amountInEther) {
  try {
    const amountInWei = web3.utils.toWei(amountInEther, 'ether');
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);
    const fromAddress = account.address;

    for (let i = 0; i < numTx; i++) {
      try {
        const currentNonce = await web3.eth.getTransactionCount(fromAddress, 'pending');
        const gasLimit = await contract.methods.depositETH().estimateGas({ from: fromAddress, value: amountInWei });

        // Wait until transaction fee is below the threshold before proceeding
        const gasPrice = await waitForLowerFee(gasLimit);

        const tx = {
          from: fromAddress,
          to: CONTRACT_ADDRESS,
          value: amountInWei,
          gas: gasLimit,
          gasPrice: gasPrice,
          nonce: currentNonce,
          data: contract.methods.depositETH().encodeABI()
        };

        const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        console.log(`Transaction ${i + 1} successful with hash: ${receipt.transactionHash}`);

        // Sync transaction with backend
        await syncTransaction(receipt.transactionHash);

      } catch (txError) {
        console.error(`Error in transaction ${i + 1}:`, txError.message);
        console.log(`Retrying transaction ${i + 1}...`);
        i--;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    console.log(`Transactions for wallet ${fromAddress} completed.`);
  } catch (error) {
    console.error(`Error executing transactions for wallet: ${error.message}`);
  }
}

// Main function and other code remains the same
async function main() {
  try {
    const privateKeys = readPrivateKeys();

    if (privateKeys.length === 0) {
      console.log('No private keys found in private_keys.txt. Exiting...');
      process.exit(1);
    }

    rl.question('Enter the number of transactions: ', async (txCount) => {
      const numTx = parseInt(txCount);

      if (isNaN(numTx) || numTx <= 0) {
        console.log('Invalid number of transactions. Exiting...');
        rl.close();
        return;
      }

      rl.question('Do you want to use the default amount of 0.0000000000001 ETH? (y/n): ', async (useDefault) => {
        let amountInEther = '0.0000000000001';

        if (useDefault.toLowerCase() !== 'y') {
          rl.question('Enter the amount of ETH to send: ', (amount) => {
            if (!isNaN(parseFloat(amount)) && parseFloat(amount) > 0) {
              amountInEther = amount;
            } else {
              console.log('Invalid amount entered. Using the default amount.');
            }
            rl.close();
            executeTransactionsForAllWallets(privateKeys, numTx, amountInEther);
          });
        } else {
          rl.close();
          executeTransactionsForAllWallets(privateKeys, numTx, amountInEther);
        }
      });
    });
  } catch (error) {
    console.error('Error:', error);
    rl.close();
  }
}

// Header for display
function printHeader() {
  const line = "=".repeat(50);
  const title = "Auto Deposit Hanafuda";
  const createdBy = "Bot created by: https://t.me/airdropwithmeh";

  const totalWidth = 50;
  const titlePadding = Math.floor((totalWidth - title.length) / 2);
  const createdByPadding = Math.floor((totalWidth - createdBy.length) / 2);

  const centeredTitle = title.padStart(titlePadding + title.length).padEnd(totalWidth);
  const centeredCreatedBy = createdBy.padStart(createdByPadding + createdBy.length).padEnd(totalWidth);

  console.log(chalk.cyan.bold(line));
  console.log(chalk.cyan.bold(centeredTitle));
  console.log(chalk.green(centeredCreatedBy));
  console.log(chalk.cyan.bold(line));
}

// Run the main function
printHeader();
main();
