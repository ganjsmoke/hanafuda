const axios = require('axios');
const fs = require('fs');
const chalk = require('chalk');

// File and URL Constants
const ACCOUNT_FILE = 'tokensgrow.json';
const REFRESH_URL = 'https://securetoken.googleapis.com/v1/token?key=AIzaSyDipzN0VRfTPnMGhQ5PSzO27Cxm3DohJGY';
const REQUEST_URL = 'https://hanafuda-backend-app-520478841386.us-central1.run.app/graphql';

// User-Agent string
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

// Function to display colored messages with timestamp
function printMessage(message, type = 'info') {
  if (type === 'success') {
    console.log(chalk.green.bold(`✔️  ${message}`));
  } else if (type === 'error') {
    console.log(chalk.red.bold(`❌  ${message}`));
  } else {
    console.log(chalk.cyan(`ℹ️  ${message}`));
  }
}

// Load accounts from the autogrows.json file
function loadAccounts() {
  if (fs.existsSync(ACCOUNT_FILE)) {
    const data = fs.readFileSync(ACCOUNT_FILE, 'utf8');
    return JSON.parse(data);
  } else {
    printMessage('Account file not found.', 'error');
    return {};
  }
}

// Save updated accounts to the JSON file
function saveAccounts(accounts) {
  fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(accounts, null, 2));
  printMessage('Account file updated with new tokens.', 'success');
}

// Function to refresh the token and update the JSON file
async function refreshTokenHandler(account, userName, accounts) {
  printMessage(`Attempting to refresh token for ${userName}...`, 'info');
  try {
    const response = await axios.post(REFRESH_URL, null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken
      }
    });

    // Update tokens in the account object
    account.authToken = `Bearer ${response.data.access_token}`;
    account.refreshToken = response.data.refresh_token;

    // Save the updated tokens to the JSON file
    saveAccounts(accounts);

    printMessage(`Token refreshed successfully for ${userName}`, 'success');
    return true;
  } catch (error) {
    printMessage(`Failed to refresh token for ${userName}: ${error.message}`, 'error');
    return false;
  }
}

// Function to execute the get Hanafuda list action using axios
async function getHanafudaList(account, userName, accounts) {
  printMessage(`Fetching Hanafuda list for ${userName}...`, 'info');

  try {
    const response = await axios.post(REQUEST_URL, {
      query: "query getHanafudaList($groups: [YakuGroup!]) {\n  getYakuListForCurrentUser(groups: $groups) {\n    cardId\n    group\n  }\n}",
      variables: {},
      operationName: "getHanafudaList"
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': account.authToken,
        'User-Agent': USER_AGENT
      }
    });

    const result = response.data;
    if (!result.data || !result.data.getYakuListForCurrentUser) {
      throw new Error('getYakuListForCurrentUser not found in response');
    }

    printMessage(`Fetch Hanafuda List Success for ${userName}`, 'success');
  } catch (error) {
    printMessage(`Token Expired for ${userName}!`, 'error');

    // Attempt to refresh the token and retry
    const tokenRefreshed = await refreshTokenHandler(account, userName, accounts);
    if (tokenRefreshed) {
      return getHanafudaList(account, userName, accounts); // Retry with the new token
    }
  }
}

// Function to execute the draw action using axios
async function drawHanafuda(account, userName, loopCount, accounts) {
  for (let i = 1; i <= loopCount; i++) {
    printMessage(`Executing draw action - Loop ${i} of ${loopCount} for ${userName}`, 'info');

    try {
      const response = await axios.post(REQUEST_URL, {
        operationName: "executeGardenRewardAction",
        query: "mutation executeGardenRewardAction($limit: Int!) {\n  executeGardenRewardAction(limit: $limit) {\n    data {\n      cardId\n      group\n    }\n    isNew\n  }\n}",
        variables: { limit: 10 }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': account.authToken,
          'User-Agent': USER_AGENT
        }
      });

      const result = response.data;
      if (!result.data || !result.data.executeGardenRewardAction) {
        throw new Error('executeGardenRewardAction not found in response');
      }

      printMessage(`Loop ${i} Success for ${userName}: Cards drawn`, 'success');
      result.data.executeGardenRewardAction.forEach((cardInfo) => {
        const card = cardInfo.data;
        const isNewText = cardInfo.isNew ? " (New)" : " (Existing)";
        console.log(`  Card ID: ${card.cardId}, Group: ${card.group}${isNewText}`);
      });
    } catch (error) {
      printMessage(`Token Expired for ${userName} during loop ${i}!`, 'error');

      // Attempt to refresh the token and retry
      const tokenRefreshed = await refreshTokenHandler(account, userName, accounts);
      if (tokenRefreshed) {
        return drawHanafuda(account, userName, loopCount, accounts); // Retry with the new token
      }
    }
  }
}

// Function to get garden details and determine loop count
async function getGardenForCurrentUser(account, userName, accounts) {
  printMessage(`Fetching garden details for ${userName}...`, 'info');

  try {
    const response = await axios.post(REQUEST_URL, {
      query: "query GetGardenForCurrentUser {\n  getGardenForCurrentUser {\n    gardenStatus {\n      growActionCount\n      gardenRewardActionCount\n    }\n  }\n}",
      operationName: "GetGardenForCurrentUser"
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': account.authToken,
        'User-Agent': USER_AGENT
      }
    });

    const result = response.data;
    if (!result.data || !result.data.getGardenForCurrentUser) {
      throw new Error('getGardenForCurrentUser not found in response');
    }

    const gardenInfo = result.data.getGardenForCurrentUser.gardenStatus;
	let drawcount = floor(gardenInfo.gardenRewardActionCount/10);
    printMessage(`Garden Details Fetch Success for ${userName}`, 'success');
    console.log(`  Garden Reward Action Count: ${drawcount}`);

    // Use gardenRewardActionCount as the loop count for drawing cards
    await drawHanafuda(account, userName, drawcount, accounts);
  } catch (error) {
    printMessage(`Token Expired for ${userName}!`, 'error');

    // Attempt to refresh the token and retry
    const tokenRefreshed = await refreshTokenHandler(account, userName, accounts);
    if (tokenRefreshed) {
      return getGardenForCurrentUser(account, userName, accounts); // Retry with the new token
    }
  }
}

// Payload for fetching current user details
const currentUserPayload = {
  operationName: "CurrentUser",
  query: `query CurrentUser {
    currentUser {
      id
      sub
      name
      iconPath
      depositCount
      totalPoint
      evmAddress {
        userId
        address
      }
      inviter {
        id
        name
      }
    }
  }`
};

// Function to get and print the current user's name and validate inviterId
async function getCurrentUserName(account, accounts) {
  try {
    printMessage('Fetching current user data...', 'info');

    const response = await axios.post(REQUEST_URL, currentUserPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': account.authToken,
      }
    });

    const currentUser = response.data?.data?.currentUser;
    const userName = currentUser?.name;
    const inviterId = currentUser?.inviter?.id;

    if (userName) {
      printMessage(`Current User Name: ${userName}`, 'success');
      return userName;
    } else {
      throw new Error('User name not found in response');
    }
  } catch (error) {
    printMessage(`Error fetching current user data: ${error.message}`, 'error');

    // Attempt to refresh the token and retry
    const tokenRefreshed = await refreshTokenHandler(account, 'unknown user', accounts);
    if (tokenRefreshed) {
      return getCurrentUserName(account, accounts); // Retry with the refreshed token
    }
    return null;
  }
}
function printHeader() {
  const line = "=".repeat(50);
  const title = "Auto Draw Hanafuda";
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
printHeader();
// Main function to load accounts and execute actions
(async () => {
  const accounts = loadAccounts();
  const accountKeys = Object.keys(accounts);

  if (accountKeys.length === 0) {
    printMessage('No accounts found in autogrows.json.', 'error');
    return;
  }

  for (const accountKey of accountKeys) {
    const account = accounts[accountKey];

    // Get the user's name to pass to other functions
    const userName = await getCurrentUserName(account, accounts);
    if (!userName) continue;

    // Execute functions for each account
    await getHanafudaList(account, userName, accounts);
    await getGardenForCurrentUser(account, userName, accounts); // This will handle drawing with gardenRewardActionCount as the loop count
  }
})();
