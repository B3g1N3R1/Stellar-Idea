// Grab the Stellar tool
const StellarSdk = require('stellar-sdk');
// Connect to the test playground
const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

// Make Person 1’s purse
const person1 = StellarSdk.Keypair.random();
console.log("Person 1’s Purse ID:", person1.publicKey());
console.log("Person 1’s Secret Password:", person1.secret());

// Make Person 2’s purse
const person2 = StellarSdk.Keypair.random();
console.log("Person 2’s Purse ID:", person2.publicKey());
console.log("Person 2’s Secret Password:", person2.secret());

// Make an anchor purse (our toy store)
const anchor = StellarSdk.Keypair.random();
console.log("Anchor’s Purse ID:", anchor.publicKey());
console.log("Anchor’s Secret Password:", anchor.secret());

// Wait a little bit (a helper function)
function wait(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// Give purses money and set up USD
async function fundPurses() {
    await fetch('https://friendbot.stellar.org?addr=' + person1.publicKey());
    console.log("Person 1 got 10,000 pretend XLM!");
    await fetch('https://friendbot.stellar.org?addr=' + person2.publicKey());
    console.log("Person 2 got 10,000 pretend XLM!");
    await fetch('https://friendbot.stellar.org?addr=' + anchor.publicKey());
    console.log("Anchor got 10,000 pretend XLM!");
    await wait(5); // Wait for XLM to settle

    // Person 1 trusts the anchor’s pretend USD
    const pretendUSD = new StellarSdk.Asset('USD', anchor.publicKey());
    const person1Purse = await server.loadAccount(person1.publicKey());
    const trustUSD1 = new StellarSdk.TransactionBuilder(person1Purse, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.changeTrust({ asset: pretendUSD }))
    .setTimeout(30)
    .build();
    trustUSD1.sign(person1);
    await server.submitTransaction(trustUSD1);
    console.log("Person 1 trusts the anchor’s pretend USD!");

    // Person 2 trusts the anchor’s pretend USD
    const person2Purse = await server.loadAccount(person2.publicKey());
    const trustUSD2 = new StellarSdk.TransactionBuilder(person2Purse, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.changeTrust({ asset: pretendUSD }))
    .setTimeout(30)
    .build();
    trustUSD2.sign(person2);
    await server.submitTransaction(trustUSD2);
    console.log("Person 2 trusts the anchor’s pretend USD!");

    // Anchor gives Person 1 10 pretend USD
    const anchorPurse = await server.loadAccount(anchor.publicKey());
    const giveUSD = new StellarSdk.TransactionBuilder(anchorPurse, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.payment({
        destination: person1.publicKey(),
        asset: pretendUSD,
        amount: "10"
    }))
    .setTimeout(30)
    .build();
    giveUSD.sign(anchor);
    await server.submitTransaction(giveUSD);
    console.log("Anchor gave Person 1 10 pretend USD!");
}

// Swap USD for XLM, send, and swap back
async function sendMoney() {
    // Anchor offers to buy 5 XLM for 10 USD
    const anchorPurse = await server.loadAccount(anchor.publicKey());
    const offer = new StellarSdk.TransactionBuilder(anchorPurse, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.manageBuyOffer({
        selling: StellarSdk.Asset.native(),
        buying: new StellarSdk.Asset('USD', anchor.publicKey()),
        buyAmount: "10",
        price: "0.5" // 5 XLM for 10 USD
    }))
    .setTimeout(30)
    .build();
    offer.sign(anchor);
    await server.submitTransaction(offer);
    console.log("Anchor offers to buy 10 USD with 5 XLM!");
    await wait(2); // Wait for the offer

    // Person 1 sells 10 USD for 5 XLM
    const person1Purse = await server.loadAccount(person1.publicKey());
    const swap1 = new StellarSdk.TransactionBuilder(person1Purse, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.manageSellOffer({
        selling: new StellarSdk.Asset('USD', anchor.publicKey()),
        buying: StellarSdk.Asset.native(),
        amount: "10",
        price: "0.5"
    }))
    .setTimeout(30)
    .build();
    swap1.sign(person1);
    await server.submitTransaction(swap1);
    console.log("Person 1 swapped 10 USD for 5 XLM!");

    // Send 5 XLM to Person 2
    const updatedPurse1 = await server.loadAccount(person1.publicKey());
    const delivery = new StellarSdk.TransactionBuilder(updatedPurse1, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.payment({
        destination: person2.publicKey(),
        asset: StellarSdk.Asset.native(),
        amount: "5"
    }))
    .setTimeout(30)
    .build();
    delivery.sign(person1);
    await server.submitTransaction(delivery);
    console.log("Sent 5 XLM from Person 1 to Person 2!");

    // Person 2 sells 5 XLM for 10 USD
    const person2Purse = await server.loadAccount(person2.publicKey());
    const swap2 = new StellarSdk.TransactionBuilder(person2Purse, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET
    })
    .addOperation(StellarSdk.Operation.manageSellOffer({
        selling: StellarSdk.Asset.native(),
        buying: new StellarSdk.Asset('USD', anchor.publicKey()),
        amount: "5",
        price: "2" // 5 XLM for 10 USD (inverse: 2 USD per XLM)
    }))
    .setTimeout(30)
    .build();
    swap2.sign(person2);
    await server.submitTransaction(swap2);
    console.log("Person 2 swapped 5 XLM for 10 USD!");
}

// Run everything
async function runApp() {
    await fundPurses();
    await sendMoney();
}

runApp().catch(error => console.log("Oops, something went wrong:", error));