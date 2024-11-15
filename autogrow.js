const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs');

// Toggle for 'withAll': set to true for single execution, false for loop through growActionCount
const withAll = false; // Set to true for one-time execution, false for looping through growActionCount

// File to store tokens
const TOKEN_FILE = './tokensgrow.json';

// Constants
const REQUEST_URL = 'https://hanafuda-backend-app-520478841386.us-central1.run.app/graphql';
const REFRESH_URL = 'https://securetoken.googleapis.com/v1/token?key=AIzaSyDipzN0VRfTPnMGhQ5PSzO27Cxm3DohJGY';

// Store for multiple accounts
let accounts = [];

// Load tokens from file
function loadTokens() {
  if (fs.existsSync(TOKEN_FILE)) {
    try {
      const data = fs.readFileSync(TOKEN_FILE);
      const tokensData = JSON.parse(data);
      
      if (tokensData.refreshToken) {
        accounts = [{
          refreshToken: tokensData.refreshToken,
          authToken: tokensData.authToken
        }];
      } else {
        accounts = Object.values(tokensData);
      }
      
      printMessage(`Loaded ${accounts.length} accounts from file`, 'info');
    } catch (error) {
      printMessage(`Error loading tokens: ${error.message}`, 'error');
      process.exit(1);
    }
  } else {
    printMessage('Token file not found, please initialize tokens.', 'error');
    process.exit(1);
  }
}

// Save tokens to file
function saveTokens() {
  const tokensData = {};
  accounts.forEach(account => {
    tokensData[account.refreshToken] = account;
  });
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokensData, null, 2));
  printMessage('Tokens saved to file', 'success');
}

// GraphQL Payloads
const getGardenPayload = {
  operationName: "GetGardenForCurrentUser",
  query: `query GetGardenForCurrentUser {
    getGardenForCurrentUser {
      gardenStatus {
        growActionCount
      }
    }
  }`
};

const executeGrowActionPayload = {
  operationName: "ExecuteGrowAction",
  query: `mutation ExecuteGrowAction($withAll: Boolean) {
    executeGrowAction(withAll: $withAll) {
      baseValue
      leveragedValue
      totalValue
      multiplyRate
    }
  }`,
  variables: {
    withAll: withAll // Use the global toggle here
  }
};

const currentUserPayload = {
  operationName: "CurrentUser",
  query: `query CurrentUser {
    currentUser {
      id
      name
    }
  }`
};

// Refresh token for an account
async function refreshTokenHandler(account) {
  printMessage(`${account.userName || 'User'} Attempting to refresh token...`, 'info');
  try {
    const response = await axios.post(REFRESH_URL, null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken
      }
    });

    account.authToken = `Bearer ${response.data.access_token}`;
    account.refreshToken = response.data.refresh_token;
    saveTokens();
    printMessage(`${account.userName || 'User'} Token refreshed and saved successfully`, 'success');
    return true;
  } catch (error) {
    printMessage(`${account.userName || 'User'} Failed to refresh token: ${error.message}`, 'error');
    return false;
  }
}

async function getCurrentUserName(account) {
  try {
    printMessage(`Fetching current user data...`, 'info');

    const response = await axios.post(REQUEST_URL, currentUserPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': account.authToken,
      }
    });

    const userName = response.data?.data?.currentUser?.name;
    if (userName) {
      account.userName = userName; // Store username in account object
      return userName;
    } else {
      throw new Error('User name not found in response');
    }
  } catch (error) {
    printMessage(`${account.refreshToken} Error fetching current user data: ${error.message}`, 'error');
    return null;
  }
}

async function getLoopCount(account, retryOnFailure = true) {
  try {
    printMessage(`${account.userName || 'User'} Checking Grow Available...`, 'info');

    const response = await axios.post(REQUEST_URL, getGardenPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': account.authToken,
      }
    });

    const growActionCount = response.data?.data?.getGardenForCurrentUser?.gardenStatus?.growActionCount;
    if (typeof growActionCount === 'number') {
      printMessage(`${account.userName || 'User'} Grow Available: ${growActionCount}`, 'success');
      return growActionCount;
    } else {
      throw new Error('growActionCount not found in response');
    }
  } catch (error) {
    printMessage(`${account.userName || 'User'} Token Expired!`, 'error');

    if (retryOnFailure) {
      const tokenRefreshed = await refreshTokenHandler(account);
      if (tokenRefreshed) {
        return getLoopCount(account, false);
      }
    }
    return 0;
  }
}

async function processAccount(account) {
  await getCurrentUserName(account);
  
  const growActionCount = await getLoopCount(account);

  // Skip if growActionCount is 0
  if (growActionCount === 0) {
    printMessage(`${account.userName || 'User'} No grow actions available, skipping account.`, 'info');
    return; // Skip this account
  }

  // If withAll is true, execute the Grow Action once, else loop through growActionCount
  if (withAll) {
    printMessage(`${account.userName || 'User'} Executing Grow Action once...`, 'info');
    
    try {
      const response = await axios.post(REQUEST_URL, executeGrowActionPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': account.authToken,
        }
      });

      const result = response.data?.data?.executeGrowAction;
      if (result) {
        printMessage(`${account.userName || 'User'} Successfully executed the Grow Action:`, 'success');
        printMessage(`  Base Value: ${result.baseValue}`, 'success');
        printMessage(`  Leveraged Value: ${result.leveragedValue}`, 'success');
        printMessage(`  Total Value: ${result.totalValue}`, 'success');
        printMessage(`  Multiply Rate: ${result.multiplyRate}`, 'success');
      } else {
        printMessage(`${account.userName || 'User'} Failed to execute grow action`, 'error');
      }
    } catch (error) {
      printMessage(`${account.userName || 'User'} Error executing additional grow action: ${error.message}`, 'error');
    }
  } else {
    printMessage(`${account.userName || 'User'} Grow action count is greater than 300. Looping through grow actions...`, 'info');
    for (let i = 0; i < growActionCount; i++) {
      printMessage(`${account.userName || 'User'} Executing Grow Action ${i + 1}/${growActionCount}`, 'info');
      try {
        const response = await axios.post(REQUEST_URL, executeGrowActionPayload, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': account.authToken,
          }
        });

        const result = response.data?.data?.executeGrowAction;
        if (result) {
          printMessage(`${account.userName || 'User'} Grow Action ${i + 1} executed successfully:`, 'success');
          printMessage(`  Base Value: ${result.baseValue}`, 'success');
          printMessage(`  Leveraged Value: ${result.leveragedValue}`, 'success');
          printMessage(`  Total Value: ${result.totalValue}`, 'success');
          printMessage(`  Multiply Rate: ${result.multiplyRate}`, 'success');
        } else {
          printMessage(`${account.userName || 'User'} Failed to execute grow action ${i + 1}`, 'error');
        }
      } catch (error) {
        printMessage(`${account.userName || 'User'} Error executing grow action ${i + 1}: ${error.message}`, 'error');
      }
    }
  }
}

async function executeGrowActions() {
  while (true) {
    printMessage('Starting new round of grow actions for all accounts...', 'info');
    
    for (let account of accounts) {
      await processAccount(account);
    }

    printMessage('All accounts processed. Waiting 1 minute before next round...', 'info');
    await new Promise(resolve => setTimeout(resolve, 60000 * 5)); // 1-minute delay
  }
}

function printMessage(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  if (type === 'success') {
    console.log(chalk.green.bold(`[${timestamp}] ✔️  ${message}`));
  } else if (type === 'error') {
    console.log(chalk.red.bold(`[${timestamp}] ❌  ${message}`));
  } else {
    console.log(chalk.cyan(`[${timestamp}] ℹ️  ${message}`));
  }
}

function printHeader() {
  const line = "=".repeat(50);
  const title = "Multi-Account Auto Grow Hanafuda";
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

// Start the program
printHeader();
loadTokens();
executeGrowActions();
