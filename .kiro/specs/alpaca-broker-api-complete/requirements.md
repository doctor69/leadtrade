# Requirements Document

## Introduction

LeadTrade currently implements a subset of the Alpaca Broker API endpoints. To prepare for production launch, we need to implement all remaining Alpaca Broker API endpoints to provide comprehensive account management, trading, funding, and compliance capabilities. This spec covers the implementation of all missing API endpoints from the Alpaca Broker API specification.

## Glossary

- **Alpaca Broker API**: The complete API provided by Alpaca for broker partners to manage customer accounts and trading
- **Edge Function**: Supabase serverless function that acts as a secure proxy to Alpaca API
- **KYC**: Know Your Customer - identity verification process required for brokerage accounts
- **CIP**: Customer Identification Program - regulatory requirement for verifying customer identity
- **ACH**: Automated Clearing House - electronic network for financial transactions
- **JIT**: Just-In-Time funding system for instant liquidity
- **SSE**: Server-Sent Events - protocol for real-time event streaming
- **OAuth**: Open Authorization standard for secure API access delegation
- **PDT**: Pattern Day Trader - regulatory designation for active traders
- **RLS**: Row Level Security - Supabase database security feature

## Requirements

### Requirement 1: Account Management API Completion

**User Story:** As a platform administrator, I want complete account management capabilities through the Alpaca API, so that I can handle all account lifecycle operations.

#### Acceptance Criteria

1. WHEN retrieving all accounts THEN the System SHALL support filtering by query, created_after, created_before, status, sort, and entities parameters
2. WHEN updating an account THEN the System SHALL support PATCH operations for contact, identity, disclosures, and trusted_contact fields
3. WHEN requesting options approval THEN the System SHALL submit the request with the specified level and track approval status
4. WHEN closing an account THEN the System SHALL verify all positions are closed and funds withdrawn before allowing closure
5. WHEN retrieving account activities THEN the System SHALL support pagination with page_token and page_size parameters

### Requirement 2: Document Management Implementation

**User Story:** As a user, I want to upload and manage account documents, so that I can complete KYC requirements and maintain compliance.

#### Acceptance Criteria

1. WHEN uploading a document THEN the System SHALL accept document_type, document_sub_type, content (base64), and mime_type
2. WHEN downloading a document THEN the System SHALL return a pre-signed URL with 301 redirect
3. WHEN listing documents THEN the System SHALL return all documents associated with the account
4. WHEN uploading W8BEN forms THEN the System SHALL accept JSON, JSONC, PNG, JPEG, or PDF formats
5. WHEN document size exceeds 10MB THEN the System SHALL reject the upload with appropriate error message

### Requirement 3: Bank Relationship and ACH Management

**User Story:** As a user, I want to link my bank account and manage ACH transfers, so that I can fund my trading account efficiently.

#### Acceptance Criteria

1. WHEN creating a bank relationship THEN the System SHALL store bank_code, bank_code_type, account_number, and account owner details
2. WHEN creating an ACH relationship THEN the System SHALL validate routing number and account number format
3. WHEN retrieving bank relationships THEN the System SHALL support filtering by status and bank_name
4. WHEN deleting a bank relationship THEN the System SHALL verify no pending transfers exist
5. WHEN creating ACH relationships THEN the System SHALL support both manual entry and Plaid processor tokens

### Requirement 4: Transfer and Funding Operations

**User Story:** As a user, I want to initiate deposits and withdrawals, so that I can move funds between my bank and trading account.

#### Acceptance Criteria

1. WHEN requesting a transfer THEN the System SHALL support ach, wire, and sandbox transfer types
2. WHEN listing transfers THEN the System SHALL support filtering by direction, limit, and offset
3. WHEN canceling a transfer THEN the System SHALL only allow cancellation of pending transfers
4. WHEN creating wire transfers THEN the System SHALL require additional_information and fee_payment_method
5. WHEN in sandbox mode THEN the System SHALL allow instant virtual deposits and withdrawals

### Requirement 5: Trading Configuration Management

**User Story:** As a platform administrator, I want to configure trading settings for accounts, so that I can manage risk and compliance requirements.

#### Acceptance Criteria

1. WHEN updating trading configurations THEN the System SHALL support dtbp_check, trade_confirm_email, suspend_trade, no_shorting, fractional_trading, max_margin_multiplier, pdt_check, ptp_no_exception_entry, and max_options_trading_level
2. WHEN setting margin multiplier THEN the System SHALL enforce limits based on account equity
3. WHEN enabling fractional trading THEN the System SHALL update account capabilities immediately
4. WHEN suspending trading THEN the System SHALL prevent new order submissions while allowing cancellations
5. WHEN configuring PDT settings THEN the System SHALL track day trade count and enforce restrictions

### Requirement 6: Pattern Day Trader (PDT) Management

**User Story:** As a user, I want to view my PDT status and exercise one-time removal if eligible, so that I can manage day trading restrictions.

#### Acceptance Criteria

1. WHEN retrieving PDT status THEN the System SHALL return pdt flag, pdt_removed flag, and pdt_removed_at timestamp
2. WHEN exercising PDT removal THEN the System SHALL verify account is currently flagged as PDT
3. WHEN PDT removal is successful THEN the System SHALL update account status and return confirmation
4. WHEN PDT removal is already used THEN the System SHALL return 403 error with appropriate message
5. WHEN account is not PDT THEN the System SHALL return 403 error indicating ineligibility

### Requirement 7: Options Trading Implementation

**User Story:** As a user, I want to trade options contracts and exercise positions, so that I can utilize advanced trading strategies.

#### Acceptance Criteria

1. WHEN listing option contracts THEN the System SHALL support filtering by underlying_symbols, status, expiration_date, root_symbol, type, style, and strike_price
2. WHEN retrieving option contract details THEN the System SHALL return complete contract specifications including open_interest and close_price
3. WHEN exercising an option position THEN the System SHALL process the request immediately during market hours
4. WHEN exercising outside market hours THEN the System SHALL reject the request with appropriate error
5. WHEN submitting option orders THEN the System SHALL validate contract availability and account approval level

### Requirement 8: Corporate Actions Handling

**User Story:** As a user, I want to receive notifications about corporate actions affecting my holdings, so that I can understand changes to my positions.

#### Acceptance Criteria

1. WHEN retrieving corporate action announcements THEN the System SHALL support filtering by ca_types, symbol, cusip, date_type, since, and until
2. WHEN a corporate action occurs THEN the System SHALL provide details including ex_date, record_date, payable_date, cash, old_rate, and new_rate
3. WHEN querying by date_type THEN the System SHALL support declaration_date, ex_date, record_date, and payable_date filters
4. WHEN retrieving specific announcement THEN the System SHALL return complete corporate action details by ID
5. WHEN corporate actions affect positions THEN the System SHALL automatically adjust holdings on payable_date

### Requirement 9: Watchlist Management

**User Story:** As a user, I want to create and manage watchlists of securities, so that I can track assets of interest.

#### Acceptance Criteria

1. WHEN creating a watchlist THEN the System SHALL accept name and array of symbols
2. WHEN adding symbols to watchlist THEN the System SHALL validate symbol existence and tradability
3. WHEN updating a watchlist THEN the System SHALL replace entire symbol list atomically
4. WHEN deleting a watchlist THEN the System SHALL remove it permanently without confirmation
5. WHEN retrieving watchlists THEN the System SHALL return complete asset details for each symbol

### Requirement 10: Event Streaming (SSE) Implementation

**User Story:** As a platform, I want to stream real-time events for trades, transfers, journals, and account status, so that I can provide immediate updates to users.

#### Acceptance Criteria

1. WHEN subscribing to trade events THEN the System SHALL stream order status updates via SSE
2. WHEN subscribing to transfer events THEN the System SHALL stream transfer status changes
3. WHEN subscribing to journal events THEN the System SHALL stream journal processing updates
4. WHEN subscribing to account status events THEN the System SHALL stream account lifecycle changes
5. WHEN using pagination parameters THEN the System SHALL support since, until, since_id, until_id, since_ulid, until_ulid

### Requirement 11: Journal Operations

**User Story:** As a platform administrator, I want to create cash and security journals between accounts, so that I can facilitate internal transfers.

#### Acceptance Criteria

1. WHEN creating JNLC journal THEN the System SHALL transfer cash between accounts
2. WHEN creating JNLS journal THEN the System SHALL transfer securities between accounts
3. WHEN creating batch journals THEN the System SHALL support one-to-many and many-to-one operations
4. WHEN journal is pending THEN the System SHALL allow cancellation
5. WHEN journal is executed THEN the System SHALL prevent cancellation and require reverse journal

### Requirement 12: Instant Funding (JIT) System

**User Story:** As a platform, I want to provide instant funding to users, so that they can trade immediately while ACH transfers settle.

#### Acceptance Criteria

1. WHEN creating instant funding request THEN the System SHALL provide immediate liquidity up to configured limits
2. WHEN retrieving instant funding limits THEN the System SHALL show global and per-account limits
3. WHEN generating instant funding reports THEN the System SHALL provide summary and detail report types
4. WHEN creating settlements THEN the System SHALL reconcile instant funding with actual ACH receipts
5. WHEN instant funding deadline passes THEN the System SHALL calculate and apply interest charges

### Requirement 13: Funding Wallet (Multi-Currency) Support

**User Story:** As a user, I want to fund my account in multiple currencies, so that I can trade international assets efficiently.

#### Acceptance Criteria

1. WHEN creating funding wallet THEN the System SHALL generate unique wallet identifiers for each currency
2. WHEN retrieving funding details THEN the System SHALL provide payment instructions for priority and regular transfers
3. WHEN creating withdrawals THEN the System SHALL convert to desired currency and calculate fees
4. WHEN managing recipient banks THEN the System SHALL support international bank details including SWIFT and IBAN
5. WHEN listing transfers THEN the System SHALL show amount, currency, fees, and USD equivalent

### Requirement 14: OAuth Client Management

**User Story:** As a third-party developer, I want to integrate with LeadTrade via OAuth, so that users can authorize access to their accounts.

#### Acceptance Criteria

1. WHEN retrieving OAuth client details THEN the System SHALL return client metadata for authorization page
2. WHEN authorizing OAuth request THEN the System SHALL generate authorization code for token exchange
3. WHEN issuing OAuth token THEN the System SHALL validate client credentials and return access token
4. WHEN OAuth token expires THEN the System SHALL support refresh token flow
5. WHEN OAuth scope is insufficient THEN the System SHALL reject API requests with 403 error

### Requirement 15: KYC and CIP Integration

**User Story:** As a platform, I want to submit and retrieve KYC/CIP information, so that I can comply with regulatory requirements.

#### Acceptance Criteria

1. WHEN uploading CIP information THEN the System SHALL accept provider_name, kyc, document, photo, identity, and watchlist data
2. WHEN retrieving CIP information THEN the System SHALL return complete verification results
3. WHEN using Onfido SDK THEN the System SHALL generate SDK tokens and accept outcome submissions
4. WHEN KYC check fails THEN the System SHALL provide detailed failure reasons
5. WHEN account requires additional verification THEN the System SHALL update account status appropriately

### Requirement 16: Rebalancing API Implementation

**User Story:** As a user, I want automated portfolio rebalancing, so that my allocations stay aligned with my investment strategy.

#### Acceptance Criteria

1. WHEN creating portfolio THEN the System SHALL accept weights, cooldown_days, and rebalance_conditions
2. WHEN subscribing to portfolio THEN the System SHALL link account to portfolio for automatic rebalancing
3. WHEN rebalance conditions are met THEN the System SHALL create and execute rebalancing run
4. WHEN listing runs THEN the System SHALL show status, orders, failed_orders, and skipped_orders
5. WHEN canceling run THEN the System SHALL attempt to cancel pending orders

### Requirement 17: Reporting API Implementation

**User Story:** As a platform administrator, I want comprehensive reporting capabilities, so that I can monitor platform activity and compliance.

#### Acceptance Criteria

1. WHEN retrieving aggregate positions THEN the System SHALL provide platform-wide position summaries by symbol
2. WHEN retrieving EOD positions THEN the System SHALL provide end-of-day snapshots for all accounts
3. WHEN filtering reports THEN the System SHALL support date ranges, symbols, and account filters
4. WHEN including firm accounts THEN the System SHALL allow inclusion or exclusion via parameter
5. WHEN paginating results THEN the System SHALL support page_token and limit parameters

### Requirement 18: Crypto Funding Implementation

**User Story:** As a user, I want to deposit and withdraw cryptocurrency, so that I can trade crypto assets on the platform.

#### Acceptance Criteria

1. WHEN creating crypto wallet THEN the System SHALL generate unique deposit addresses per asset
2. WHEN listing crypto transfers THEN the System SHALL show tx_hash, status, amount, fees, and network_fee
3. WHEN creating crypto withdrawal THEN the System SHALL validate whitelisted addresses
4. WHEN whitelisting address THEN the System SHALL enforce 24-hour waiting period before first use
5. WHEN estimating fees THEN the System SHALL provide current network fee estimates

### Requirement 19: Logo API Integration

**User Story:** As a user, I want to see company logos for stocks and crypto, so that I can quickly identify assets visually.

#### Acceptance Criteria

1. WHEN requesting logo THEN the System SHALL return raw image binary data
2. WHEN logo is unavailable THEN the System SHALL return placeholder with first letter of symbol
3. WHEN placeholder parameter is false THEN the System SHALL return 404 for missing logos
4. WHEN caching logos THEN the System SHALL implement appropriate cache headers
5. WHEN displaying logos THEN the System SHALL handle both stock and crypto symbols

### Requirement 20: Cash Interest APR Management

**User Story:** As a platform administrator, I want to manage APR tiers for cash interest, so that I can offer competitive rates to users.

#### Acceptance Criteria

1. WHEN listing APR tiers THEN the System SHALL return all configured tiers with rates and account counts
2. WHEN assigning APR tier THEN the System SHALL update account's interest calculation
3. WHEN calculating interest THEN the System SHALL use correspondent_rate_bps and account_rate_bps
4. WHEN tier is default THEN the System SHALL apply to new accounts automatically
5. WHEN retrieving tier details THEN the System SHALL show total_accounts and total_balance

### Requirement 21: UI Integration for New APIs

**User Story:** As a user, I want seamless access to all new features through the existing UI, so that I can utilize all platform capabilities.

#### Acceptance Criteria

1. WHEN on account settings page THEN the System SHALL display options for document upload, bank linking, and trading configurations
2. WHEN viewing portfolio THEN the System SHALL show options trading capabilities and corporate action notifications
3. WHEN managing funds THEN the System SHALL provide interfaces for ACH, wire, crypto, and multi-currency funding
4. WHEN viewing profile THEN the System SHALL display KYC status, PDT status, and cash interest tier
5. WHEN using watchlists THEN the System SHALL integrate watchlist management into trading interface

### Requirement 22: API Cleanup and Deprecation

**User Story:** As a developer, I want to remove unused and deprecated API implementations, so that the codebase remains maintainable and secure.

#### Acceptance Criteria

1. WHEN identifying unused APIs THEN the System SHALL mark them for deprecation review
2. WHEN removing deprecated APIs THEN the System SHALL ensure no active UI dependencies exist
3. WHEN cleaning up code THEN the System SHALL remove associated types, tests, and documentation
4. WHEN consolidating APIs THEN the System SHALL merge duplicate implementations
5. WHEN documenting changes THEN the System SHALL update API documentation and migration guides
