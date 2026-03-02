export const CONTRACT = {
  address: '0xcd4af194dd8e79d26f9e7ccff8948e010a53d70a',
  deployBlock: 42772822n,
  erc8004Registry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  rpc: 'https://base-mainnet.public.blastapi.io',
  chainId: 8453,
};

export const SIBYL_ADDRESS = '0x4069ef1afC8A9b2a29117A3740fCAB2912499fBe';

// Diamond proxy (EIP-2535) for Ping broadcast and future extensions
export const DIAMOND = {
  address: '0x59235da2dd29bd0ebce0399ba16a1c5213e605da',
  deployBlock: 42818323n,
};

export const DEFAULTS = {
  logChunkSize: 9000n,
  chunkDelayMs: 250,
  maxRetries: 3,
};
