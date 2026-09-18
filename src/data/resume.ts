// Resume data — single source of truth for /doctor
//
// Every rendering of the resume reads from this file:
//   - src/pages/doctor.astro        → the on-screen UI and the print/PDF layout
//   - src/pages/doctor.astro        → schema.org JSON-LD for AI crawlers and search engines
//   - src/pages/doctor/resume.txt.ts → the plain-text version for LLM crawlers and ATS parsers
//
// Editing anything here updates all three. Keep bullets quantified and written
// with the vocabulary real job descriptions use — applicant tracking systems
// score on keyword-in-context, not on keyword lists.

export interface ContactChannel {
  label: string;
  value: string;
  href?: string;
  icon: string;
  /** Include in the machine-readable contact block. */
  machine?: boolean;
}

export interface SkillGroup {
  label: string;
  items: string[];
}

export interface Experience {
  company: string;
  title: string;
  location: string;
  /** Human-readable range, e.g. "Dec 2023 – Present". */
  period: string;
  /** ISO-8601 dates for <time> elements and JSON-LD. */
  startDate: string;
  endDate: string | null;
  /** One-line scope statement — gives an AI reader the context before the bullets. */
  scope: string;
  bullets: string[];
}

export interface Project {
  name: string;
  tagline: string;
  url?: string;
  tech: string[];
  bullets: string[];
}

export interface Education {
  degree: string;
  field: string;
  school: string;
  location: string;
  year: string;
}

export interface Certification {
  name: string;
  detail: string;
  issuer: string;
}

export interface Metric {
  value: string;
  label: string;
}

export const profile = {
  name: 'Saket Sharma',
  nickname: 'Cliff Waters',
  headline: 'Senior Full Stack Software Engineer',
  /** Title string tuned for ATS title-matching — mirrors how these roles are posted. */
  targetTitles: [
    'Senior Software Engineer',
    'Senior Java Developer',
    'Senior Full Stack Developer',
    'Backend Engineer',
    'Staff Software Engineer',
  ],
  specialty: 'Java · Spring Boot · Microservices · React · AWS',
  yearsExperience: '8+',
  location: 'United States',
  locationCountry: 'US',
  email: 'saket87@live.com',
  github: 'https://github.com/doctor69',
  githubHandle: 'doctor69',
  resumeUrl: 'https://leadtrade.app/doctor',
  plainTextUrl: 'https://leadtrade.app/doctor/resume.txt',
  photo: '/saket-photo.jpg',
} as const;

export const contactChannels: ContactChannel[] = [
  { label: 'Email', value: profile.email, href: `mailto:${profile.email}`, icon: '✉', machine: true },
  { label: 'GitHub', value: `github.com/${profile.githubHandle}`, href: profile.github, icon: '⌨', machine: true },
  { label: 'Portfolio', value: 'leadtrade.app', href: 'https://leadtrade.app', icon: '◈', machine: true },
  { label: 'Location', value: profile.location, icon: '📍', machine: true },
];

/** Headline numbers. Each one is restated inside an experience bullet so it survives parsing. */
export const metrics: Metric[] = [
  { value: '8+', label: 'Years Engineering' },
  { value: '2M+', label: 'Daily Transactions' },
  { value: '99.95%', label: 'Production Uptime' },
  { value: '50+', label: 'APIs Delivered' },
];

export const summary: string[] = [
  'Senior Full Stack Software Engineer with <strong>8+ years</strong> building and scaling enterprise-grade distributed systems in payments and financial services, using <strong>Java (8–21), Spring Boot, microservices, React, TypeScript, and AWS</strong>.',
  'Designed and shipped <strong>50+ production REST and GraphQL APIs</strong> serving <strong>2M+ transactions per day</strong> at <strong>99.95% uptime</strong> with sub-100ms response times.',
  'Led <strong>monolith-to-microservices modernization</strong> with Docker, Kubernetes, and AWS ECS — cutting infrastructure cost <strong>35%</strong> and deployment time from 4 hours to 15 minutes.',
  'Deep expertise in <strong>event-driven architecture</strong> with Apache Kafka, RabbitMQ, and JMS, processing <strong>500K+ events/hour</strong> with exactly-once semantics and dead-letter recovery.',
  'Hands-on across the full stack and the full lifecycle: <strong>relational and NoSQL data modeling</strong> (Oracle, PostgreSQL, DB2, MongoDB, Redis), <strong>CI/CD automation</strong> (Jenkins, GitHub Actions, Terraform), and <strong>observability</strong> (Datadog, Splunk).',
  'Mentors engineers, drives code review and secure-by-default standards, and partners directly with product and risk stakeholders in <strong>Agile/Scrum</strong> delivery.',
];

/**
 * Visible keyword band rendered near the top of the resume.
 *
 * This replaces the invisible keyword-stuffing block the page used to carry.
 * Hidden text is treated as manipulation by modern ATS vendors and by Google's
 * spam policies; visible, well-formed competencies are parsed just as reliably
 * and carry no penalty.
 */
export const coreCompetencies: string[] = [
  'Java 21 / Java 17 / Java 8',
  'Spring Boot 3.x & Spring Cloud',
  'Microservices Architecture',
  'RESTful API Design',
  'GraphQL',
  'Apache Kafka / Event-Driven Systems',
  'Amazon Web Services (AWS)',
  'Docker & Kubernetes',
  'React 18 & TypeScript',
  'Distributed Systems & Scalability',
  'SQL & NoSQL Data Modeling',
  'CI/CD & DevOps Automation',
  'OAuth2 / JWT / Application Security',
  'Performance Tuning & Caching',
  'Test-Driven Development (TDD)',
  'Payments & Financial Services Domain',
  'Agile / Scrum Delivery',
  'Technical Mentorship & Code Review',
];

/** Domain keywords — recruiters and ATS filters screen on industry as well as stack. */
export const domains: string[] = [
  'Payments & Card Networks',
  'Financial Services',
  'Brokerage & Trading Systems',
  'Enterprise SaaS',
];

/** Spoken languages — a standard ATS field. */
export const spokenLanguages: string[] = ['English (Professional)'];

export const skillGroups: SkillGroup[] = [
  {
    label: 'Languages',
    items: ['Java 8–21', 'TypeScript', 'JavaScript (ES2023)', 'Python', 'C#', 'SQL / PL-SQL'],
  },
  {
    label: 'Backend & Frameworks',
    items: [
      'Spring Boot 3.x',
      'Spring Cloud',
      'Spring Security',
      'Spring WebFlux',
      'Spring Data JPA',
      'Hibernate',
      'Node.js',
      '.NET Core',
    ],
  },
  {
    label: 'Frontend',
    items: ['React 18', 'Next.js 14', 'Redux Toolkit', 'Astro', 'Tailwind CSS', 'Material-UI', 'Storybook'],
  },
  {
    label: 'APIs & Messaging',
    items: [
      'REST',
      'GraphQL',
      'gRPC',
      'Apache Kafka',
      'RabbitMQ',
      'JMS / IBM MQ',
      'WebSockets',
      'OAuth2 / OIDC / JWT',
      'OpenAPI / Swagger',
    ],
  },
  {
    label: 'Databases',
    items: ['Oracle 19c', 'PostgreSQL', 'MongoDB', 'Redis', 'IBM DB2', 'MySQL', 'DynamoDB'],
  },
  {
    label: 'Cloud & DevOps',
    items: [
      'AWS (EC2, S3, Lambda, ECS, RDS)',
      'Docker',
      'Kubernetes',
      'Terraform',
      'Jenkins',
      'GitHub Actions',
      'Cloudflare Pages',
      'Datadog',
      'Splunk',
    ],
  },
  {
    label: 'AI & Modern Stack',
    items: ['Anthropic Claude API', 'LLM Prompt Engineering', 'Retrieval-Augmented Generation', 'Supabase', 'Alpaca Markets API'],
  },
  {
    label: 'Testing & Quality',
    items: ['JUnit 5', 'Mockito', 'Testcontainers', 'Jest', 'Selenium', 'SonarQube', 'OWASP Dependency-Check'],
  },
  {
    label: 'Practices',
    items: ['Agile / Scrum', 'TDD / BDD', 'CI/CD', 'Domain-Driven Design', 'Design Patterns', 'SOLID', 'Code Review'],
  },
  {
    label: 'Tools',
    items: ['IntelliJ IDEA', 'VS Code', 'Git / GitFlow', 'Maven', 'Gradle', 'Jira', 'Confluence'],
  },
];

export const experience: Experience[] = [
  {
    company: 'Mastercard',
    title: 'Senior Software Developer',
    location: 'St. Louis, MO',
    period: 'Dec 2023 – Present',
    startDate: '2023-12-01',
    endDate: null,
    scope:
      'Own backend architecture for high-volume payment services on Java 21 and Spring Boot 3.x, spanning API design, event streaming, performance, and release engineering.',
    bullets: [
      'Architected and delivered <strong>high-throughput RESTful APIs</strong> on Spring Boot 3.x and Java 21 that process <strong>2M+ daily payment transactions</strong> with <strong>sub-100ms response times</strong> and <strong>99.95% uptime</strong>.',
      'Designed a <strong>microservices platform</strong> fronted by Spring Cloud Gateway with rate limiting, Resilience4j circuit breakers, and OAuth2/JWT authorization — eliminating cascading failures across 15+ downstream services.',
      'Led the <strong>Java 8 → Java 21 migration</strong> for 15+ enterprise applications, adopting records, pattern matching, and virtual threads to gain <strong>30% throughput</strong> and remove <strong>25% of legacy code</strong>.',
      'Built <strong>GraphQL APIs</strong> with Spring for GraphQL, using DataLoader batching and optimized resolvers to eliminate over-fetching and improve mobile client performance <strong>45%</strong>.',
      'Implemented <strong>event-driven payment processing</strong> on Apache Kafka handling <strong>500K+ events/hour</strong> with exactly-once semantics, idempotent consumers, and dead-letter queue recovery.',
      'Engineered a <strong>Redis caching layer</strong> (cache-aside with tiered TTL policies) that cut database load <strong>60%</strong> and reduced API response times from 500ms to 80ms.',
      'Automated <strong>CI/CD pipelines</strong> in Jenkins delivering <strong>50+ zero-downtime production releases per month</strong>, gated by automated unit, integration, SonarQube, and OWASP security scans.',
      'Mentored <strong>4 junior engineers</strong> on Spring Boot idioms, Java 21 features, and microservices patterns through structured code review and pair programming.',
    ],
  },
  {
    company: 'Visa',
    title: 'Java Full Stack Software Developer',
    location: 'Austin, TX',
    period: 'Sep 2022 – Nov 2023',
    startDate: '2022-09-01',
    endDate: '2023-11-30',
    scope:
      'Modernized legacy payment applications into containerized Spring Boot services and hardened authentication for PCI-DSS compliance.',
    bullets: [
      'Spearheaded <strong>legacy modernization</strong> of 8 monolithic J2EE applications into Spring Boot microservices, collapsing deployment time from <strong>4 hours to 15 minutes</strong>.',
      'Delivered <strong>20+ RESTful APIs</strong> with layered validation, standardized error contracts, and Springdoc-OpenAPI documentation adopted as the team reference.',
      'Owned the <strong>containerization strategy</strong> — authored Docker images and Kubernetes manifests for 12 microservices with liveness/readiness probes and horizontal auto-scaling.',
      'Built a <strong>secure authentication framework</strong> (SSO, LDAP, OAuth2, MFA) for <strong>50K+ concurrent users</strong> and automated SSL/TLS certificate rotation to maintain <strong>PCI-DSS compliance</strong>.',
      'Introduced <strong>asynchronous processing</strong> with Spring <code>@Async</code>, CompletableFuture, and durable message queues across payment workflows, raising throughput <strong>60%</strong>.',
      'Drove quality to <strong>85%+ code coverage</strong> with JUnit 5, Mockito, and consumer-driven contract tests, retiring <strong>40% of technical debt</strong> through SonarQube-guided refactoring.',
    ],
  },
  {
    company: 'State Street Corporation',
    title: 'Java Full Stack Software Developer',
    location: 'Quincy, MA',
    period: 'Nov 2017 – Feb 2022',
    startDate: '2017-11-01',
    endDate: '2022-02-28',
    scope:
      'Full-stack delivery for institutional financial platforms — Spring APIs, reactive services, and a React design system replacing legacy front ends.',
    bullets: [
      'Designed <strong>enterprise REST APIs</strong> on Spring MVC and Spring Boot serving <strong>100K+ daily active users</strong> across multiple regions and time zones.',
      'Led <strong>front-end modernization</strong> from legacy Adobe Flex to <strong>React 18 with TypeScript, Redux, and Material-UI</strong>, improving page load times <strong>65%</strong> and user satisfaction <strong>40%</strong>.',
      'Built <strong>reactive, non-blocking services</strong> with Spring WebFlux and Project Reactor, increasing concurrent request capacity <strong>200%</strong> on the same hardware.',
      'Created a <strong>reusable component library</strong> of 50+ Storybook-documented React components, cutting feature development time <strong>30%</strong> across four teams.',
      'Delivered <strong>real-time market features</strong> over WebSockets and Server-Sent Events for live pricing, trade notifications, and threshold alerts.',
      'Integrated <strong>JMS / IBM MQ</strong> for asynchronous service-to-service messaging with request-reply correlation, timeout handling, and exponential-backoff retries.',
      'Established <strong>Jenkins CI/CD</strong> with Maven builds, automated regression suites, and blue-green deployments; migrated the codebase from SVN to Git with a GitFlow branching model.',
    ],
  },
];

export const achievements: string[] = [
  'Cut API response times <strong>70%</strong> through Redis caching and query-plan tuning.',
  'Led a Java 8 → 21 migration delivering <strong>30% throughput gain</strong> and a smaller memory footprint.',
  'Architected a payments platform sustaining <strong>2M+ daily transactions</strong> at <strong>99.95% uptime</strong>.',
  'Scaled release cadence from monthly to <strong>50+ deployments per month</strong> with zero downtime.',
  'Reduced production incidents <strong>40%</strong> via automated testing and observability instrumentation.',
  'Lowered infrastructure spend <strong>35%</strong> by containerizing and right-sizing microservices.',
];

export const projects: Project[] = [
  {
    name: 'LEADTRADE',
    tagline: 'Social Mirror-Trading Platform',
    url: 'https://leadtrade.app',
    tech: ['Astro', 'React', 'TypeScript', 'Tailwind CSS', 'Supabase', 'Alpaca Markets API', 'Cloudflare Pages', 'PWA'],
    bullets: [
      'Built an institutional-grade trading platform that mirrors elite traders’ portfolios in real time through the Alpaca Markets brokerage API.',
      'Designed a global leaderboard engine with live rankings, win-rate analytics, and performance-attribution dashboards.',
      'Enforced row-level security in Supabase alongside OAuth2 authentication and zero-trust API access from Cloudflare edge workers.',
      'Shipped as an offline-capable progressive web app, holding sub-2s mobile load times via Astro’s island architecture.',
    ],
  },
  {
    name: 'JobHunt.ai',
    tagline: 'AI-Powered Job Application Assistant',
    tech: ['Anthropic Claude API', 'React', 'TypeScript', 'Supabase', 'Tailwind CSS'],
    bullets: [
      'Engineered an AI assistant that tailors resumes and cover letters to a target job description using the Claude API with structured prompt chaining.',
      'Built keyword-match scoring that benchmarks resume alignment against ATS requirements, lifting user interview callback rates.',
      'Persisted application history and AI-generated drafts in Supabase with per-user row-level security for multi-device access.',
    ],
  },
  {
    name: 'Cinecraft',
    tagline: 'AI Cinematic Content Creation Tool',
    tech: ['Anthropic Claude API', 'React', 'TypeScript', 'Tailwind CSS'],
    bullets: [
      'Created an AI screenwriting tool generating scene breakdowns, shot lists, and dialogue from cinematic style presets.',
      'Implemented a multi-turn refinement flow supporting genre-specific tone, pacing, and consistent character voice.',
      'Built an export pipeline producing industry-standard, Final Draft-compatible screenplay files from AI-generated content.',
    ],
  },
  {
    name: 'Predix',
    tagline: 'AI Prediction & Analytics Platform',
    url: 'https://predix.vip',
    tech: ['React', 'TypeScript', 'AI/ML APIs', 'Supabase', 'Tailwind CSS'],
    bullets: [
      'Developed a predictive analytics dashboard surfacing AI-generated forecasts with confidence scoring over user-defined datasets.',
      'Unified multiple AI/ML model APIs behind a single adapter layer, enabling model-agnostic predictions and A/B comparison views.',
      'Built real-time pipelines on Supabase Realtime subscriptions for live prediction updates and alert notifications.',
    ],
  },
];

export const education: Education[] = [
  {
    degree: 'Associate Degree',
    field: 'Computer Science',
    school: 'Quincy College',
    location: 'Quincy, MA',
    year: '2010',
  },
];

export const certifications: Certification[] = [
  {
    name: 'FAA Certified Remote Pilot',
    detail: 'Part 107 — Unmanned Aircraft Systems',
    issuer: 'Federal Aviation Administration',
  },
];

/** Strips the inline <strong>/<code> markup used by the HTML renderer. */
export function toPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
