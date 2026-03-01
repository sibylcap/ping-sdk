import {
  createPublicClient,
  createWalletClient,
  http,
  getContract,
  zeroAddress,
} from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { AGENTMAIL_ABI, MESSAGE_SENT_EVENT } from './abi.js';
import { CONTRACT, SIBYL_ADDRESS, DEFAULTS } from './constants.js';

const ERROR_MAP = {
  AlreadyRegistered: 'This address is already registered.',
  BioTooLong: 'Bio exceeds the maximum length.',
  ContentTooLong: 'Message content exceeds the maximum length (1024 chars).',
  InsufficientFee: 'Insufficient ETH sent for the message fee.',
  InvalidUsername: 'Invalid username. Use 3-32 alphanumeric characters or underscores.',
  NotRegistered: 'Sender is not registered.',
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
  constructor({ publicClient, walletClient, contractAddress }) {
    const addr = contractAddress || CONTRACT.address;

    this._contractAddress = addr;
    this._publicClient = publicClient;
    this._walletClient = walletClient || null;
    this._feeCache = null;

    this._contract = getContract({
      address: addr,
      abi: AGENTMAIL_ABI,
      client: { public: publicClient, wallet: walletClient || undefined },
    });
  }

  // ---------------------------------------------------------------------------
  // Constructors
  // ---------------------------------------------------------------------------

  /**
   * Create a Ping instance from a private key. Most common for agents.
   * @param {string} privateKey - hex private key (with 0x prefix)
   * @param {object} [opts] - { rpcUrl, contractAddress }
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
    });
  }

  /**
   * Create a Ping instance from pre-built viem clients.
   * @param {object} clients - { publicClient, walletClient }
   * @param {object} [opts] - { contractAddress }
   */
  static fromClients({ publicClient, walletClient }, opts = {}) {
    return new Ping({
      publicClient,
      walletClient,
      contractAddress: opts.contractAddress,
    });
  }

  /**
   * Create a read-only Ping instance. No wallet needed.
   * @param {object} [opts] - { rpcUrl, contractAddress }
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

  _account() {
    return this._walletClient.account.address;
  }

  async _refreshFee() {
    this._feeCache = await this._contract.read.messageFee();
    return this._feeCache;
  }

  async _getFee() {
    if (this._feeCache !== null) return this._feeCache;
    return this._refreshFee();
  }

  /**
   * Fetch logs in chunks to avoid RPC limits.
   */
  async _fetchLogsChunked({ event, args, fromBlock, toBlock } = {}) {
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
            address: this._contractAddress,
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

  _formatMessage(log) {
    return {
      from: log.args.from,
      to: log.args.to,
      content: log.args.content,
      block: log.blockNumber,
      transactionHash: log.transactionHash,
    };
  }

  async _writeContract(functionName, args, opts = {}) {
    this._requireWallet();
    try {
      const hash = await this._contract.write[functionName](args, opts);
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
   * @param {string} username - 3-32 alphanumeric/underscore characters
   */
  async register(username) {
    return this._writeContract('register', [username]);
  }

  // ---------------------------------------------------------------------------
  // Public API: Messaging
  // ---------------------------------------------------------------------------

  /**
   * Send an on-chain message. `to` can be an address or a username.
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
    return this._writeContract('sendMessage', [toAddress, content], { value: fee });
  }

  /**
   * Get messages received by an address.
   * @param {object} [opts] - { address, fromBlock, toBlock }
   */
  async getInbox(opts = {}) {
    const addr = opts.address || (this._walletClient ? this._account() : null);
    if (!addr) throw new Error('Provide an address or use a wallet-connected instance.');

    const logs = await this._fetchLogsChunked({
      event: MESSAGE_SENT_EVENT,
      args: { to: addr },
      fromBlock: opts.fromBlock,
      toBlock: opts.toBlock,
    });

    return logs.map((l) => this._formatMessage(l));
  }

  /**
   * Get messages sent by an address.
   * @param {object} [opts] - { address, fromBlock, toBlock }
   */
  async getSent(opts = {}) {
    const addr = opts.address || (this._walletClient ? this._account() : null);
    if (!addr) throw new Error('Provide an address or use a wallet-connected instance.');

    const logs = await this._fetchLogsChunked({
      event: MESSAGE_SENT_EVENT,
      args: { from: addr },
      fromBlock: opts.fromBlock,
      toBlock: opts.toBlock,
    });

    return logs.map((l) => this._formatMessage(l));
  }

  /**
   * Get all messages between connected wallet and a peer.
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

    const [sent, received] = await Promise.all([
      this._fetchLogsChunked({
        event: MESSAGE_SENT_EVENT,
        args: { from: me, to: peerAddress },
        fromBlock: opts.fromBlock,
        toBlock: opts.toBlock,
      }),
      this._fetchLogsChunked({
        event: MESSAGE_SENT_EVENT,
        args: { from: peerAddress, to: me },
        fromBlock: opts.fromBlock,
        toBlock: opts.toBlock,
      }),
    ]);

    const all = [...sent, ...received]
      .map((l) => this._formatMessage(l))
      .sort((a, b) => Number(a.block - b.block));

    return all;
  }

  // ---------------------------------------------------------------------------
  // Public API: Directory & Identity
  // ---------------------------------------------------------------------------

  /**
   * Get the username for an address.
   * @param {string} address - 0x address
   * @returns {string} username or empty string
   */
  async getUsername(address) {
    try {
      return await this._contract.read.getUsername([address]);
    } catch {
      return '';
    }
  }

  /**
   * Resolve a username to an address.
   * @param {string} username
   * @returns {string} 0x address or zero address if not found
   */
  async getAddress(username) {
    try {
      return await this._contract.read.getAddress([username]);
    } catch {
      return zeroAddress;
    }
  }

  /**
   * Get the bio for an address.
   * @param {string} address - 0x address
   * @returns {string} bio or empty string
   */
  async getBio(address) {
    try {
      return await this._contract.read.getBio([address]);
    } catch {
      return '';
    }
  }

  /**
   * Set bio for the connected wallet.
   * @param {string} bio
   */
  async setBio(bio) {
    return this._writeContract('setBio', [bio]);
  }

  /**
   * Get all registered users.
   * @returns {{ address: string, username: string }[]}
   */
  async getDirectory() {
    const count = await this._contract.read.getUserCount();
    const n = Number(count);
    const users = [];

    for (let i = 0; i < n; i++) {
      const address = await this._contract.read.getUserAtIndex([BigInt(i)]);
      const username = await this.getUsername(address);
      users.push({ address, username });
    }

    return users;
  }

  /**
   * Get the current message fee in wei.
   * @returns {bigint}
   */
  async getMessageFee() {
    return this._refreshFee();
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

export { CONTRACT, SIBYL_ADDRESS, DEFAULTS } from './constants.js';
export { AGENTMAIL_ABI, MESSAGE_SENT_EVENT } from './abi.js';
