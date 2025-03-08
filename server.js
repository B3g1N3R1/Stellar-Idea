const express = require('express');
const CryptoJS = require('crypto-js');
const app = express();

app.use(express.json());
app.use(express.static('.')); // Serve your HTML/CSS/JS

// Coinbase Sandbox API setup
const COINBASE_API_KEY = '565ef60bf66e60baf005ec53b4e717ca';
const COINBASE_API_SECRET = '0peMYIN8nlI5wjOIeONcpunVCLIcGaF/vEokjrmC+QTa26tVKTG4fsxkMc11bMEoDvK/1Hm6UjQ2pxfB7CU48Q==';
const COINBASE_API_PASSPHRASE = '7ry3u8c1t9r7';
const COINBASE_API_URL = 'https://api-public.sandbox.exchange.coinbase.com';

function getCoinbaseSignature(method, path, body = '') {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = timestamp + method + path + body;
    console.log('Signature components:', { timestamp, method, path, body });
    console.log('Full message:', message);
    const secretBytes = CryptoJS.enc.Base64.parse(COINBASE_API_SECRET); // Decode secret
    const signature = CryptoJS.HmacSHA256(message, secretBytes).toString(CryptoJS.enc.Hex);
    return { timestamp, signature };
}

// Test endpoint: GET /accounts
app.get('/coinbase/test', async (req, res) => {
    const path = '/accounts';
    const { timestamp, signature } = getCoinbaseSignature('GET', path);
    try {
        console.log('Sending Coinbase test request:', { path, timestamp, signature, passphrase: COINBASE_API_PASSPHRASE });
        const response = await fetch(`${COINBASE_API_URL}${path}`, {
            method: 'GET',
            headers: {
                'CB-ACCESS-KEY': COINBASE_API_KEY,
                'CB-ACCESS-SIGN': signature,
                'CB-ACCESS-TIMESTAMP': timestamp,
                'CB-ACCESS-PASSPHRASE': COINBASE_API_PASSPHRASE,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.text();
        console.log('Coinbase response:', response.status, data);
        res.send(data);
    } catch (error) {
        console.error('Test error:', error.message);
        res.status(500).send(error.message);
    }
});

app.post('/coinbase/onramp', async (req, res) => {
    const { usdAmount } = req.body;
    const path = '/orders';
    const body = JSON.stringify({
        side: 'buy',
        product_id: 'USDC-USD',
        type: 'market',
        funds: usdAmount.toString()
    });
    const { timestamp, signature } = getCoinbaseSignature('POST', path, body);

    try {
        console.log('Sending Coinbase buy order:', { usdAmount, body, timestamp, signature, passphrase: COINBASE_API_PASSPHRASE });
        const response = await fetch(`${COINBASE_API_URL}${path}`, {
            method: 'POST',
            headers: {
                'CB-ACCESS-KEY': COINBASE_API_KEY,
                'CB-ACCESS-SIGN': signature,
                'CB-ACCESS-TIMESTAMP': timestamp,
                'CB-ACCESS-PASSPHRASE': COINBASE_API_PASSPHRASE,
                'Content-Type': 'application/json'
            },
            body: body
        });
        const data = await response.text();
        console.log('Coinbase response:', response.status, data);
        if (!response.ok) {
            res.status(response.status).send(data || 'On-ramp failed');
            return;
        }
        const jsonData = JSON.parse(data);
        const usdcAmount = jsonData.filled_size;
        res.json({ usdcAmount });
    } catch (error) {
        console.error('On-ramp error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/coinbase/offramp', async (req, res) => {
    const { usdcAmount } = req.body;
    const path = '/orders';
    const body = JSON.stringify({
        side: 'sell',
        product_id: 'USDC-USD',
        type: 'market',
        size: usdcAmount.toString()
    });
    const { timestamp, signature } = getCoinbaseSignature('POST', path, body);

    try {
        console.log('Sending Coinbase sell order:', { usdcAmount, body, timestamp, signature, passphrase: COINBASE_API_PASSPHRASE });
        const response = await fetch(`${COINBASE_API_URL}${path}`, {
            method: 'POST',
            headers: {
                'CB-ACCESS-KEY': COINBASE_API_KEY,
                'CB-ACCESS-SIGN': signature,
                'CB-ACCESS-TIMESTAMP': timestamp,
                'CB-ACCESS-PASSPHRASE': COINBASE_API_PASSPHRASE,
                'Content-Type': 'application/json'
            },
            body: body
        });
        const data = await response.text();
        console.log('Coinbase response:', response.status, data);
        if (!response.ok) {
            res.status(response.status).send(data || 'Off-ramp failed');
            return;
        }
        const jsonData = JSON.parse(data);
        const usdAmount = jsonData.filled_funds;
        res.json({ usdAmount });
    } catch (error) {
        console.error('Off-ramp error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(3001, () => console.log('Server running on port 3001'));