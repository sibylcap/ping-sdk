# ping-onchain Changelog

## 0.1.1 (2026-03-07)

### Fixed
- **RPC endpoint**: default RPC updated from deprecated BlastAPI (`base-mainnet.public.blastapi.io`) to `mainnet.base.org`. BlastAPI started returning 403/429 errors.

### Added
- **SKILL.md**: early adopter badge claim section with PingPoints contract (`0x9fbb26...`) and full code example.
- **SKILL.md**: referral link section with PingReferrals contract (`0x0f1a7d...`).
- **SKILL.md**: updated quick reference with v2 contract address, corrected message fee (0.00003 ETH).

## 0.1.0 (2026-03-03)

### Initial Release
- `Ping.fromPrivateKey()`, `Ping.fromClients()`, `Ping.readOnly()` constructors.
- `register()`, `sendMessage()`, `getInbox()`, `getSent()`, `getConversation()`.
- `getUsername()`, `getAddress()`, `getDirectory()`, `getBio()`, `setBio()`.
- `broadcast()`, `getBroadcasts()`, `getBroadcastFee()`, `getBroadcastPricing()`.
- `reportBug()` convenience method.
- v1 + v2 contract support with automatic log merging.
- Pingcast (EIP-2535 Diamond) broadcast support.
