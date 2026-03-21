export const AGENTMAIL_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: '_messageFee', type: 'uint256' },
      { internalType: 'address', name: '_treasury', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  { inputs: [], name: 'AlreadyRegistered', type: 'error' },
  { inputs: [], name: 'BioTooLong', type: 'error' },
  { inputs: [], name: 'ContentTooLong', type: 'error' },
  { inputs: [], name: 'InsufficientFee', type: 'error' },
  { inputs: [], name: 'InvalidUsername', type: 'error' },
  { inputs: [], name: 'NotRegistered', type: 'error' },
  { inputs: [], name: 'NotTreasury', type: 'error' },
  { inputs: [], name: 'RecipientNotRegistered', type: 'error' },
  { inputs: [], name: 'TransferFailed', type: 'error' },
  { inputs: [], name: 'UsernameTaken', type: 'error' },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'wallet', type: 'address' },
      { indexed: false, internalType: 'string', name: 'bio', type: 'string' },
    ],
    name: 'BioUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'from', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      { indexed: false, internalType: 'string', name: 'content', type: 'string' },
    ],
    name: 'MessageSent',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'wallet', type: 'address' },
      { indexed: false, internalType: 'string', name: 'username', type: 'string' },
    ],
    name: 'UserRegistered',
    type: 'event',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'addressToBio',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'addressToUsername',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: 'username', type: 'string' }],
    name: 'getAddress',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'wallet', type: 'address' }],
    name: 'getBio',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'index', type: 'uint256' }],
    name: 'getUserAtIndex',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getUserCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'wallet', type: 'address' }],
    name: 'getUsername',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'messageFee',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: 'username', type: 'string' }],
    name: 'register',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'registeredUsers',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'string', name: 'content', type: 'string' },
    ],
    name: 'sendMessage',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: 'bio', type: 'string' }],
    name: 'setBio',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'treasury',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'userCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    name: 'usernameToAddress',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'withdrawFees',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

export const MESSAGE_SENT_EVENT = {
  type: 'event',
  name: 'MessageSent',
  inputs: [
    { name: 'from', type: 'address', indexed: true },
    { name: 'to', type: 'address', indexed: true },
    { name: 'content', type: 'string', indexed: false },
  ],
};

export const USER_REGISTERED_EVENT = {
  type: 'event',
  name: 'UserRegistered',
  inputs: [
    { name: 'wallet', type: 'address', indexed: true },
    { name: 'username', type: 'string', indexed: false },
  ],
};

export const BIO_UPDATED_EVENT = {
  type: 'event',
  name: 'BioUpdated',
  inputs: [
    { name: 'wallet', type: 'address', indexed: true },
    { name: 'bio', type: 'string', indexed: false },
  ],
};

export const AVATAR_UPDATED_EVENT = {
  type: 'event',
  name: 'AvatarUpdated',
  inputs: [
    { name: 'wallet', type: 'address', indexed: true },
    { name: 'avatar', type: 'string', indexed: false },
  ],
};

// ---------------------------------------------------------------------------
// Ping v2 Diamond ABI (superset of v1 + new functions)
// ---------------------------------------------------------------------------

export const PING_V2_ABI = [
  // --- Registry ---
  {
    inputs: [{ internalType: 'string', name: 'username', type: 'string' }],
    name: 'register',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'wallet', type: 'address' }],
    name: 'getUsername',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: 'username', type: 'string' }],
    name: 'getAddress',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'wallet', type: 'address' }],
    name: 'isRegistered',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getUserCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'index', type: 'uint256' }],
    name: 'getUserAtIndex',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  // --- Bio ---
  {
    inputs: [{ internalType: 'string', name: 'bio', type: 'string' }],
    name: 'setBio',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'wallet', type: 'address' }],
    name: 'getBio',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  // --- Avatar (v2 only) ---
  {
    inputs: [{ internalType: 'string', name: 'avatar', type: 'string' }],
    name: 'setAvatar',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'wallet', type: 'address' }],
    name: 'getAvatar',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  // --- Messaging ---
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'string', name: 'content', type: 'string' },
    ],
    name: 'sendMessage',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'messageFee',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // --- Broadcast ---
  {
    inputs: [{ internalType: 'string', name: 'content', type: 'string' }],
    name: 'broadcast',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getBroadcastFee',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getBroadcastCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getBroadcastPricing',
    outputs: [
      { internalType: 'uint256', name: 'baseFee', type: 'uint256' },
      { internalType: 'uint256', name: 'tierFee', type: 'uint256' },
      { internalType: 'uint256', name: 'usersPerTier', type: 'uint256' },
      { internalType: 'uint256', name: 'totalUsers', type: 'uint256' },
      { internalType: 'uint256', name: 'currentTier', type: 'uint256' },
      { internalType: 'uint256', name: 'currentFee', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTotalUserCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // --- Admin ---
  {
    inputs: [],
    name: 'treasury',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'v1Contract',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'withdrawFees',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_fee', type: 'uint256' }],
    name: 'setMessageFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // --- Events ---
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'from', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      { indexed: false, internalType: 'string', name: 'content', type: 'string' },
    ],
    name: 'MessageSent',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'wallet', type: 'address' },
      { indexed: false, internalType: 'string', name: 'username', type: 'string' },
    ],
    name: 'UserRegistered',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'sender', type: 'address' },
      { indexed: false, internalType: 'string', name: 'content', type: 'string' },
      { indexed: true, internalType: 'uint256', name: 'broadcastId', type: 'uint256' },
    ],
    name: 'Broadcast',
    type: 'event',
  },
  // --- Errors ---
  { inputs: [], name: 'AlreadyRegistered', type: 'error' },
  { inputs: [], name: 'UsernameTaken', type: 'error' },
  { inputs: [], name: 'InvalidUsername', type: 'error' },
  { inputs: [], name: 'NotRegistered', type: 'error' },
  { inputs: [], name: 'RecipientNotRegistered', type: 'error' },
  { inputs: [], name: 'ContentTooLong', type: 'error' },
  { inputs: [], name: 'InsufficientFee', type: 'error' },
  { inputs: [], name: 'BioTooLong', type: 'error' },
  { inputs: [], name: 'AvatarTooLong', type: 'error' },
  { inputs: [], name: 'InsufficientBroadcastFee', type: 'error' },
  { inputs: [], name: 'NotRegisteredOnPing', type: 'error' },
  { inputs: [], name: 'BroadcastContentTooLong', type: 'error' },
];

// ---------------------------------------------------------------------------
// Diamond: BroadcastFacet ABI
// ---------------------------------------------------------------------------

export const BROADCAST_ABI = [
  {
    inputs: [{ internalType: 'string', name: 'content', type: 'string' }],
    name: 'broadcast',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getBroadcastFee',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getBroadcastCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getBroadcastPricing',
    outputs: [
      { internalType: 'uint256', name: 'baseFee', type: 'uint256' },
      { internalType: 'uint256', name: 'tierFee', type: 'uint256' },
      { internalType: 'uint256', name: 'usersPerTier', type: 'uint256' },
      { internalType: 'uint256', name: 'currentUserCount', type: 'uint256' },
      { internalType: 'uint256', name: 'currentTier', type: 'uint256' },
      { internalType: 'uint256', name: 'currentFee', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_baseFee', type: 'uint256' }],
    name: 'setBaseFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_tierFee', type: 'uint256' }],
    name: 'setTierFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_usersPerTier', type: 'uint256' }],
    name: 'setUsersPerTier',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  { inputs: [], name: 'InsufficientBroadcastFee', type: 'error' },
  { inputs: [], name: 'NotRegisteredOnPing', type: 'error' },
  { inputs: [], name: 'BroadcastContentTooLong', type: 'error' },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'sender', type: 'address' },
      { indexed: false, internalType: 'string', name: 'content', type: 'string' },
      { indexed: true, internalType: 'uint256', name: 'broadcastId', type: 'uint256' },
    ],
    name: 'Broadcast',
    type: 'event',
  },
];

export const BROADCAST_EVENT = {
  type: 'event',
  name: 'Broadcast',
  inputs: [
    { name: 'sender', type: 'address', indexed: true },
    { name: 'content', type: 'string', indexed: false },
    { name: 'broadcastId', type: 'uint256', indexed: true },
  ],
};
