#!/usr/bin/env -S npx tsx
import { getOperatorBalanceHbar, loadHederaEnv } from "./index.js";

const env = loadHederaEnv();
const hbar = await getOperatorBalanceHbar();
console.log(`operator ${env.accountId}`);
console.log(`balance  ${hbar} HBAR (testnet)`);
console.log("ok");
