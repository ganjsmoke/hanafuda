const axios = require('axios');
const fs = require('fs');
const chalk = require('chalk');

// Constants
const ACCOUNT_FILE = 'tokensgrow.json';
const REQUEST_URL = 'https://hanafuda-backend-app-520478841386.us-central1.run.app/graphql';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

// Function to display messages
function printMessage(message, type = 'info') {
  const timestamp = new Date().toISOString();
  if (type === 'success') {
    console.log(chalk.green.bold(`[${timestamp}] ✔️  ${message}`));
  } else if (type === 'error') {
    console.log(chalk.red.bold(`[${timestamp}] ❌  ${message}`));
  } else {
    console.log(chalk.cyan(`[${timestamp}] ℹ️  ${message}`));
  }
}

// Load accounts from the JSON file
function loadAccounts() {
  if (fs.existsSync(ACCOUNT_FILE)) {
    try {
      const data = fs.readFileSync(ACCOUNT_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      printMessage('Error reading or parsing account file. Please check the file format.', 'error');
      throw error;
    }
  } else {
    printMessage('Account file not found.', 'error');
    throw new Error('Account file not found');
  }
}

// Function to make POST requests with the bearer token
async function postRequest(payload, token) {
  try {
    const response = await axios.post(REQUEST_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
        'User-Agent': USER_AGENT,
      },
    });
    return response.data;
  } catch (error) {
    printMessage(`Request failed: ${error.message}`, 'error');
    throw error;
  }
}

// Step 1: Get garden details
async function getGardenDetails(token) {
  const payload = {
    query: `query GetGardenForCurrentUser {
      getGardenForCurrentUser {
        id
        gardenStatus {
          gardenRewardActionCount
        }
      }
    }`,
    operationName: 'GetGardenForCurrentUser',
  };

  const data = await postRequest(payload, token);
  const gardenRewardActionCount = Math.floor(data.data.getGardenForCurrentUser.gardenStatus.gardenRewardActionCount);
  printMessage(`Garden Reward Action Count: ${gardenRewardActionCount}`, 'success');
  return gardenRewardActionCount;
}

// Step 2: Get Hanafuda list
async function getHanafudaList(token) {
  const payload = {
    query: `query getHanafudaList($groups: [YakuGroup!]) {
      getYakuListForCurrentUser(groups: $groups) {
        cardId
        group
      }
    }`,
    variables: {
      groups: ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER', 'SECRET'],
    },
    operationName: 'getHanafudaList',
  };

  const data = await postRequest(payload, token);
  printMessage(`Successfully retrieved Hanafuda list.`, 'success');
  return data.data.getYakuListForCurrentUser;
}

// Step 3: Execute garden reward action (draw)
async function executeDraw(token, limit) {
  const payload = {
    query: `mutation executeGardenRewardAction($limit: Int!) {
      executeGardenRewardAction(limit: $limit) {
        data {
          cardId
          group
        }
        isNew
      }
    }`,
    variables: { limit },
    operationName: 'executeGardenRewardAction',
  };

  await postRequest(payload, token);
}

// Main function to orchestrate the flow
(async () => {
  try {
    const accounts = loadAccounts();
    const user = Object.values(accounts)[0]; // Assuming the first account in the JSON file
    if (!user.authToken) {
      throw new Error('authToken not found in account data.');
    }

    const token = user.authToken; // Extract the authToken

    // Step 1: Get garden details and calculate the number of draws
    const gardenRewardActionCount = await getGardenDetails(token);

    // Step 2: Get Hanafuda list
    await getHanafudaList(token);

    // Step 3: Execute draws in batches
    const limit = 10; // Number of cards to draw per request
    let remainingDraws = gardenRewardActionCount;
    let processCount = 1;

    printMessage(`Processing draw for ${gardenRewardActionCount} times.`, 'info');

    while (remainingDraws > 0) {
      const drawCount = Math.min(limit, remainingDraws);
      await executeDraw(token, drawCount); // Execute draw silently
      remainingDraws -= drawCount;
      printMessage(`Executed draw for ${drawCount} cards. Draws Left: ${remainingDraws}`, 'info');
      processCount++;
    }

    printMessage('All draws completed successfully!', 'success');
  } catch (error) {
    printMessage(`Error: ${error.message}`, 'error');
  }
})();
