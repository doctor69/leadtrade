# Requirements Document

## Introduction

LeadTrade is a copy trading platform that enables experienced traders to share their trading strategies while allowing novice traders to automatically replicate successful trades. The platform integrates with Alpaca API for trade execution and uses Supabase for user management and business logic. Users can choose to be leaders (sharing trades), followers (copying trades), or both, with flexible privacy controls and asset allocation options.

## Requirements

### Requirement 1: User Registration and Alpaca Integration

**User Story:** As a new user, I want to sign up for LeadTrade and automatically get an Alpaca trading account, so that I can start trading or copy trading immediately.

#### Acceptance Criteria

1. WHEN a user completes the LeadTrade signup form THEN the system SHALL create both a Supabase user account and an Alpaca trading account
2. WHEN the Alpaca account creation is successful THEN the system SHALL store the Alpaca authentication tokens securely in the user profile
3. IF the Alpaca account creation fails THEN the system SHALL rollback the Supabase user creation and display an error message
4. WHEN a user signs up THEN the system SHALL redirect them to the LeaderBoard page to explore copy trading options

### Requirement 2: Trading Mode Selection

**User Story:** As a user, I want to choose between paper trading and real trading modes, so that I can practice without risk or trade with real money.

#### Acceptance Criteria

1. WHEN a user accesses their account settings THEN the system SHALL display a toggle for paper trading vs real trading mode
2. WHEN a user switches trading modes THEN the system SHALL use the appropriate Alpaca API endpoints and credentials
3. WHEN in paper trading mode THEN the system SHALL use paper trading API keys and URLs
4. WHEN in real trading mode THEN the system SHALL use live trading API keys and URLs
5. WHEN a user's trading mode changes THEN the system SHALL update their profile in the database

### Requirement 3: Leader Privacy and Sharing Controls

**User Story:** As a trader, I want to control whether my trades are visible to others and whether my asset amounts are shown, so that I can maintain my desired level of privacy while participating in the platform.

#### Acceptance Criteria

1. WHEN a user signs up THEN the system SHALL present options to share trade information for leaderboard inclusion
2. IF a user chooses to share trades THEN the system SHALL present an additional option to show asset amounts
3. WHEN a user enables trade sharing THEN their trades SHALL appear in the leaderboard and be available for copying
4. WHEN a user enables asset amount visibility THEN their portfolio values SHALL be displayed to potential followers
5. WHEN a user disables asset amount visibility THEN their trades SHALL still be copyable but portfolio values SHALL remain hidden
6. WHEN a user disables trade sharing THEN their account SHALL not appear in the leaderboard

### Requirement 4: Copy Trading Subscription System

**User Story:** As a follower, I want to subscribe to multiple successful traders and allocate different percentages of my portfolio to copy their trades, so that I can diversify my copy trading strategy.

#### Acceptance Criteria

1. WHEN a user views the leaderboard THEN the system SHALL display available traders with their performance metrics
2. WHEN a user selects a trader to follow THEN the system SHALL allow them to specify a percentage of their portfolio to allocate
3. WHEN a user subscribes to multiple traders THEN the system SHALL ensure the total allocation percentages do not exceed 100%
4. WHEN a leader executes a trade using X% of their portfolio THEN the system SHALL execute a proportional trade for each follower using X% of their allocated amount
5. WHEN a follower has insufficient funds for a proportional trade THEN the system SHALL execute the maximum possible trade within their allocated budget

### Requirement 5: Options Trading Support

**User Story:** As a trader, I want to trade options and have my options trades copied by my followers, so that I can maximize profit potential through leveraged instruments.

#### Acceptance Criteria

1. WHEN a leader places an options trade THEN the system SHALL capture the trade details including strike price, expiration, and option type
2. WHEN an options trade is executed by a leader THEN the system SHALL replicate the trade for all followers based on their allocation percentages
3. WHEN a follower lacks sufficient funds for options trading THEN the system SHALL skip the options trade and log the event
4. WHEN displaying trade history THEN the system SHALL clearly distinguish between stock trades and options trades

### Requirement 6: Real-time WebSocket Integration

**User Story:** As a user, I want to see real-time market data and trade updates, so that I can make informed decisions and see immediate results of copy trades.

#### Acceptance Criteria

1. WHEN a user accesses trading pages THEN the system SHALL establish authenticated WebSocket connections to Alpaca
2. WHEN market data updates are received THEN the system SHALL update the UI in real-time without page refresh
3. WHEN a trade is executed THEN the system SHALL broadcast the update to relevant followers via WebSocket
4. WHEN WebSocket authentication fails THEN the system SHALL fall back to polling for updates and display a connection status indicator

### Requirement 7: Theme Customization System

**User Story:** As a user, I want to customize the color theme of the application, so that I can personalize my trading interface according to my preferences.

#### Acceptance Criteria

1. WHEN a user accesses theme settings THEN the system SHALL display a color picker for primary theme color
2. WHEN a user selects a new theme color THEN the system SHALL update all UI components to use the new color scheme
3. WHEN a user switches between light and dark modes THEN the system SHALL maintain their custom color selection
4. WHEN a user's theme preferences are changed THEN the system SHALL persist the settings across browser sessions

### Requirement 8: Database Schema for Copy Trading

**User Story:** As the system, I need to store user relationships, allocation percentages, and trade copying history, so that the copy trading functionality can operate reliably.

#### Acceptance Criteria

1. WHEN the system is deployed THEN it SHALL have tables for user profiles, leader-follower relationships, and trade history
2. WHEN a user follows a leader THEN the system SHALL store the relationship with allocation percentage in the database
3. WHEN trades are copied THEN the system SHALL log the original trade, copied trades, and execution results
4. WHEN querying user data THEN the system SHALL exclude social security numbers and other sensitive PII from storage

### Requirement 9: Authentication and Authorization

**User Story:** As a user, I want secure authentication that works seamlessly with both LeadTrade and Alpaca, so that my trading account and personal information are protected.

#### Acceptance Criteria

1. WHEN a user signs up THEN the system SHALL create secure authentication credentials in Supabase
2. WHEN a user logs in THEN the system SHALL authenticate against Supabase and retrieve Alpaca tokens
3. WHEN making Alpaca API calls THEN the system SHALL use the user's stored authentication tokens
4. WHEN authentication tokens expire THEN the system SHALL refresh them automatically or prompt for re-authentication
5. WHEN a user logs out THEN the system SHALL invalidate all active sessions and clear stored tokens

### Requirement 10: OAuth 2.0 Social Authentication

**User Story:** As a user, I want to sign up and log in using my Google or Apple account, so that I can quickly access the platform without creating new credentials.

#### Acceptance Criteria

1. WHEN a user visits the signup page THEN the system SHALL display options for Google and Apple OAuth sign-in
2. WHEN a user selects Google OAuth THEN the system SHALL redirect to Google's authentication flow
3. WHEN a user selects Apple OAuth THEN the system SHALL redirect to Apple's authentication flow
4. WHEN OAuth authentication is successful THEN the system SHALL create a Supabase user account with the OAuth provider information
5. WHEN an OAuth user signs up THEN the system SHALL still create an associated Alpaca trading account
6. WHEN an existing OAuth user logs in THEN the system SHALL authenticate them directly without requiring additional credentials

### Requirement 11: Static Page Optimization

**User Story:** As a user, I want fast page loads and responsive interactions, so that I can trade efficiently without delays.

#### Acceptance Criteria

1. WHEN pages don't require user-specific data THEN the system SHALL serve them as static pages
2. WHEN static pages need real-time updates THEN the system SHALL use client-side WebSocket connections
3. WHEN user-specific data is required THEN the system SHALL use server-side rendering with Supabase integration
4. WHEN static pages are built THEN the system SHALL include necessary WebSocket connection code for real-time features