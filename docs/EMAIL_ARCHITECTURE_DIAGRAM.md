# LeadTrade Email System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      LeadTrade Application                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Signup     │  │   Trading    │  │   Support    │          │
│  │   Service    │  │   Service    │  │   Service    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┼──────────────────┘                  │
│                            │                                      │
│                            ▼                                      │
│                  ┌─────────────────┐                             │
│                  │  Email Service  │                             │
│                  │   (Router)      │                             │
│                  └────────┬────────┘                             │
│                           │                                       │
│         ┌─────────────────┼─────────────────┐                   │
│         │                 │                 │                    │
│         ▼                 ▼                 ▼                    │
│  ┌──────────┐      ┌──────────┐     ┌──────────┐               │
│  │   Auth   │      │ Trading  │     │ Support  │               │
│  │ Category │      │ Category │     │ Category │               │
│  └────┬─────┘      └────┬─────┘     └────┬─────┘               │
│       │                 │                 │                      │
└───────┼─────────────────┼─────────────────┼──────────────────────┘
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────────────────────────────────────────────┐
│              Provider Routing Layer                    │
├───────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────┐    ┌─────────────────────┐  │
│  │   Brevo Provider    │    │  Resend Provider    │  │
│  │  (Auth, Support,    │    │    (Trading)        │  │
│  │    Marketing)       │    │                     │  │
│  └──────────┬──────────┘    └──────────┬──────────┘  │
│             │                           │              │
└─────────────┼───────────────────────────┼──────────────┘
              │                           │
              ▼                           ▼
    ┌──────────────────┐        ┌──────────────────┐
    │   Brevo API      │        │   Resend API     │
    │ smtp-relay.      │        │ api.resend.com   │
    │ brevo.com        │        │                  │
    └────────┬─────────┘        └────────┬─────────┘
             │                            │
             ▼                            ▼
    ┌──────────────────┐        ┌──────────────────┐
    │  Email Domains   │        │  Email Domain    │
    │                  │        │                  │
    │ • no-reply@      │        │ • notifications@ │
    │   auth.          │        │   trade.         │
    │   leadtrade.app  │        │   leadtrade.app  │
    │                  │        │                  │
    │ • support@       │        └──────────────────┘
    │   leadtrade.app  │
    │                  │
    │ • hello@         │
    │   marketing.     │
    │   leadtrade.app  │
    └──────────────────┘
```

## Email Flow Diagram

```
User Action
    │
    ▼
┌─────────────────┐
│  Application    │
│  Triggers       │
│  Email Send     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Email Service  │
│  - Validates    │
│  - Routes       │
│  - Monitors     │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌──────────────┐   ┌──────────────┐
│   Success?   │   │   Failed?    │
│      │       │   │      │       │
│      ▼       │   │      ▼       │
│  ┌────────┐ │   │  ┌────────┐  │
│  │Monitor │ │   │  │ Queue  │  │
│  │ Track  │ │   │  │ Retry  │  │
│  └────────┘ │   │  └────────┘  │
└──────────────┘   └──────────────┘
         │                 │
         └────────┬────────┘
                  │
                  ▼
         ┌────────────────┐
         │  Email Sent    │
         │  to Recipient  │
         └────────────────┘
```

## Component Architecture

```
src/lib/email/
│
├── index.ts                    # Main exports
│
├── types.ts                    # TypeScript definitions
│   ├── EmailCategory          # auth | trading | support | marketing
│   ├── EmailPayload           # Email content structure
│   ├── EmailResult            # Send result structure
│   └── EMAIL_CONFIGS          # Routing configuration
│
├── service.ts                  # Core routing logic
│   └── sendEmail()            # Main send function
│       ├── Validates category
│       ├── Routes to provider
│       ├── Tracks metrics
│       └── Logs results
│
├── providers/
│   ├── brevo.ts               # Brevo API integration
│   │   └── sendBrevoEmail()
│   │       ├── Formats request
│   │       ├── Calls Brevo API
│   │       └── Returns result
│   │
│   └── resend.ts              # Resend API integration
│       └── sendResendEmail()
│           ├── Formats request
│           ├── Calls Resend API
│           └── Returns result
│
├── templates/
│   ├── auth.ts                # Authentication templates
│   │   ├── getWelcomeEmailTemplate()
│   │   ├── getPasswordResetTemplate()
│   │   └── getEmailVerificationTemplate()
│   │
│   ├── trading.ts             # Trading templates
│   │   ├── getTradeConfirmationTemplate()
│   │   └── getCopyTradeNotificationTemplate()
│   │
│   └── support.ts             # Support templates
│       ├── getSupportInquiryTemplate()
│       └── getSupportResponseTemplate()
│
├── utils.ts                   # Helper functions
│   ├── sendEmailWithRetry()
│   ├── batchSendEmails()
│   ├── isValidEmail()
│   ├── sanitizeEmailContent()
│   └── logEmailResult()
│
├── queue.ts                   # Email queue system
│   ├── EmailQueue class
│   │   ├── add()
│   │   ├── process()
│   │   └── getPending()
│   └── startQueueProcessor()
│
├── monitoring.ts              # Analytics & tracking
│   ├── EmailMonitor class
│   │   ├── record()
│   │   ├── getMetrics()
│   │   └── generateReport()
│   └── emailMonitor singleton
│
└── examples.ts                # Integration examples
    ├── sendWelcomeEmail()
    ├── notifyTradeExecution()
    ├── notifyCopyTrade()
    └── handleSupportInquiry()
```

## Data Flow

### 1. Sending an Email

```
Application Code
    │
    │ import { sendAuthEmail, getWelcomeEmailTemplate }
    │
    ▼
┌─────────────────────────────────────────┐
│ const { html, text } =                  │
│   getWelcomeEmailTemplate(name, url)    │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ await sendAuthEmail({                   │
│   to: 'user@example.com',               │
│   subject: 'Welcome',                   │
│   html, text                            │
│ })                                      │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Email Service                           │
│ - Determines category: 'auth'           │
│ - Looks up config: EMAIL_CONFIGS.auth   │
│ - Provider: brevo                       │
│ - From: no-reply@auth.leadtrade.app     │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Brevo Provider                          │
│ - Formats API request                   │
│ - Calls api.brevo.com/v3/smtp/email     │
│ - Returns { success, messageId }        │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Monitoring & Logging                    │
│ - emailMonitor.record(category, result) │
│ - logEmailResult(category, to, result)  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Return Result to Application            │
│ { success: true, messageId: '...' }     │
└─────────────────────────────────────────┘
```

### 2. Email Routing Decision

```
Email Category
    │
    ├─── auth ──────────► Brevo ──► no-reply@auth.leadtrade.app
    │
    ├─── trading ───────► Resend ─► notifications@trade.leadtrade.app
    │
    ├─── support ───────► Brevo ──► support@leadtrade.app
    │
    └─── marketing ─────► Brevo ──► hello@marketing.leadtrade.app
```

### 3. Error Handling Flow

```
Send Email Attempt
    │
    ▼
┌─────────────┐
│  Success?   │
└──────┬──────┘
       │
       ├─── Yes ──► Log Success ──► Update Metrics ──► Return
       │
       └─── No ───► Check Error Type
                         │
                         ├─── Rate Limit ──► Queue for Retry
                         │
                         ├─── Validation ──► Return Error
                         │
                         └─── Network ─────► Retry with Backoff
                                                  │
                                                  ├─── Success ──► Return
                                                  │
                                                  └─── Failed ───► Queue
```

## DNS & Domain Configuration

```
Cloudflare DNS
    │
    ├── auth.leadtrade.app
    │   ├── TXT (verification)
    │   ├── TXT (DKIM)
    │   └── MX (mail exchange)
    │
    ├── trade.leadtrade.app
    │   ├── TXT (verification)
    │   ├── TXT (DKIM)
    │   └── MX (mail exchange)
    │
    ├── marketing.leadtrade.app
    │   ├── TXT (verification)
    │   ├── TXT (DKIM)
    │   └── MX (mail exchange)
    │
    └── leadtrade.app
        ├── TXT (SPF: include both providers)
        ├── TXT (DKIM)
        ├── MX (mail exchange)
        └── Email Routing
            ├── support@leadtrade.app → Gmail
            └── hello@leadtrade.app → Gmail
```

## API Endpoints

```
/api/email/
    │
    ├── /send (POST)
    │   └── Generic email send endpoint
    │       ├── Input: { category, to, subject, html, text }
    │       └── Output: { success, messageId, provider }
    │
    ├── /test (POST)
    │   └── Test email delivery
    │       ├── Input: { category, to }
    │       └── Output: { success, results }
    │
    └── /metrics (GET)
        └── Get email metrics
            └── Output: { metrics, report, healthy }
```

## Integration Points

```
┌─────────────────────────────────────────────────────────┐
│                   LeadTrade Application                  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  User Signup                                             │
│  └─► sendWelcomeEmail() ──► Auth Email ──► Brevo        │
│                                                           │
│  Password Reset                                          │
│  └─► sendPasswordResetEmail() ──► Auth Email ──► Brevo  │
│                                                           │
│  Trade Execution                                         │
│  └─► notifyTradeExecution() ──► Trading Email ──► Resend│
│                                                           │
│  Copy Trade                                              │
│  └─► notifyCopyTrade() ──► Trading Email ──► Resend     │
│                                                           │
│  Support Inquiry                                         │
│  └─► handleSupportInquiry() ──► Support Email ──► Brevo │
│                                                           │
│  Supabase Auth                                           │
│  └─► Custom SMTP ──► Auth Email ──► Brevo               │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Monitoring Dashboard (Conceptual)

```
┌─────────────────────────────────────────────────────────┐
│              Email Delivery Metrics                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Overall Success Rate: 98.5%                             │
│  Total Sent: 1,234                                       │
│  Total Failed: 19                                        │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ By Category                                      │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ Auth:      456 sent (99.1%)                     │   │
│  │ Trading:   678 sent (98.2%)                     │   │
│  │ Support:   100 sent (97.0%)                     │   │
│  │ Marketing:   0 sent (N/A)                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ By Provider                                      │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ Brevo:   556 sent (98.6%)                       │   │
│  │ Resend:  678 sent (98.4%)                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Recent Errors                                    │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ [2024-02-03 10:23] trading: Rate limit exceeded │   │
│  │ [2024-02-03 09:15] auth: Invalid email address  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Security & Best Practices

```
┌─────────────────────────────────────────────────────────┐
│                    Security Layers                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. API Keys                                             │
│     └─► Stored in environment variables                 │
│         Never committed to git                           │
│                                                           │
│  2. Email Validation                                     │
│     └─► Zod schemas validate all inputs                 │
│         Sanitize HTML content                            │
│                                                           │
│  3. Rate Limiting                                        │
│     └─► Batch sending with delays                       │
│         Queue system for retries                         │
│                                                           │
│  4. DNS Security                                         │
│     └─► SPF, DKIM, DMARC configured                     │
│         Prevents spoofing                                │
│                                                           │
│  5. Monitoring                                           │
│     └─► Track all sends and failures                    │
│         Alert on low success rates                       │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

For implementation details, see:
- `EMAIL_IMPLEMENTATION_SUMMARY.md` - Complete implementation guide
- `docs/EMAIL_SETUP_GUIDE.md` - Setup instructions
- `src/lib/email/README.md` - API documentation
