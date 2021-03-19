# [twist](#)

> `twist-lib`

### Overview 

> twist: a transactional aggregator library 

### usage 

> Instance is created by passing in the network id to the constructor.

```javascript
import { Twist } from "./index";
const twist = new Twist(1);
```
Each twist has it's own class in this directory, and each twistor
fetches its own token metadata and returns it to the main class.
Once all token metadata has been loaded the  `twist.tokens` Ready
promise resolves and the library is ready to be interacted with.

There are two ways the lib can be used, to fetch quotes, and to fetch
trades. 
- Quotes are just prices. They don't require a web3 instance, or a
wallet address, and they can be used for price discovery for arbitrarily
large amounts.
- Trades are executable. They require a web3 provider and slippage
parameters to be set. 

### Fetching Quotes

> syntax for fetching quotes:

```javascript
twist.fetchQuotes({
    sourceAmount,
    sourceToken,
    destinationToken
});
```

### Fetching Trades 

> syntax for fetching trades

```javascript
twist.fetchTrades({
        sourceAmount,
        sourceToken,
        destinationToken,
        userAddress,
        slippage
    },
    web3
);
```

When a trade is fetched, the appropriate approvals are also checked for
the `userAddress` address provided.
If approvals are missing, they are added as an `approvalNeeded` param to
each individual trade returned.

#### approval transaction 

> execute an approval transaction 

```javascript
const approvalTx = await trade.approvalNeeded({ gasPrice });
const approvalReceipt = await approvalTx.wait();
                  
```

#### trade transaction

> execute a trade transaction 

```javascript
const txObject = {
    from: walletAddress,
    to: trade.to,
    value: trade.value,
    data: trade.data,
    gas,
    gasPrice
};
web3.eth.sendTransaction(txObject);
```

`0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` is used for ETH

- Each twist has a different method of approving the end user's ERC20
balance. Many utilize an ERC20 proxy that handles the authorizations.
That's why it's important to use the libraries built-in approval checks
instead of manually checking the `trade.to` address for the spender
approval.

## License

GPL-2.0
