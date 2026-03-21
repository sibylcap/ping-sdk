// Ping v1 (immutable, read-only after v2 launch)
export const CONTRACT = {
  address: '0xcd4af194dd8e79d26f9e7ccff8948e010a53d70a',
  deployBlock: 42772822n,
  erc8004Registry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  rpc: 'https://mainnet.base.org',
  rpcStack: [
    'https://mainnet.base.org',
    'https://base.llamarpc.com',
    'https://1rpc.io/base',
    'https://base.drpc.org'
  ],
  chainId: 8453,
};

export const SIBYL_ADDRESS = '0x4069ef1afC8A9b2a29117A3740fCAB2912499fBe';

// Ping v1 Diamond (broadcast only, historical reads after v2 launch)
export const DIAMOND = {
  address: '0x59235da2dd29bd0ebce0399ba16a1c5213e605da',
  deployBlock: 42818323n,
};

// Ping v2 Diamond — canonical contract for all new operations
// Reads registrations from v1 for backward compatibility.
// Message fee: 0.00003 ETH (~$0.06). Adjustable by owner.
export const V2 = {
  address: '0x0571b06a221683f8afddfedd90e8568b95086df6',
  deployBlock: 43014945n,
};

export const DEFAULTS = {
  logChunkSize: 9000n,
  chunkDelayMs: 250,
  maxRetries: 3,
};
