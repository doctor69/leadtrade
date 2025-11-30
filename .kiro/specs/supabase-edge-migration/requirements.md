# Requirements Document

## Introduction

This feature involves migrating the LeadTrade platform from Astro API routes to Supabase Edge Functions to enable full static site generation, reduce hosting costs, and improve performance. The migration will maintain all existing functionality while optimizing the architecture for static deployment with only Supabase as the backend service.

## Requirements

### Requirement 1

**User Story:** As a platform owner, I want to migrate all Alpaca API integrations to Supabase Edge Functions, so that I can deploy the frontend as a static site and only pay for Supabase services.

#### Acceptance Criteria

1. WHEN an Alpaca API call is made THEN the system SHALL route the request through Supabase Edge Functions instead of Astro API routes
2. WHEN migrating existing endpoints THEN the system SHALL maintain identical response formats and error handling
3. WHEN deploying the application THEN the system SHALL generate a fully static frontend with no server-side rendering requirements
4. IF an Alpaca API call fails THEN the system SHALL return the same error responses as the current implementation

### Requirement 2

**User Story:** As a developer, I want separate Edge Function endpoints for different market data types, so that I can debug issues more easily and add features incrementally.

#### Acceptance Criteria

1. WHEN requesting market data THEN the system SHALL provide separate endpoints for quotes, bars, and other data types
2. WHEN debugging market data issues THEN the system SHALL allow isolation of specific data type endpoints
3. WHEN adding new market data features THEN the system SHALL support independent deployment of individual endpoints
4. IF one market data endpoint fails THEN the system SHALL NOT affect other market data endpoints

### Requirement 3

**User Story:** As a user, I want real-time market data streaming via persistent WebSocket connections, so that I can receive faster data updates without repeated API calls.

#### Acceptance Criteria

1. WHEN a user session is active THEN the system SHALL maintain a persistent WebSocket connection to Alpaca
2. WHEN session cookies are present THEN the system SHALL keep the WebSocket connection alive
3. WHEN the user session expires THEN the system SHALL close the WebSocket connection
4. WHEN real-time data is received THEN the system SHALL stream it to the frontend faster than REST API calls
5. IF the WebSocket connection fails THEN the system SHALL attempt to reconnect automatically

### Requirement 4

**User Story:** As a platform owner, I want to clean up the codebase by removing unused files and consolidating functionality, so that the application is easier to maintain and deploy.

#### Acceptance Criteria

1. WHEN migrating to Edge Functions THEN the system SHALL remove redundant Astro API route files
2. WHEN cleaning up the codebase THEN the system SHALL identify and remove unused components and utilities
3. WHEN consolidating functionality THEN the system SHALL maintain all existing features without breaking changes
4. IF files are removed THEN the system SHALL ensure no remaining code references the deleted files

### Requirement 5

**User Story:** As a developer, I want all existing Alpaca API functionality migrated to Edge Functions, so that the platform maintains feature parity after migration.

#### Acceptance Criteria

1. WHEN migrating account endpoints THEN the system SHALL preserve all account management functionality
2. WHEN migrating order endpoints THEN the system SHALL maintain all trading capabilities
3. WHEN migrating position endpoints THEN the system SHALL keep all portfolio tracking features
4. WHEN migrating market data endpoints THEN the system SHALL preserve all data retrieval capabilities
5. IF any functionality is lost during migration THEN the system SHALL restore it before deployment

### Requirement 6

**User Story:** As a user, I want the application to work as a fully static web app with Astro API routes in static mode, so that I can access all features while the platform uses Supabase Edge Functions only for dynamic operations like authentication and user data.

#### Acceptance Criteria

1. WHEN the application is deployed THEN the system SHALL generate a fully static web app with Astro API routes working in static mode
2. WHEN users need authentication THEN the system SHALL use Supabase Edge Functions for dynamic authentication operations
3. WHEN users need personal data from the database THEN the system SHALL retrieve it via Supabase Edge Functions and Supabase DB
4. WHEN users interact with static features THEN the system SHALL serve them directly from the static build without server calls
5. IF dynamic operations are needed THEN the system SHALL use only Supabase Edge Functions and Supabase DB, not Astro server-side rendering