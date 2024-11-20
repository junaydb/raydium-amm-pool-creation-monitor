import chalk from "chalk";
import fs from "node:fs";
import {
  address,
  signature,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  type Rpc,
  type RpcSubscriptions,
  type GetTransactionApi,
  type LogsNotificationsApi,
} from "@solana/web3.js";

const SYNDICA_API_KEY = process.env["SYNDICA_API_KEY"];

// const RAYDIUM_LIQ_POOL_V4_ADDR = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const RAYDIUM_AMM_POOL_FEE_ADDR = "7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5";
const RAYDIUM_AUTH_V4_ADDR = "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1";
const WRAPPED_SOL_ADDR = "So11111111111111111111111111111111111111112";

const rpc = createSolanaRpc(
  `https://solana-mainnet.api.syndica.io/api-key/${SYNDICA_API_KEY}`,
) as Rpc<GetTransactionApi>;

const rpcSocket = createSolanaRpcSubscriptions(
  `wss://solana-mainnet.api.syndica.io/api-key/${SYNDICA_API_KEY}`,
) as RpcSubscriptions<LogsNotificationsApi>;

const abortController = new AbortController();

const raydiumAmmFeeLogs = await rpcSocket
  .logsNotifications({ mentions: [address(RAYDIUM_AMM_POOL_FEE_ADDR)] }, { commitment: "confirmed" })
  .subscribe({ abortSignal: abortController.signal });

console.log(chalk.bold("WebSocket connection established. Monitoring..."));

for await (const log of raydiumAmmFeeLogs) {
  const sig = log.value.signature;

  console.log(chalk.greenBright(`New transaction with signature: ${sig}`));

  const transaction = await rpc
    .getTransaction(signature(sig), { maxSupportedTransactionVersion: 0 })
    .send({ abortSignal: abortController.signal });

  const tokenAddr = transaction?.meta?.postTokenBalances?.find(
    (balance) => balance.owner === RAYDIUM_AUTH_V4_ADDR && balance.mint !== WRAPPED_SOL_ADDR,
  )?.mint;

  console.log(chalk.black.bold.bgWhiteBright(` ${tokenAddr} `));

  fs.appendFile("./db/db.csv", `${tokenAddr},`, (err) => {
    if (err) console.error(err);
  });
}
