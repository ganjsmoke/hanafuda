const Web3 = require('web3');
const chalk = require('chalk');
const readline = require('readline');
const fs = require('fs');

// Initialize web3 with the provided RPC URL
const RPC_URL = "https://mainnet.base.org";
const CONTRACT_ADDRESS = "0xC5bf05cD32a14BFfb705Fb37a9d218895187376c";

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

// Main function
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
        const gasPrice = await web3.eth.getGasPrice();

        const estimatedFee = parseFloat(web3.utils.fromWei((BigInt(gasLimit) * BigInt(gasPrice)).toString(), 'ether'));
		
		// Format the fee to a fixed-point notation (float)
        const formattedFee = estimatedFee.toFixed(10); // Adjust decimal places as needed

        console.log(`Estimated Transaction Fee: ${formattedFee} ETH`);

        if (estimatedFee >= 0.00000035) {
          console.log(chalk.red('Transaction fee too high. Waiting for gas price to decrease...'));
          await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds and retry
          i--; // Retry the same transaction
          continue;
        }

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
