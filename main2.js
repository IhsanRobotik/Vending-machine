//this code uses core api instead of snap
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const product = {
  '1': 10000,
  '2': 20000,
  '3': 30000,
  '4': 40000,
  '5': 50000,
  '6': 60000,
  '7': 70000,
  '8': 80000,
  '9': 90000,
};

let mainWindow;
let transactionId = uuidv4();

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
      "gross_amount": product[input]
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
    mainWindow.loadURL(`file://${__dirname}/html/qr.html?qris_url=${encodeURIComponent(qris_url)}`);

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
    await wait(1000);
    }

    if (paymentStatus !== settlement) {
        for (let i = 0; i < 20; i++) { // Check every 100ms for a total of 5000ms
            if (isCancelled) break;
            await wait(100);
        }
    } else if (paymentStatus === settlement) {
        console.log('Payment successful');
        mainWindow.loadFile('./html/success.html');

    } else if (isCancelled) {
        console.log('Payment cancelled.');
        mainWindow.loadFile('./html/cancelled.html');
        await wait(2000);
        cancelPayment();
        generateNewPayment();
        mainWindow.loadFile('./html/index.html');
        return;
    } else {
        console.log('Payment status is undefined.');
        generateNewPayment();
    }

}

function generateNewPayment() {
  transactionId = uuidv4();
  console.log('New transaction ID:', transactionId);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile('./html/index.html');
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
  if (product[input]) {
    createPayment(input).then(() => monitorPaymentStatus());
  } else {
    console.log('Invalid input:', input);
    mainWindow.loadFile('./html/noProduct.html');
    setTimeout(() => {
      mainWindow.loadFile('./html/index.html');
    }, 2000);
  }
});