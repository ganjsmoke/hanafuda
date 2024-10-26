
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
### Step 4A:  Create a `tokens.json` file with the initial tokens:
   ```json
   {
     "authToken": "your_initial_auth_token",
     "refreshToken": "your_initial_refresh_token"
   }
   ```
   ![Screenshot 2024-10-26 200754](https://github.com/user-attachments/assets/8e7d4d49-2f29-4c3a-8bd5-70092efe5c72)
  
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

# Grow Action Automation Script

This script automates the process of performing grow actions using a GraphQL-based backend service.

## Features

- **Token Management**: Automatically loads, refreshes, and saves authentication tokens for seamless operation.
- **Grow Action Execution**: Initiates and commits grow actions based on the available grow action count.
- **Current User Validation**: Fetches the current user's information and verifies the inviter ID before running the script.
- **Infinite Loop Monitoring**: Continuously monitors and executes grow actions based on availability.
- **GraphQL API Integration**: Uses multiple GraphQL queries and mutations for various functionalities.

## How It Works

1. **Token Initialization**: Loads the authentication token and refresh token from a local file (`tokens.json`). If the file doesn't exist, an error message is displayed.
2. **User Validation**: Fetches the current user data and checks if the inviter ID is `11210`. If it does not match, the script stops execution.
3. **Grow Action Loop**: Continuously checks for available grow actions (`growActionCount`). If available, it performs the actions in sequence.
4. **Token Refresh**: If a token expires, the script automatically refreshes it using the refresh token.
5. **Error Handling**: Provides error messages and stops execution when necessary.

## Prerequisites

- Node.js and npm installed
- The `axios`, `chalk`, and `fs` modules available via npm
- A valid GraphQL backend service

## Installation

1. Clone the repository or download the script files.
2. Install the necessary dependencies:
   ```bash
   npm install axios chalk
   ```

3. Create a `tokens.json` file with the initial tokens:
   ```json
   {
     "authToken": "your_initial_auth_token",
     "refreshToken": "your_initial_refresh_token"
   }
   ```
   ![Screenshot 2024-10-26 200754](https://github.com/user-attachments/assets/8e7d4d49-2f29-4c3a-8bd5-70092efe5c72)


## Usage

1. Run the script with Node.js:
   ```bash
   node autogrow.js
   ```

2. The script will automatically start monitoring grow actions and perform them when available.

## Configuration

- **Token File Location**: The default file location is `./tokens.json`. You can change it by modifying the `TOKEN_FILE` constant.
- **GraphQL Endpoints**: The endpoints for the requests can be updated by changing the `REQUEST_URL` and `REFRESH_URL` constants.

## Troubleshooting

- If the script shows "Token Expired," it may not be able to refresh the token. Ensure that the refresh token is valid.
- If you're not using my reffs, join to my channel

## Author
Bot created by: [https://t.me/airdropwithmeh](https://t.me/airdropwithmeh)
