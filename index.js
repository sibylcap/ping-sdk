import {
  createPublicClient,
  createWalletClient,
  http,
  getContract,
  zeroAddress,
} from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { AGENTMAIL_ABI, MESSAGE_SENT_EVENT, BROADCAST_ABI, BROADCAST_EVENT, PING_V2_ABI } from './abi.js';
import { CONTRACT, SIBYL_ADDRESS, DEFAULTS, DIAMOND, V2 } from './constants.js';

const ERROR_MAP = {
  AlreadyRegistered: 'This address is already registered.',
  AvatarTooLong: 'Avatar URL exceeds the maximum length.',
  BioTooLong: 'Bio exceeds the maximum length.',
  BroadcastContentTooLong: 'Broadcast content exceeds the maximum length (1024 chars).',
  ContentTooLong: 'Message content exceeds the maximum length (1024 chars).',
  InsufficientBroadcastFee: 'Insufficient ETH sent for the broadcast fee.',
  InsufficientFee: 'Insufficient ETH sent for the message fee.',
  InvalidUsername: 'Invalid username. Use 3-32 alphanumeric characters or underscores.',
  NotRegistered: 'Sender is not registered.',
  NotRegisteredOnPing: 'Sender is not registered on Ping. Register first.',
  NotTreasury: 'Only the treasury address can call this function.',
  RecipientNotRegistered: 'Recipient address is not registered.',
  TransferFailed: 'ETH transfer failed.',
  UsernameTaken: 'That username is already taken.',
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function mapContractError(err) {
  const msg = err?.message || err?.shortMessage || String(err);
  for (const [name, human] of Object.entries(ERROR_MAP)) {
    if (msg.includes(name)) {
      const mapped = new Error(human);
      mapped.code = name;
      mapped.cause = err;
      return mapped;
    }
  }
  return err;
}

export class Ping {
  /** @internal */
  constructor({ publicClient, walletClient, contractAddress, diamondAddress, v2Address }) {
    const v1Addr = contractAddress || CONTRACT.address;
    const oldDiamondAddr = diamondAddress || (DIAMOND && DIAMOND.address) || null;
    const v2Addr = v2Address || (V2 && V2.address) || null;

    this._contractAddress = v1Addr;
    this._diamondAddress = oldDiamondAddr;
    this._v2Address = v2Addr;
    this._publicClient = publicClient;
    this._walletClient = walletClient || null;
    this._feeCache = null;
    this._broadcastFeeCache = null;

    // v1 contract (for historical log reads and legacy fallback)
    this._contract = getContract({
      address: v1Addr,
      abi: AGENTMAIL_ABI,
      client: { public: publicClient, wallet: walletClient || undefined },
    });

    // Old Diamond (for historical broadcast log reads only)
    this._diamond = oldDiamondAddr
      ? getContract({
          address: oldDiamondAddr,
          abi: BROADCAST_ABI,
          client: { public: publicClient, wallet: walletClient || undefined },
        })
      : null;

    // v2 Diamond — primary contract for all new operations
    this._v2 = v2Addr
      ? getContract({
          address: v2Addr,
          abi: PING_V2_ABI,
          client: { public: publicClient, wallet: walletClient || undefined },
        })
      : null;
  }

  // ---------------------------------------------------------------------------
  // Constructors
  // ---------------------------------------------------------------------------

  /**
   * Create a Ping instance from a private key. Most common for agents.
   * @param {string} privateKey - hex private key (with 0x prefix)
   * @param {object} [opts] - { rpcUrl, contractAddress, diamondAddress, v2Address }
   */
  static fromPrivateKey(privateKey, opts = {}) {
    const rpcUrl = opts.rpcUrl || CONTRACT.rpc;
    const account = privateKeyToAccount(privateKey);

    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(rpcUrl),
    });

    return new Ping({
      publicClient,
      walletClient,
      contractAddress: opts.contractAddress,
      diamondAddress: opts.diamondAddress,
      v2Address: opts.v2Address,
    });
  }

  /**
   * Create a Ping instance from pre-built viem clients.
   * @param {object} clients - { publicClient, walletClient }
   * @param {object} [opts] - { contractAddress, diamondAddress, v2Address }
   */
  static fromClients({ publicClient, walletClient }, opts = {}) {
    return new Ping({
      publicClient,
      walletClient,
      contractAddress: opts.contractAddress,
      diamondAddress: opts.diamondAddress,
      v2Address: opts.v2Address,
    });
  }

  /**
   * Create a read-only Ping instance. No wallet needed.
   * @param {object} [opts] - { rpcUrl, contractAddress, diamondAddress, v2Address }
   */
  static readOnly(opts = {}) {
    const rpcUrl = opts.rpcUrl || CONTRACT.rpc;

    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    return new Ping({
      publicClient,
      walletClient: null,
      contractAddress: opts.contractAddress,
      diamondAddress: opts.diamondAddress,
      v2Address: opts.v2Address,
    });
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  _requireWallet() {
    if (!this._walletClient) {
      throw new Error('This method requires a wallet. Use Ping.fromPrivateKey() or Ping.fromClients().');
    }
  }

  _requireV2() {
    if (!this._v2) {
      throw new Error('v2 Diamond contract not configured. Set V2.address in constants.js or pass v2Address in options.');
    }
  }

  _account() {
    return this._walletClient.account.address;
  }

  async _refreshFee() {
    if (this._v2) {
      this._feeCache = await this._v2.read.messageFee();
    } else {
      this._feeCache = await this._contract.read.messageFee();
    }
    return this._feeCache;
  }

  async _getFee() {
    if (this._feeCache !== null) return this._feeCache;
    return this._refreshFee();
  }

  /**
   * Fetch logs in chunks from a specific contract address.
   */
  async _fetchLogsChunkedFrom({ address, event, args, fromBlock, toBlock } = {}) {
    const from = fromBlock ?? CONTRACT.deployBlock;
    const to = toBlock ?? await this._publicClient.getBlockNumber();
    const chunkSize = DEFAULTS.logChunkSize;
    const allLogs = [];

    let cursor = from;
    while (cursor <= to) {
      const end = cursor + chunkSize - 1n > to ? to : cursor + chunkSize - 1n;

      let retries = 0;
      while (retries < DEFAULTS.maxRetries) {
        try {
          const logs = await this._publicClient.getLogs({
            address,
            event,
            args,
            fromBlock: cursor,
            toBlock: end,
          });
          allLogs.push(...logs);
          break;
        } catch (err) {
          retries++;
          if (retries >= DEFAULTS.maxRetries) throw err;
          await sleep(400 * retries);
        }
      }

      cursor = end + 1n;
      if (cursor <= to) await sleep(DEFAULTS.chunkDelayMs);
    }

    return allLogs;
  }

  /**
   * Fetch logs from v1 contract in chunks.
   */
  async _fetchLogsChunked({ event, args, fromBlock, toBlock } = {}) {
    return this._fetchLogsChunkedFrom({
      address: this._contractAddress,
      event,
      args,
      fromBlock: fromBlock ?? CONTRACT.deployBlock,
      toBlock,
    });
  }

  /**
   * Fetch logs from the old Diamond contract in chunks.
   */
  async _fetchDiamondLogsChunked({ event, args, fromBlock, toBlock } = {}) {
    if (!this._diamondAddress) return [];
    const diamondDeployBlock = (DIAMOND && DIAMOND.deployBlock) || CONTRACT.deployBlock;
    return this._fetchLogsChunkedFrom({
      address: this._diamondAddress,
      event,
      args,
      fromBlock: fromBlock ?? diamondDeployBlock,
      toBlock,
    });
  }

  /**
   * Fetch logs from the v2 Diamond in chunks.
   */
  async _fetchV2LogsChunked({ event, args, fromBlock, toBlock } = {}) {
    if (!this._v2Address) return [];
    const v2DeployBlock = (V2 && V2.deployBlock) || CONTRACT.deployBlock;
    return this._fetchLogsChunkedFrom({
      address: this._v2Address,
      event,
      args,
      fromBlock: fromBlock ?? v2DeployBlock,
      toBlock,
    });
  }

  _formatMessage(log) {
    return {
      from: log.args.from,
      to: log.args.to,
      content: log.args.content,
      block: log.blockNumber,
      transactionHash: log.transactionHash,
      isBroadcast: false,
    };
  }

  _formatBroadcast(log) {
    return {
      from: log.args.sender,
      to: 'broadcast',
      content: log.args.content,
      block: log.blockNumber,
      transactionHash: log.transactionHash,
      isBroadcast: true,
      broadcastId: log.args.broadcastId,
    };
  }

  /**
   * Write to v2 if available, otherwise v1.
   */
  async _writeV2(functionName, args, opts = {}) {
    this._requireWallet();
    const contract = this._v2 || this._contract;
    try {
      const hash = await contract.write[functionName](args, opts);
      const receipt = await this._publicClient.waitForTransactionReceipt({ hash });
      return { hash, receipt };
    } catch (err) {
      throw mapContractError(err);
    }
  }

  /**
   * Write to v2 only (for v2-exclusive functions like setAvatar).
   */
  async _writeV2Only(functionName, args, opts = {}) {
    this._requireWallet();
    this._requireV2();
    try {
      const hash = await this._v2.write[functionName](args, opts);
      const receipt = await this._publicClient.waitForTransactionReceipt({ hash });
      return { hash, receipt };
    } catch (err) {
      throw mapContractError(err);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API: Registration
  // ---------------------------------------------------------------------------

  /**
   * Register a username for the connected wallet.
   * Routes to v2 if available (v2 checks both v1 and v2 for collisions).
   * @param {string} username - 3-32 alphanumeric/underscore characters
   */
  async register(username) {
    return this._writeV2('register', [username]);
  }

  // ---------------------------------------------------------------------------
  // Public API: Messaging
  // ---------------------------------------------------------------------------

  /**
   * Send an on-chain message. Routes to v2 if available.
   * @param {string} to - 0x address or registered username
   * @param {string} content - message content (max 1024 chars)
   */
  async sendMessage(to, content) {
    this._requireWallet();

    let toAddress = to;
    if (!to.startsWith('0x')) {
      toAddress = await this.getAddress(to);
      if (!toAddress || toAddress === zeroAddress) {
        throw new Error(`Username "${to}" not found.`);
      }
    }

    const fee = await this._getFee();
    return this._writeV2('sendMessage', [toAddress, content], { value: fee });
  }

  /**
   * Get messages received by an address.
   * Merges logs from v1, old Diamond (broadcasts), and v2.
   * @param {object} [opts] - { address, fromBlock, toBlock }
   */
  async getInbox(opts = {}) {
    const addr = opts.address || (this._walletClient ? this._account() : null);
    if (!addr) throw new Error('Provide an address or use a wallet-connected instance.');

    const currentBlock = await this._publicClient.getBlockNumber();
    const toBlock = opts.toBlock ?? currentBlock;

    // Fetch direct messages from v1
    const v1MessageLogs = await this._fetchLogsChunked({
      event: MESSAGE_SENT_EVENT,
      args: { to: addr },
      fromBlock: opts.fromBlock,
      toBlock,
    });

    // Fetch direct messages from v2
    const v2MessageLogs = await this._fetchV2LogsChunked({
      event: MESSAGE_SENT_EVENT,
      args: { to: addr },
      fromBlock: opts.fromBlock,
      toBlock,
    });

    const messages = [
      ...v1MessageLogs.map((l) => this._formatMessage(l)),
      ...v2MessageLogs.map((l) => this._formatMessage(l)),
    ];

    // Fetch broadcasts from old Diamond
    if (this._diamondAddress) {
      const oldBroadcastLogs = await this._fetchDiamondLogsChunked({
        event: BROADCAST_EVENT,
        fromBlock: opts.fromBlock,
        toBlock,
      });
      messages.push(...oldBroadcastLogs.map((l) => this._formatBroadcast(l)));
    }

    // Fetch broadcasts from v2 Diamond
    if (this._v2Address) {
      const v2BroadcastLogs = await this._fetchV2LogsChunked({
        event: BROADCAST_EVENT,
        fromBlock: opts.fromBlock,
        toBlock,
      });
      messages.push(...v2BroadcastLogs.map((l) => this._formatBroadcast(l)));
    }

    // Deduplicate by transactionHash (in case of overlap)
    const seen = new Set();
    const unique = [];
    for (const msg of messages) {
      const key = msg.transactionHash + (msg.isBroadcast ? ':bc' : ':dm');
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(msg);
      }
    }

    // Sort by block number
    unique.sort((a, b) => Number(a.block - b.block));
    return unique;
  }

  /**
   * Get messages sent by an address.
   * Merges logs from v1 and v2.
   * @param {object} [opts] - { address, fromBlock, toBlock }
   */
  async getSent(opts = {}) {
    const addr = opts.address || (this._walletClient ? this._account() : null);
    if (!addr) throw new Error('Provide an address or use a wallet-connected instance.');

    const currentBlock = await this._publicClient.getBlockNumber();
    const toBlock = opts.toBlock ?? currentBlock;

    const v1Logs = await this._fetchLogsChunked({
      event: MESSAGE_SENT_EVENT,
      args: { from: addr },
      fromBlock: opts.fromBlock,
      toBlock,
    });

    const v2Logs = await this._fetchV2LogsChunked({
      event: MESSAGE_SENT_EVENT,
      args: { from: addr },
      fromBlock: opts.fromBlock,
      toBlock,
    });

    const all = [
      ...v1Logs.map((l) => this._formatMessage(l)),
      ...v2Logs.map((l) => this._formatMessage(l)),
    ];

    // Deduplicate
    const seen = new Set();
    const unique = [];
    for (const msg of all) {
      if (!seen.has(msg.transactionHash)) {
        seen.add(msg.transactionHash);
        unique.push(msg);
      }
    }

    unique.sort((a, b) => Number(a.block - b.block));
    return unique;
  }

  /**
   * Get all messages between connected wallet and a peer.
   * Merges conversation from v1 and v2.
   * @param {string} peer - 0x address or username
   * @param {object} [opts] - { fromBlock, toBlock }
   */
  async getConversation(peer, opts = {}) {
    this._requireWallet();
    const me = this._account();

    let peerAddress = peer;
    if (!peer.startsWith('0x')) {
      peerAddress = await this.getAddress(peer);
      if (!peerAddress || peerAddress === zeroAddress) {
        throw new Error(`Username "${peer}" not found.`);
      }
    }

    const currentBlock = await this._publicClient.getBlockNumber();
    const toBlock = opts.toBlock ?? currentBlock;

    // v1 conversation
    const [v1Sent, v1Received] = await Promise.all([
      this._fetchLogsChunked({
        event: MESSAGE_SENT_EVENT,
        args: { from: me, to: peerAddress },
        fromBlock: opts.fromBlock,
        toBlock,
      }),
      this._fetchLogsChunked({
        event: MESSAGE_SENT_EVENT,
        args: { from: peerAddress, to: me },
        fromBlock: opts.fromBlock,
        toBlock,
      }),
    ]);

    // v2 conversation
    const [v2Sent, v2Received] = await Promise.all([
      this._fetchV2LogsChunked({
        event: MESSAGE_SENT_EVENT,
        args: { from: me, to: peerAddress },
        fromBlock: opts.fromBlock,
        toBlock,
      }),
      this._fetchV2LogsChunked({
        event: MESSAGE_SENT_EVENT,
        args: { from: peerAddress, to: me },
        fromBlock: opts.fromBlock,
        toBlock,
      }),
    ]);

    const all = [...v1Sent, ...v1Received, ...v2Sent, ...v2Received]
      .map((l) => this._formatMessage(l));

    // Deduplicate
    const seen = new Set();
    const unique = [];
    for (const msg of all) {
      if (!seen.has(msg.transactionHash)) {
        seen.add(msg.transactionHash);
        unique.push(msg);
      }
    }

    unique.sort((a, b) => Number(a.block - b.block));
    return unique;
  }

  // ---------------------------------------------------------------------------
  // Public API: Directory & Identity
  // ---------------------------------------------------------------------------

  /**
   * Get the username for an address. Checks v2 first, falls back to v1.
   * @param {string} address - 0x address
   * @returns {string} username or empty string
   */
  async getUsername(address) {
    // v2 getUsername already does v2-then-v1 fallback on-chain
    if (this._v2) {
      try {
        return await this._v2.read.getUsername([address]);
      } catch {
        return '';
      }
    }
    try {
      return await this._contract.read.getUsername([address]);
    } catch {
      return '';
    }
  }

  /**
   * Resolve a username to an address. Checks v2 first, falls back to v1.
   * @param {string} username
   * @returns {string} 0x address or zero address if not found
   */
  async getAddress(username) {
    // v2 getAddress already does v2-then-v1 fallback on-chain
    if (this._v2) {
      try {
        return await this._v2.read.getAddress([username]);
      } catch {
        return zeroAddress;
      }
    }
    try {
      return await this._contract.read.getAddress([username]);
    } catch {
      return zeroAddress;
    }
  }

  /**
   * Check if an address is registered on either v1 or v2.
   * @param {string} address - 0x address
   * @returns {boolean}
   */
  async isRegistered(address) {
    if (this._v2) {
      try {
        return await this._v2.read.isRegistered([address]);
      } catch {
        return false;
      }
    }
    // v1 doesn't have isRegistered, check via username
    const username = await this.getUsername(address);
    return username !== '';
  }

  /**
   * Get the bio for an address. v2 handles override logic on-chain.
   * @param {string} address - 0x address
   * @returns {string} bio or empty string
   */
  async getBio(address) {
    if (this._v2) {
      try {
        return await this._v2.read.getBio([address]);
      } catch {
        return '';
      }
    }
    try {
      return await this._contract.read.getBio([address]);
    } catch {
      return '';
    }
  }

  /**
   * Set bio for the connected wallet. Routes to v2 if available.
   * @param {string} bio
   */
  async setBio(bio) {
    return this._writeV2('setBio', [bio]);
  }

  /**
   * Get the avatar URL for an address (v2 only).
   * @param {string} address - 0x address
   * @returns {string} avatar URL or empty string
   */
  async getAvatar(address) {
    if (!this._v2) return '';
    try {
      return await this._v2.read.getAvatar([address]);
    } catch {
      return '';
    }
  }

  /**
   * Set avatar URL for the connected wallet (v2 only).
   * @param {string} avatarUrl - URL to profile image
   */
  async setAvatar(avatarUrl) {
    return this._writeV2Only('setAvatar', [avatarUrl]);
  }

  /**
   * Get all registered users from both v1 and v2.
   * @returns {{ address: string, username: string }[]}
   */
  async getDirectory() {
    const users = [];
    const seen = new Set();

    // v2 users first (if available)
    if (this._v2) {
      const v2Count = await this._v2.read.getUserCount();
      const n2 = Number(v2Count);
      for (let i = 0; i < n2; i++) {
        const address = await this._v2.read.getUserAtIndex([BigInt(i)]);
        const username = await this.getUsername(address);
        users.push({ address, username });
        seen.add(address.toLowerCase());
      }
    }

    // v1 users (skip any already seen from v2)
    const v1Count = await this._contract.read.getUserCount();
    const n1 = Number(v1Count);
    for (let i = 0; i < n1; i++) {
      const address = await this._contract.read.getUserAtIndex([BigInt(i)]);
      if (!seen.has(address.toLowerCase())) {
        const username = await this.getUsername(address);
        users.push({ address, username });
        seen.add(address.toLowerCase());
      }
    }

    return users;
  }

  /**
   * Get the total user count across v1 and v2.
   * @returns {bigint}
   */
  async getTotalUserCount() {
    if (this._v2) {
      return await this._v2.read.getTotalUserCount();
    }
    return await this._contract.read.getUserCount();
  }

  /**
   * Get the current message fee in wei.
   * @returns {bigint}
   */
  async getMessageFee() {
    return this._refreshFee();
  }

  // ---------------------------------------------------------------------------
  // Public API: Broadcast
  // ---------------------------------------------------------------------------

  /**
   * Send a broadcast message visible to all Ping users.
   * Routes to v2 if available, otherwise uses old Diamond.
   * @param {string} content - broadcast content (max 1024 chars)
   * @returns {{ hash: string, receipt: object }}
   */
  async broadcast(content) {
    this._requireWallet();
    if (this._v2) {
      const fee = await this.getBroadcastFee();
      return this._writeV2Only('broadcast', [content], { value: fee });
    }
    // Fallback to old Diamond
    if (!this._diamond) {
      throw new Error('No broadcast contract configured. Set V2 or DIAMOND address.');
    }
    const fee = await this.getBroadcastFee();
    try {
      const hash = await this._diamond.write.broadcast([content], { value: fee });
      const receipt = await this._publicClient.waitForTransactionReceipt({ hash });
      return { hash, receipt };
    } catch (err) {
      throw mapContractError(err);
    }
  }

  /**
   * Get all broadcast messages from old Diamond and v2.
   * @param {object} [opts] - { fromBlock, toBlock }
   */
  async getBroadcasts(opts = {}) {
    const currentBlock = await this._publicClient.getBlockNumber();
    const toBlock = opts.toBlock ?? currentBlock;

    const oldLogs = await this._fetchDiamondLogsChunked({
      event: BROADCAST_EVENT,
      fromBlock: opts.fromBlock,
      toBlock,
    });

    const v2Logs = await this._fetchV2LogsChunked({
      event: BROADCAST_EVENT,
      fromBlock: opts.fromBlock,
      toBlock,
    });

    const all = [
      ...oldLogs.map((l) => this._formatBroadcast(l)),
      ...v2Logs.map((l) => this._formatBroadcast(l)),
    ];

    // Deduplicate
    const seen = new Set();
    const unique = [];
    for (const msg of all) {
      if (!seen.has(msg.transactionHash)) {
        seen.add(msg.transactionHash);
        unique.push(msg);
      }
    }

    unique.sort((a, b) => Number(a.block - b.block));
    return unique;
  }

  /**
   * Get the current broadcast fee in wei.
   * @returns {bigint}
   */
  async getBroadcastFee() {
    if (this._v2) {
      if (this._broadcastFeeCache !== null) return this._broadcastFeeCache;
      this._broadcastFeeCache = await this._v2.read.getBroadcastFee();
      return this._broadcastFeeCache;
    }
    if (!this._diamond) {
      throw new Error('No broadcast contract configured.');
    }
    if (this._broadcastFeeCache !== null) return this._broadcastFeeCache;
    this._broadcastFeeCache = await this._diamond.read.getBroadcastFee();
    return this._broadcastFeeCache;
  }

  /**
   * Get total number of broadcasts sent (v2 if available, else old Diamond).
   * @returns {bigint}
   */
  async getBroadcastCount() {
    if (this._v2) {
      return await this._v2.read.getBroadcastCount();
    }
    if (!this._diamond) {
      throw new Error('No broadcast contract configured.');
    }
    return await this._diamond.read.getBroadcastCount();
  }

  /**
   * Get full broadcast pricing info.
   * @returns {{ baseFee: bigint, tierFee: bigint, usersPerTier: bigint, currentUserCount: bigint, currentTier: bigint, currentFee: bigint }}
   */
  async getBroadcastPricing() {
    if (this._v2) {
      const result = await this._v2.read.getBroadcastPricing();
      return {
        baseFee: result[0],
        tierFee: result[1],
        usersPerTier: result[2],
        currentUserCount: result[3],
        currentTier: result[4],
        currentFee: result[5],
      };
    }
    if (!this._diamond) {
      throw new Error('No broadcast contract configured.');
    }
    const result = await this._diamond.read.getBroadcastPricing();
    return {
      baseFee: result[0],
      tierFee: result[1],
      usersPerTier: result[2],
      currentUserCount: result[3],
      currentTier: result[4],
      currentFee: result[5],
    };
  }

  // ---------------------------------------------------------------------------
  // Public API: Bug Reports
  // ---------------------------------------------------------------------------

  /**
   * Send a bug report to SIBYL's inbox. Message is prefixed with [BUG REPORT].
   * @param {string} description - what went wrong
   */
  async reportBug(description) {
    return this.sendMessage(SIBYL_ADDRESS, `[BUG REPORT] ${description}`);
  }
}

export { CONTRACT, SIBYL_ADDRESS, DEFAULTS, DIAMOND, V2 } from './constants.js';
export { AGENTMAIL_ABI, MESSAGE_SENT_EVENT, BROADCAST_ABI, BROADCAST_EVENT, PING_V2_ABI, AVATAR_UPDATED_EVENT } from './abi.js';
