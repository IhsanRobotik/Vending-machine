//this code uses core api instead of snap
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

let mainWindow;
let transactionId = uuidv4();
console.log(transactionId);

require('dotenv').config();
const authorization = process.env.MIDTRANS_API_AUTH;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': authorization
};

const createPayment = async (input) => {
  const payload = {
    "transaction_details": {
      "order_id": transactionId,
      "gross_amount": input
    },
    "merchantId": "G536748043",
    "payment_type": "qris"
  };

  const baseUrl = 'https://api.sandbox.midtrans.com/v2/charge';

  try {
    const response = await axios.post(baseUrl, payload, { headers });
    console.log('Payment created successfully:', response.data);
    const qris_url = response.data.actions[0].url;
    console.log(qris_url);

    // Load the qris_url in the main window
    mainWindow.loadURL(`file://${path.join(__dirname, 'qr.html')}?qris_url=${encodeURIComponent(qris_url)}`);

  } catch (error) {
    if (error.response) {
      console.error('Error creating payment:', error.response.data);
      console.error('Response Code:', error.response.status);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
  }
};

const cancelPayment = async () => {
  const url = `https://api.sandbox.midtrans.com/v2/${transactionId}/cancel`;
  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      Authorization: authorization
    }
  };

  try {
    const response = await axios.post(url, {}, options);
    console.log('Payment cancelled successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error cancelling payment:', error);
    return null;
  }
};

const checkPaymentStatus = async () => {
  const url = `https://api.sandbox.midtrans.com/v2/${transactionId}/status`;
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: authorization
    }
  };

  try {
    const response = await axios.get(url, options);
    return response.data;
  } catch (error) {
    console.error('Error checking payment status:', error);
    return null;
  }
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const monitorPaymentStatus = async () => {
  let paymentStatus = null;
  const settlement = 'settlement';
  let isCancelled = false;

  ipcMain.once('cancel-payment', () => {
    isCancelled = true;
  });

  while (paymentStatus !== settlement && !isCancelled) {
    const statusResponse = await checkPaymentStatus();
    paymentStatus = statusResponse.transaction_status;
    console.log('Payment status:', paymentStatus);
    await wait(1000); // Wait for 1 second before checking again
  }

  if (isCancelled) {
    console.log('Payment cancelled.');
    mainWindow.loadFile('index.html');
  } else {
    console.log('Payment settled.');
    mainWindow.loadFile('success.html'); // Load the success.html file when payment is settled

    // Wait for a few seconds before resetting the application
    await wait(5000);

    // Generate a new transaction ID and reload the initial content
    transactionId = uuidv4();
    console.log('New transaction ID:', transactionId);
    mainWindow.loadFile('index.html');
  }
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
    },
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on('log-input', (event, input) => {
  console.log('Entered:', input);
  createPayment(input).then(() => monitorPaymentStatus());
});

ipcMain.on('cancel-payment', async () => {
  console.log('Cancel payment requested');
  await cancelPayment();
  mainWindow.loadFile('index.html');
});
