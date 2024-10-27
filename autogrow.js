const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs');

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

const initiatePayload = {
  operationName: "issueGrowAction",
  query: `mutation issueGrowAction {
    issueGrowAction
  }`
};

const commitPayload = {
  operationName: "commitGrowAction",
  query: `mutation commitGrowAction {
    commitGrowAction
  }`
};

const currentUserPayload = {
  operationName: "CurrentUser",
  query: `query CurrentUser {
    currentUser {
      id
      name
      inviter {
        id
      }
    }
  }`
};

// Function to check inviter ID
async function getInviterID(account) {
  try {
    printMessage(`Fetching current user data...`, 'info');

    const response = await axios.post(REQUEST_URL, currentUserPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': account.authToken,
      }
    });

    const inviterID = response.data?.data?.currentUser?.inviter?.id;
    if (inviterID) {
      account.inviterID = inviterID; // Store inviterID in account object

      if (inviterID !== 11210) {
        printMessage("You didn't use my referral; I'm so sad 😢. t.me/airdropwithmeh.", 'error');
        process.exit(1); // Stop the bot
      }

      return inviterID;
    } else {
      throw new Error('Inviter ID not found in response');
    }
  } catch (error) {
    printMessage(`${account.refreshToken} Error fetching current user data: ${error.message}`, 'error');
    return null;
  }
}

// Function to refresh token for a specific account
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
    printMessage(`${account.refreshToken} Fetching current user data...`, 'info');

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

async function initiateGrowAction(account) {
  try {
    printMessage(`${account.userName || 'User'} Initiating Grow...`, 'info');
    
    const response = await axios.post(REQUEST_URL, initiatePayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': account.authToken,
      }
    });

    const result = response.data;
    if (result.data && result.data.issueGrowAction) {
      printMessage(`${account.userName || 'User'} Grow Success, Points: ${result.data.issueGrowAction}`, 'success');
      return result.data.issueGrowAction;
    } else {
      printMessage(`${account.userName || 'User'} Grow Failed`, 'error');
      return 0;
    }
  } catch (error) {
    printMessage(`${account.userName || 'User'} Error executing grow: ${error.message}`, 'error');
    return 0;
  }
}

async function commitGrowAction(account) {
  try {
    printMessage(`${account.userName || 'User'} Committing Grow...`, 'info');

    const response = await axios.post(REQUEST_URL, commitPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': account.authToken,
      }
    });

    const result = response.data;
    if (result.data && result.data.commitGrowAction) {
      printMessage(`${account.userName || 'User'} Commit Success`, 'success');
      return result.data.commitGrowAction;
    } else {
      printMessage(`${account.userName || 'User'} Commit Failed`, 'error');
      return false;
    }
  } catch (error) {
    printMessage(`${account.userName || 'User'} Error committing grow: ${error.message}`, 'error');
    return false;
  }
}

async function processAccount(account) {
  // Fetch or check inviter ID
  await getInviterID(account);

  // Get or refresh username
  await getCurrentUserName(account);

  const loopCount = await getLoopCount(account);
  if (loopCount > 0) {
    let totalResult = 0;

    for (let i = 0; i < loopCount; i++) {
      printMessage(`${account.userName || 'User'} Starting Grow ${i + 1}/${loopCount}`, 'info');
      const initiateResult = await initiateGrowAction(account);
      totalResult += initiateResult;

      const commitResult = await commitGrowAction(account);
      if (commitResult) {
        printMessage(`${account.userName || 'User'} Commit Grow ${i + 1} was successful.`, 'success');
      } else {
        printMessage(`${account.userName || 'User'} Commit Grow ${i + 1} failed.`, 'error');
      }
    }

    printMessage(`${account.userName || 'User'} All grow actions completed. Total Result: ${totalResult}`, 'success');
  } else {
    printMessage(`${account.userName || 'User'} No grow actions available.`, 'info');
  }
}

async function executeGrowActions() {
  while (true) {
    printMessage('Starting new round of grow actions for all accounts...', 'info');
    
    for (let account of accounts) {
      await processAccount(account);
    }

    printMessage('All accounts processed. Waiting 10 minutes before next round...', 'info');
    await new Promise(resolve => setTimeout(resolve, 60000 * 10)); // 10-minute delay
  }
}

function printMessage(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  let formattedMessage;

  if (type === 'success') {
    formattedMessage = chalk.green.bold(`[${timestamp}] SUCCESS: ${message}`);
  } else if (type === 'error') {
    formattedMessage = chalk.red.bold(`[${timestamp}] ERROR: ${message}`);
  } else {
    formattedMessage = chalk.cyan(`[${timestamp}] INFO: ${message}`);
  }

  console.log(formattedMessage);
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
