# Requirements Document

## Introduction

LeadTrade has completed comprehensive Alpaca Broker API integration with 45 production Edge Functions covering account management, trading, funding, and compliance. To advance from sandbox to Limited Live environment, we must ensure all technical requirements specified by Alpaca are fully implemented and testable. This spec focuses on verifying existing implementations and filling any gaps required for Alpaca's technical sign-off.

## Glossary

- **Limited Live**: Alpaca's pre-production environment allowing up to 35 real accounts with $5000 max buying power
- **Tech Sign-off**: Alpaca's technical review ensuring all key endpoints and functions work correctly
- **Trade Confirmations**: Regulatory-required notifications sent to users after trade execution
- **Monthly Statements**: Regulatory-required account statements delivered to users monthly
- **Events API**: Real-time notification system for account status changes and re-submissions
- **PII**: Personally Identifiable Information that must be updateable for compliance
- **Balance Check**: Verification that account balances match Alpaca's records

## Requirements

### Requirement 1: User Authentication Verification

**User Story:** As Alpaca's tech consultant, I want to verify user authentication works correctly, so that I can confirm secure access control is implemented.

#### Acceptance Criteria

1. WHEN a user signs up THEN the System SHALL create both Supabase auth account and Alpaca brokerage account atomically
2. WHEN Alpaca account creation fails THEN the System SHALL rollback the Supabase auth account to maintain data consistency
3. WHEN a user signs in THEN the System SHALL validate credentials against Supabase Auth and retrieve associated Alpaca account ID
4. WHEN authentication fails THEN the System SHALL return appropriate error messages without exposing sensitive information
5. WHEN a session expires THEN the System SHALL require re-authentication before allowing trading operations

### Requirement 2: Account Funding Verification

**User Story:** As a user, I want to fund my account via ACH or wire transfer, so that I can begin trading with real money.

#### Acceptance Criteria

1. WHEN linking a bank account THEN the System SHALL create and store bank relationship with proper validation
2. WHEN initiating an ACH transfer THEN the System SHALL create transfer request with correct relationship ID and amount
3. WHEN initiating a wire transfer THEN the System SHALL provide complete wire instructions including reference numbers
4. WHEN viewing transfer history THEN the System SHALL display all transfers with current status and timestamps
5. WHEN a transfer completes THEN the System SHALL update account buying power to reflect new funds

### Requirement 3: Buy Order Execution

**User Story:** As a user, I want to place buy orders for stocks and options, so that I can build my portfolio.

#### Acceptance Criteria

1. WHEN placing a market buy order THEN the System SHALL submit order to Alpaca with correct symbol, quantity, and side
2. WHEN placing a limit buy order THEN the System SHALL include limit price in order submission
3. WHEN buying options THEN the System SHALL validate account options approval level before submission
4. WHEN order is submitted THEN the System SHALL return order ID and initial status
5. WHEN order fills THEN the System SHALL update positions and send trade confirmation

### Requirement 4: Sell Order Execution

**User Story:** As a user, I want to place sell orders to close positions, so that I can realize gains or cut losses.

#### Acceptance Criteria

1. WHEN placing a market sell order THEN the System SHALL verify sufficient position quantity exists
2. WHEN placing a limit sell order THEN the System SHALL include limit price in order submission
3. WHEN selling options THEN the System SHALL validate position ownership before submission
4. WHEN sell order fills THEN the System SHALL update positions and account cash balance
5. WHEN attempting to sell more than owned THEN the System SHALL reject order with clear error message

### Requirement 5: Position Display

**User Story:** As a user, I want to view my current positions, so that I can monitor my portfolio holdings.

#### Acceptance Criteria

1. WHEN viewing positions THEN the System SHALL display symbol, quantity, cost basis, current value, and unrealized P&L
2. WHEN positions include options THEN the System SHALL display option-specific details including strike, expiration, and type
3. WHEN positions update THEN the System SHALL refresh display with current market prices
4. WHEN no positions exist THEN the System SHALL display appropriate empty state message
5. WHEN positions are closed THEN the System SHALL remove them from active positions display

### Requirement 6: Transaction History

**User Story:** As a user, I want to view my transaction history, so that I can review all account activity.

#### Acceptance Criteria

1. WHEN viewing transaction history THEN the System SHALL display all orders with status, timestamps, and fill details
2. WHEN filtering transactions THEN the System SHALL support filtering by date range, symbol, and order status
3. WHEN viewing order details THEN the System SHALL show complete order information including executions
4. WHEN transactions include fees THEN the System SHALL display fee amounts separately
5. WHEN paginating history THEN the System SHALL support loading additional historical records

### Requirement 7: Statements and Trade Confirmations

**User Story:** As a user, I want to receive trade confirmations and monthly statements, so that I have regulatory-required documentation.

#### Acceptance Criteria

1. WHEN a trade executes THEN the System SHALL generate and deliver trade confirmation to user's email
2. WHEN month ends THEN the System SHALL generate monthly statement with all account activity
3. WHEN viewing statements THEN the System SHALL provide access to download PDF statements
4. WHEN trade confirmation email is enabled THEN the System SHALL send confirmations for all trades
5. WHEN user opts out THEN the System SHALL respect email preferences while maintaining regulatory compliance

### Requirement 8: Events and Notifications

**User Story:** As a user, I want to receive real-time notifications about account events, so that I stay informed of important changes.

#### Acceptance Criteria

1. WHEN account status changes THEN the System SHALL stream event via SSE to connected clients
2. WHEN trade executes THEN the System SHALL send real-time notification with execution details
3. WHEN transfer status updates THEN the System SHALL notify user of status change
4. WHEN corporate action affects holdings THEN the System SHALL notify user with action details
5. WHEN connection drops THEN the System SHALL automatically reconnect and resume event streaming

### Requirement 9: Internal Operations Testing

**User Story:** As a platform administrator, I want to test all internal operations, so that I can verify system reliability before launch.

#### Acceptance Criteria

1. WHEN testing journal operations THEN the System SHALL successfully transfer cash and securities between accounts
2. WHEN testing instant funding THEN the System SHALL provide immediate liquidity within configured limits
3. WHEN testing rebalancing THEN the System SHALL execute portfolio rebalancing according to target weights
4. WHEN testing batch operations THEN the System SHALL handle multiple simultaneous requests correctly
5. WHEN testing error scenarios THEN the System SHALL handle failures gracefully with proper rollback

### Requirement 10: Account Status in Events API

**User Story:** As a user, I want my account status to be monitored via Events API, so that re-submissions are handled automatically.

#### Acceptance Criteria

1. WHEN account requires additional information THEN the System SHALL detect status change via Events API
2. WHEN KYC verification fails THEN the System SHALL notify user and provide re-submission interface
3. WHEN account is approved THEN the System SHALL update UI to enable trading features
4. WHEN account is rejected THEN the System SHALL display rejection reasons and next steps
5. WHEN re-submitting information THEN the System SHALL track submission status via Events API

### Requirement 11: Personal Information Updates

**User Story:** As a user, I want to update my personal information, so that my account details remain current and compliant.

#### Acceptance Criteria

1. WHEN updating contact information THEN the System SHALL validate and submit changes to Alpaca
2. WHEN updating identity information THEN the System SHALL require appropriate verification
3. WHEN updating trusted contact THEN the System SHALL store updated contact details
4. WHEN updating disclosures THEN the System SHALL record disclosure responses with timestamps
5. WHEN changes are submitted THEN the System SHALL confirm successful update or provide error details

### Requirement 12: Balance Verification

**User Story:** As a platform administrator, I want to verify account balances match Alpaca's records, so that I can ensure data accuracy.

#### Acceptance Criteria

1. WHEN retrieving account balance THEN the System SHALL display cash, buying power, and portfolio value
2. WHEN comparing with Alpaca THEN the System SHALL match cash balance exactly
3. WHEN positions exist THEN the System SHALL calculate portfolio value matching Alpaca's calculation
4. WHEN discrepancies exist THEN the System SHALL log differences for investigation
5. WHEN balance updates THEN the System SHALL refresh display with current values from Alpaca API

