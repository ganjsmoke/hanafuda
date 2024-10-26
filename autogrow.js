const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs');

// File to store tokens
const TOKEN_FILE = './tokens.json';

// Constants
const REQUEST_URL = 'https://hanafuda-backend-app-520478841386.us-central1.run.app/graphql';
const REFRESH_URL = 'https://securetoken.googleapis.com/v1/token?key=AIzaSyDipzN0VRfTPnMGhQ5PSzO27Cxm3DohJGY';

// Initialize tokens
let authToken = '';
let refreshToken = '';

// Load tokens from file or set default values
function loadTokens() {
  if (fs.existsSync(TOKEN_FILE)) {
    const data = fs.readFileSync(TOKEN_FILE);
    const tokens = JSON.parse(data);
    authToken = tokens.authToken;
    refreshToken = tokens.refreshToken;
    printMessage('Tokens loaded from file', 'info');
  } else {
    printMessage('Token file not found, please initialize tokens.', 'error');
  }
}

// Save tokens to file
function saveTokens() {
  const tokens = { authToken, refreshToken };
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
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

// Function to get the current user's name and validate inviterId
async function getCurrentUserName() {
  try {
    printMessage('Fetching current user data...', 'info');

    const response = await axios.post(REQUEST_URL, currentUserPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken,
      }
    });

    const currentUser = response.data?.data?.currentUser;
    const userName = currentUser?.name;
	const inviterId = currentUser?.inviter?.id;

    // Check if inviterId is 11210
    if (inviterId !== '11210') {
      printMessage('You didnt use my reffs :(', 'error');
      process.exit(1); // Exit the script if inviterId is not 11210
    }

    if (userName) {
      return userName;
    } else {
      throw new Error('User name not found in response');
    }
  } catch (error) {
    printMessage(`Error fetching current user data: ${error.message}`, 'error');
    return null;
  }
}

// Helper function to print messages
function printMessage(message, type = 'info') {
  if (type === 'success') {
    console.log(chalk.green.bold(`✔️  ${message}`));
  } else if (type === 'error') {
    console.log(chalk.red.bold(`❌  ${message}`));
  } else {
    console.log(chalk.cyan(`ℹ️  ${message}`));
  }
}

// Function to refresh the token
async function refreshTokenHandler() {
  printMessage('Attempting to refresh token...', 'info');
  try {
    const response = await axios.post(REFRESH_URL, null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }
    });

    authToken = `Bearer ${response.data.access_token}`;
    refreshToken = response.data.refresh_token;
    saveTokens();  // Save updated tokens to file
    printMessage('Token refreshed and saved successfully', 'success');
    return true;
  } catch (error) {
    printMessage(`Failed to refresh token: ${error.message}`, 'error');
    return false;
  }
}

// Function to get loop count (growActionCount) from the GetGardenForCurrentUser query
async function getLoopCount(retryOnFailure = true) {
  try {
    printMessage('Checking Grow Available...', 'info');

    const response = await axios.post(REQUEST_URL, getGardenPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken,
      }
    });

    const growActionCount = response.data?.data?.getGardenForCurrentUser?.gardenStatus?.growActionCount;
    if (typeof growActionCount === 'number') {
      printMessage(`Grow Available: ${growActionCount}`, 'success');
      return growActionCount;
    } else {
      throw new Error('growActionCount not found in response');
    }
  } catch (error) {
    printMessage(`Token Expired!`, 'error');

    // Attempt to refresh the token and retry
    if (retryOnFailure) {
      const tokenRefreshed = await refreshTokenHandler();
      if (tokenRefreshed) {
        return getLoopCount(false); // Retry with the new token, but don't retry infinitely
      }
    }
    return 0;
  }
}

// Function to execute the grow action
async function initiateGrowAction() {
  try {
    printMessage('Initiating Grow...', 'info');
	
    const response = await axios.post(REQUEST_URL, initiatePayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken,
      }
    });
	const userName = await getCurrentUserName(); // Get the current user's name
	
    const result = response.data;
    if (result.data && result.data.issueGrowAction) {
      printMessage(`Grow ${userName} Success, Pts: ${result.data.issueGrowAction}`, 'success');
      return result.data.issueGrowAction;
    } else {
      printMessage('Grow Failed', 'error');
      return 0;
    }
  } catch (error) {
    printMessage(`Error executing grow: ${error.message}`, 'error');
    return 0;
  }
}

// Function to commit the grow action
async function commitGrowAction() {
  try {
    printMessage('Committing Grow...', 'info');

    const response = await axios.post(REQUEST_URL, commitPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken,
      }
    });

    const result = response.data;
    if (result.data && result.data.commitGrowAction) {
      printMessage('Commit Success', 'success');
      return result.data.commitGrowAction;
    } else {
      printMessage('Commit Failed', 'error');
      return false;
    }
  } catch (error) {
    printMessage(`Error committing grow: ${error.message}`, 'error');
    return false;
  }
}

// Main function to continuously check and execute grow actions
async function executeGrowActions() {
  while (true) {
    const loopCount = await getLoopCount();

    if (loopCount > 0) {
      let totalResult = 0;

      for (let i = 0; i < loopCount; i++) {
        printMessage(`Starting Grow ${i + 1}/${loopCount}`, 'info');
        const initiateResult = await initiateGrowAction();
        totalResult += initiateResult;

        const commitResult = await commitGrowAction();
        if (commitResult) {
          printMessage(`Commit Grow ${i + 1} was successful.`, 'success');
        } else {
          printMessage(`Commit Grow ${i + 1} failed.`, 'error');
        }
      }

      printMessage(`All grow actions completed. Total Result: ${totalResult}`, 'success');
    } else {
      printMessage('No grow actions available. Checking again in 10 minutes..', 'info');
    }

    // Delay before the next check
    await new Promise(resolve => setTimeout(resolve, 60000*10)); // 5-second delay
  }
}

// Start the infinite loop to monitor and execute grow actions
loadTokens();
executeGrowActions();
