
# Multi-Account Auto Grow Hanafuda Bot

This is a Node.js bot designed to automate grow actions across multiple accounts on the Hanafuda platform. It refreshes tokens, initiates and commits grow actions, and manages authentication tokens with built-in error handling.

---

## Features

- **Multi-Account Management**: Supports multiple accounts stored in a `tokensgrow.json` file.
- **Automated Token Refreshing**: Automatically refreshes tokens when expired.
- **Sequential Execution of Grow Actions**: Executes grow actions for each account in sequence.
- **Detailed Logging**: Uses color-coded logs for easy identification of errors, successes, and information messages.

---

## Prerequisites

- **Node.js** (version 12 or higher)
- **npm** (Node package manager)
- Install dependencies with:
  ```bash
  npm install axios chalk
  ```

---

## Setup

1. Clone the repository:

    ```bash
    git clone https://github.com/ganjsmoke/hanafuda.git
    cd hanafuda
    ```

2. Install required dependencies:

    ```bash
    npm install
    ```

3. Create `tokensgrow.json` in the root directory, formatted as follows:

    ```json
    {
      "refresh_token_1": {
        "refreshToken": "your_refresh_token_1",
        "authToken": "Bearer your_auth_token_1"
      },
      "refresh_token_2": {
        "refreshToken": "your_refresh_token_2",
        "authToken": "Bearer your_auth_token_2"
      }
    }
    ```

4. Run the bot:

    ```bash
    node index.js
    ```

---

## Usage

- The bot will start processing all accounts from `tokensgrow.json`.
- It refreshes tokens as needed and executes grow actions in sequential order.
- Logs will display each account's progress and actions with colored messages.


## Troubleshooting

- **Token file not found**: Ensure `tokensgrow.json` is in the root directory and properly formatted.
- **Token Expired**: The bot will attempt to refresh the token and continue.

---



### Created by [https://t.me/airdropwithmeh]

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
     "authToken": "Bearer your_initial_auth_token",
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

## Author
Bot created by: [https://t.me/airdropwithmeh](https://t.me/airdropwithmeh)
