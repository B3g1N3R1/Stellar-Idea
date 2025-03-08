// StellarSdk is loaded from the <script> tag in index.html
const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

// Get webpage parts
const person1IdDiv = document.getElementById('person1-id');
const person2IdDiv = document.getElementById('person2-id');
const person3IdDiv = document.getElementById('person3-id');
const startButton = document.getElementById('start-button');
const resetButton = document.getElementById('reset-button');
const sendAgainButton = document.getElementById('send-again-button');
const reverseButton = document.getElementById('reverse-button');
const doubleSwapButton = document.getElementById('double-swap-button');
const usdAmountInput = document.getElementById('usd-amount');
const progressBar = document.getElementById('progress-bar');
const messagesList = document.getElementById('messages');

// Make purses
const person1 = StellarSdk.Keypair.random();
const person2 = StellarSdk.Keypair.random();
const person3 = StellarSdk.Keypair.random();
const anchor = StellarSdk.Keypair.random();

// Show purse IDs right away
person1IdDiv.textContent = "Person 1’s Purse ID: " + person1.publicKey();
person2IdDiv.textContent = "Person 2’s Purse ID: " + person2.publicKey();
person3IdDiv.textContent = "Person 3’s Purse ID: " + person3.publicKey();

// Wait a little bit (a helper function)
function wait(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// Add a message to the list with color and update progress
function addMessage(text, isError = false, progress) {
    const li = document.createElement('li');
    li.textContent = text;
    li.className = isError ? 'error' : 'success';
    messagesList.appendChild(li);
    if (progress !== undefined) {
        progressBar.style.width = `${progress}%`;
    }
}

// Reset everything
function resetApp() {
    messagesList.innerHTML = '';
    usdAmountInput.value = "10";
    progressBar.style.width = '0%';
    startButton.disabled = false;
    sendAgainButton.disabled = true;
    reverseButton.disabled = true;
    doubleSwapButton.disabled = true;
}

// Fetch XLM price from CoinGecko
async function getXlmPrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd');
        const data = await response.json();
        return data.stellar.usd; // Returns XLM price in USD (e.g., 0.1)
    } catch (error) {
        console.error('Error fetching XLM price:', error);
        return 0.1; // Fallback price if API fails
    }
}

// On-ramp USD to USDC via Coinbase proxy
async function onRampUsdToUsdc(usdAmount) {
    const response = await fetch('http://localhost:3001/coinbase/onramp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usdAmount })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'On-ramp failed');
    const usdcAmount = data.usdcAmount;
    addMessage(`On-ramped ${usdAmount} USD to ${usdcAmount} USDC via Coinbase!`, false, 5);
    return usdcAmount;
}

// Off-ramp USDC to USD via Coinbase proxy
async function offRampUsdcToUsd(usdcAmount) {
    const response = await fetch('http://localhost:3001/coinbase/offramp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usdcAmount })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Off-ramp failed');
    const usdAmount = data.usdAmount;
    addMessage(`Off-ramped ${usdcAmount} USDC to ${usdAmount} USD via Coinbase!`, false);
}

// Fund purses and set up USDC
async function fundPurses(usdAmount) {
    await fetch('https://friendbot.stellar.org?addr=' + person1.publicKey());
    addMessage("Person 1 got 10,000 pretend XLM!", false, 10);
    await fetch('https://friendbot.stellar.org?addr=' + person2.publicKey());
    addMessage("Person 2 got 10,000 pretend XLM!", false, 20);
    await fetch('https://friendbot.stellar.org?addr=' + person3.publicKey());
    addMessage("Person 3 got 10,000 pretend XLM!", false, 30);
    await fetch('https://friendbot.stellar.org?addr=' + anchor.publicKey());
    addMessage("Anchor got 10,000 pretend XLM!", false, 40);
    await wait(5);

    const pretendUSDC = new StellarSdk.Asset('USDC', anchor.publicKey());
    const person1Purse = await server.loadAccount(person1.publicKey());
    const trustUSDC1 = new StellarSdk.TransactionBuilder(person1Purse, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.changeTrust({ asset: pretendUSDC }))
    .setTimeout(30)
    .build();
    trustUSDC1.sign(person1);
    await server.submitTransaction(trustUSDC1);
    addMessage("Person 1 trusts the anchor’s pretend USDC!", false, 50);

    const person2Purse = await server.loadAccount(person2.publicKey());
    const trustUSDC2 = new StellarSdk.TransactionBuilder(person2Purse, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.changeTrust({ asset: pretendUSDC }))
    .setTimeout(30)
    .build();
    trustUSDC2.sign(person2);
    await server.submitTransaction(trustUSDC2);
    addMessage("Person 2 trusts the anchor’s pretend USDC!", false, 60);

    const person3Purse = await server.loadAccount(person3.publicKey());
    const trustUSDC3 = new StellarSdk.TransactionBuilder(person3Purse, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.changeTrust({ asset: pretendUSDC }))
    .setTimeout(30)
    .build();
    trustUSDC3.sign(person3);
    await server.submitTransaction(trustUSDC3);
    addMessage("Person 3 trusts the anchor’s pretend USDC!", false, 70);

    const anchorPurse = await server.loadAccount(anchor.publicKey());
    const giveUSDC = new StellarSdk.TransactionBuilder(anchorPurse, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.payment({
        destination: person1.publicKey(),
        asset: pretendUSDC,
        amount: usdAmount.toString()
    }))
    .setTimeout(30)
    .build();
    giveUSDC.sign(anchor);
    await server.submitTransaction(giveUSDC);
    addMessage(`Anchor gave Person 1 ${usdAmount} pretend USDC!`, false, 80);
}

// Swap USDC for XLM, send, and swap back
async function sendMoney(usdAmount) {
    const xlmPrice = await getXlmPrice();
    const xlmAmount = (usdAmount * xlmPrice).toFixed(7);
    const priceInXlm = (1 / xlmPrice).toFixed(7);
    const pretendUSDC = new StellarSdk.Asset('USDC', anchor.publicKey());

    const anchorPurse = await server.loadAccount(anchor.publicKey());
    const offer = new StellarSdk.TransactionBuilder(anchorPurse, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.manageBuyOffer({
        selling: StellarSdk.Asset.native(),
        buying: pretendUSDC,
        buyAmount: usdAmount.toString(),
        price: priceInXlm
    }))
    .setTimeout(30)
    .build();
    offer.sign(anchor);
    await server.submitTransaction(offer);
    addMessage(`Anchor offers to buy ${usdAmount} USDC with ${xlmAmount} XLM!`, false, 85);

    const person1Purse = await server.loadAccount(person1.publicKey());
    const swap1 = new StellarSdk.TransactionBuilder(person1Purse, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.manageSellOffer({
        selling: pretendUSDC,
        buying: StellarSdk.Asset.native(),
        amount: usdAmount.toString(),
        price: priceInXlm
    }))
    .setTimeout(30)
    .build();
    swap1.sign(person1);
    await server.submitTransaction(swap1);
    addMessage(`Person 1 swapped ${usdAmount} USDC for ${xlmAmount} XLM!`, false, 90);

    const updatedPurse1 = await server.loadAccount(person1.publicKey());
    const delivery = new StellarSdk.TransactionBuilder(updatedPurse1, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.payment({
        destination: person2.publicKey(),
        asset: StellarSdk.Asset.native(),
        amount: xlmAmount
    }))
    .setTimeout(30)
    .build();
    delivery.sign(person1);
    await server.submitTransaction(delivery);
    addMessage(`Sent ${xlmAmount} XLM from Person 1 to Person 2!`, false, 95);

    const person2Purse = await server.loadAccount(person2.publicKey());
    const swap2 = new StellarSdk.TransactionBuilder(person2Purse, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.manageSellOffer({
        selling: StellarSdk.Asset.native(),
        buying: pretendUSDC,
        amount: xlmAmount,
        price: (1 / priceInXlm).toFixed(7)
    }))
    .setTimeout(30)
    .build();
    swap2.sign(person2);
    await server.submitTransaction(swap2);
    addMessage(`Person 2 swapped ${xlmAmount} XLM for ${usdAmount} USDC!`, false, 97);

    let updatedPurse2 = await server.loadAccount(person2.publicKey());
    const xlmBalance2 = parseFloat(updatedPurse2.balances.find(b => b.asset_type === 'native').balance);
    if (xlmBalance2 < 10) {
        await fetch('https://friendbot.stellar.org?addr=' + person2.publicKey());
        await wait(5);
        addMessage("Person 2 got 10,000 more XLM for fees!");
        updatedPurse2 = await server.loadAccount(person2.publicKey());
    }
    await wait(2);
    const sendUSDC = new StellarSdk.TransactionBuilder(updatedPurse2, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.payment({
        destination: person3.publicKey(),
        asset: pretendUSDC,
        amount: usdAmount.toString()
    }))
    .setTimeout(30)
    .build();
    sendUSDC.sign(person2);
    await server.submitTransaction(sendUSDC);
    addMessage(`Person 2 sent ${usdAmount} USDC to Person 3!`, false, 100);

    await offRampUsdcToUsd(usdAmount);
}

// Send USDC from Person 2 to Person 3 again
async function sendAgain(usdAmount) {
    let person2Purse = await server.loadAccount(person2.publicKey());
    const xlmBalance = parseFloat(person2Purse.balances.find(b => b.asset_type === 'native').balance);
    if (xlmBalance < 10) {
        await fetch('https://friendbot.stellar.org?addr=' + person2.publicKey());
        await wait(5);
        addMessage("Person 2 got 10,000 more XLM for fees!");
        person2Purse = await server.loadAccount(person2.publicKey());
    }
    await wait(2);
    const sendUSDC = new StellarSdk.TransactionBuilder(person2Purse, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.payment({
        destination: person3.publicKey(),
        asset: new StellarSdk.Asset('USDC', anchor.publicKey()),
        amount: usdAmount.toString()
    }))
    .setTimeout(30)
    .build();
    sendUSDC.sign(person2);
    await server.submitTransaction(sendUSDC);
    addMessage(`Person 2 sent ${usdAmount} USDC to Person 3 again!`);
}

// Send USDC from Person 3 back to Person 2
async function reverseSend(usdAmount) {
    let person3Purse = await server.loadAccount(person3.publicKey());
    const xlmBalance = parseFloat(person3Purse.balances.find(b => b.asset_type === 'native').balance);
    if (xlmBalance < 10) {
        await fetch('https://friendbot.stellar.org?addr=' + person3.publicKey());
        await wait(5);
        addMessage("Person 3 got 10,000 more XLM for fees!");
        person3Purse = await server.loadAccount(person3.publicKey());
    }
    await wait(2);
    const sendUSDC = new StellarSdk.TransactionBuilder(person3Purse, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.payment({
        destination: person2.publicKey(),
        asset: new StellarSdk.Asset('USDC', anchor.publicKey()),
        amount: usdAmount.toString()
    }))
    .setTimeout(30)
    .build();
    sendUSDC.sign(person3);
    await server.submitTransaction(sendUSDC);
    addMessage(`Person 3 sent ${usdAmount} USDC back to Person 2!`);
}

// Double swap for Person 1 (USDC to XLM and back)
async function doubleSwap(usdAmount) {
    const xlmPrice = await getXlmPrice();
    const xlmAmount = (usdAmount * xlmPrice).toFixed(7);
    const priceInXlm = (1 / xlmPrice).toFixed(7);
    const pretendUSDC = new StellarSdk.Asset('USDC', anchor.publicKey());

    let person1Purse = await server.loadAccount(person1.publicKey());
    const swap1 = new StellarSdk.TransactionBuilder(person1Purse, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.manageSellOffer({
        selling: pretendUSDC,
        buying: StellarSdk.Asset.native(),
        amount: usdAmount.toString(),
        price: priceInXlm
    }))
    .setTimeout(30)
    .build();
    swap1.sign(person1);
    await server.submitTransaction(swap1);
    addMessage(`Person 1 swapped ${usdAmount} USDC for ${xlmAmount} XLM!`);

    person1Purse = await server.loadAccount(person1.publicKey());
    const swap2 = new StellarSdk.TransactionBuilder(person1Purse, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.manageSellOffer({
        selling: StellarSdk.Asset.native(),
        buying: pretendUSDC,
        amount: xlmAmount,
        price: (1 / priceInXlm).toFixed(7)
    }))
    .setTimeout(30)
    .build();
    swap2.sign(person1);
    await server.submitTransaction(swap2);
    addMessage(`Person 1 swapped ${xlmAmount} XLM back to ${usdAmount} USDC!`);
}

// Run everything when the Start button is clicked
startButton.addEventListener('click', async () => {
    const usdAmount = parseFloat(usdAmountInput.value);
    if (usdAmount <= 0) {
        addMessage("Please enter a positive USD amount!", true);
        return;
    }
    startButton.disabled = true;
    resetButton.disabled = true;
    sendAgainButton.disabled = true;
    reverseButton.disabled = true;
    doubleSwapButton.disabled = true;
    messagesList.innerHTML = '';
    progressBar.style.width = '0%';
    try {
        await onRampUsdToUsdc(usdAmount);
        await fundPurses(usdAmount);
        await sendMoney(usdAmount);
        sendAgainButton.disabled = false;
        reverseButton.disabled = false;
        doubleSwapButton.disabled = false;
    } catch (error) {
        addMessage("Oops, something went wrong: " + error.message, true);
        startButton.disabled = false;
        resetButton.disabled = false;
    }
});

// Send again when the Send Again button is clicked
sendAgainButton.addEventListener('click', async () => {
    const usdAmount = parseFloat(usdAmountInput.value);
    if (usdAmount <= 0) {
        addMessage("Please enter a positive USD amount!", true);
        return;
    }
    sendAgainButton.disabled = true;
    try {
        await sendAgain(usdAmount);
    } catch (error) {
        addMessage("Oops, something went wrong: " + error.message, true);
    }
    sendAgainButton.disabled = false;
});

// Reverse send when the Reverse button is clicked
reverseButton.addEventListener('click', async () => {
    const usdAmount = parseFloat(usdAmountInput.value);
    if (usdAmount <= 0) {
        addMessage("Please enter a positive USD amount!", true);
        return;
    }
    reverseButton.disabled = true;
    try {
        await reverseSend(usdAmount);
    } catch (error) {
        addMessage("Oops, something went wrong: " + error.message, true);
    }
    reverseButton.disabled = false;
});

// Double swap when the Double Swap button is clicked
doubleSwapButton.addEventListener('click', async () => {
    const usdAmount = parseFloat(usdAmountInput.value);
    if (usdAmount <= 0) {
        addMessage("Please enter a positive USD amount!", true);
        return;
    }
    doubleSwapButton.disabled = true;
    try {
        await doubleSwap(usdAmount);
    } catch (error) {
        addMessage("Oops, something went wrong: " + error.message, true);
    }
    doubleSwapButton.disabled = false;
});

// Reset when the Reset button is clicked
resetButton.addEventListener('click', () => {
    resetApp();
});

// Start with extra buttons disabled
sendAgainButton.disabled = true;
reverseButton.disabled = true;
doubleSwapButton.disabled = true;