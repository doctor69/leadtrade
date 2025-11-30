# Requirements Document

## Introduction

This specification covers the final checks and fixes required before releasing the MVP of LeadTrade. The focus is on ensuring proper user signup integration with Alpaca, data storage optimization, theming fixes, websocket reliability, and workspace cleanup to deliver a production-ready application.

## Requirements

### Requirement 1: Alpaca Signup Integration

**User Story:** As a new user, I want to sign up to LeadTrade and automatically have an Alpaca brokerage account created with the app's credentials, so that I can start trading immediately without manual account setup.

#### Acceptance Criteria

1. WHEN a user completes the signup form THEN the system SHALL create an Alpaca account using the app's credentials
2. WHEN the Alpaca account creation is successful THEN the system SHALL store the returned Alpaca account data for the user
3. WHEN the Alpaca account creation fails THEN the system SHALL provide clear error messaging and rollback the signup process
4. WHEN storing Alpaca data THEN the system SHALL only store essential account information and NOT store trade data
5. IF the user already has an account THEN the system SHALL prevent duplicate account creation

### Requirement 2: Data Storage Optimization

**User Story:** As a system administrator, I want to optimize data storage by only storing essential user and copy trading data while pulling trade data from Alpaca, so that the system remains efficient and reduces storage costs.

#### Acceptance Criteria

1. WHEN storing user data THEN the system SHALL only store Alpaca account identifiers and essential user profile information
2. WHEN handling trade data THEN the system SHALL pull all trade information from Alpaca APIs in real-time
3. WHEN managing copy trading THEN the system SHALL store only copy trading relationships and allocation data
4. WHEN cleaning the database THEN the system SHALL remove all unnecessary trade data storage tables
5. WHEN accessing trade history THEN the system SHALL fetch data from Alpaca APIs with proper caching

### Requirement 3: Supabase Functions Implementation

**User Story:** As a developer, I want all required Alpaca API functions implemented in Supabase edge functions according to the technical requirements, so that the system can properly integrate with Alpaca services.

#### Acceptance Criteria

1. WHEN reviewing the PDF requirements THEN all specified functions SHALL be implemented in Supabase functions
2. WHEN implementing functions THEN each function SHALL handle authentication and error cases properly
3. WHEN calling Alpaca APIs THEN the system SHALL use proper rate limiting and retry logic
4. WHEN functions fail THEN the system SHALL provide meaningful error responses
5. WHEN deploying functions THEN all functions SHALL be tested and verified working

### Requirement 4: Theming Engine Fix

**User Story:** As a user, I want the theming system to work consistently across sessions and after authentication, so that my preferred theme persists and functions properly.

#### Acceptance Criteria

1. WHEN a user selects a theme THEN the theme SHALL persist using cookies only (no database storage)
2. WHEN a user signs up or logs in THEN the theme SHALL continue working without breaking
3. WHEN starting a new session THEN the theme SHALL load correctly from cookies
4. WHEN the theme system fails THEN it SHALL fallback to a default theme gracefully
5. WHEN switching themes THEN the change SHALL be immediate and persistent

### Requirement 5: WebSocket Market Data with Fallback

**User Story:** As a trader, I want reliable real-time market data through WebSocket connections with automatic fallback to REST APIs, so that I always have access to current market information.

#### Acceptance Criteria

1. WHEN connecting to market data THEN the system SHALL attempt WebSocket connection first
2. WHEN WebSocket connection fails THEN the system SHALL retry up to 3 times before falling back
3. WHEN WebSocket fallback occurs THEN the system SHALL use Alpaca REST API calls for market data
4. WHEN displaying market data THEN all tables except leaderboard SHALL use Alpaca data
5. WHEN WebSocket reconnects THEN the system SHALL seamlessly switch back from REST fallback

### Requirement 6: Database Schema Cleanup

**User Story:** As a system administrator, I want clean database migrations that create all necessary tables from scratch, so that the database schema is optimized and maintainable.

#### Acceptance Criteria

1. WHEN cleaning SQL files THEN all existing migration files SHALL be consolidated or replaced
2. WHEN creating new migrations THEN they SHALL create all required tables from scratch
3. WHEN defining tables THEN only essential tables for user data and copy trading SHALL be included
4. WHEN removing tables THEN all trade data storage tables SHALL be eliminated
5. WHEN applying migrations THEN the schema SHALL support all MVP functionality

### Requirement 7: Workspace Cleanup

**User Story:** As a developer, I want a clean and organized workspace with only necessary files, so that the codebase is maintainable and deployment-ready.

#### Acceptance Criteria

1. WHEN reviewing files THEN all unused or redundant files SHALL be identified and removed
2. WHEN cleaning components THEN only actively used components SHALL remain
3. WHEN organizing utilities THEN duplicate or obsolete utility functions SHALL be removed
4. WHEN cleaning tests THEN only relevant and passing tests SHALL be kept
5. WHEN finalizing cleanup THEN the workspace SHALL contain only production-necessary files

### Requirement 8: MVP Quality Assurance

**User Story:** As a product owner, I want comprehensive quality checks performed before MVP release, so that users have a stable and functional trading platform.

#### Acceptance Criteria

1. WHEN testing signup flow THEN the complete user journey SHALL work end-to-end
2. WHEN testing trading features THEN all core trading functionality SHALL be verified
3. WHEN testing copy trading THEN leader-follower relationships SHALL function correctly
4. WHEN testing market data THEN real-time data display SHALL work reliably
5. WHEN performing final checks THEN all critical user paths SHALL be validated