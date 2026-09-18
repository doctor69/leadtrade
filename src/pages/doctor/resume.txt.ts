// Plain-text resume served at /doctor/resume.txt
//
// This is the canonical machine-readable rendering: LLM crawlers, recruiter
// scrapers, and applicant tracking systems that choke on styled HTML get clean,
// linear, section-labelled text here. Generated from src/data/resume.ts, so it
// can never drift from the visual resume.

import type { APIRoute } from 'astro';
import {
  achievements,
  certifications,
  contactChannels,
  coreCompetencies,
  education,
  experience,
  metrics,
  profile,
  projects,
  skillGroups,
  summary,
  toPlainText,
} from '../../data/resume';

export const prerender = true;

const RULE = '='.repeat(72);

function heading(title: string): string {
  return `\n${RULE}\n${title.toUpperCase()}\n${RULE}\n`;
}

function bullets(items: string[]): string {
  return items.map((item) => `- ${toPlainText(item)}`).join('\n');
}

function buildResume(): string {
  const out: string[] = [];

  out.push(RULE);
  out.push(profile.name.toUpperCase());
  out.push(`${profile.headline} | ${profile.specialty.replace(/ · /g, ', ')}`);
  out.push(RULE);
  out.push('');
  out.push(
    contactChannels
      .filter((channel) => channel.machine)
      .map((channel) => `${channel.label}: ${channel.href?.startsWith('mailto:') ? channel.value : channel.href ?? channel.value}`)
      .join('\n'),
  );
  out.push(`Web Resume: ${profile.resumeUrl}`);
  out.push(`Open To: ${profile.targetTitles.join(', ')}`);
  out.push(`Work Authorization Location: ${profile.location}`);

  out.push(heading('Professional Summary'));
  out.push(bullets(summary));

  out.push(heading('Career Highlights'));
  out.push(metrics.map((metric) => `- ${metric.value} ${metric.label}`).join('\n'));

  out.push(heading('Core Competencies'));
  out.push(coreCompetencies.map((item) => `- ${item}`).join('\n'));

  out.push(heading('Technical Skills'));
  out.push(skillGroups.map((group) => `${group.label}: ${group.items.join(', ')}`).join('\n'));

  out.push(heading('Professional Experience'));
  out.push(
    experience
      .map((job) =>
        [
          `${job.title} — ${job.company}`,
          `${job.location} | ${job.period}`,
          '',
          toPlainText(job.scope),
          '',
          bullets(job.bullets),
        ].join('\n'),
      )
      .join('\n\n\n'),
  );

  out.push(heading('Key Achievements'));
  out.push(bullets(achievements));

  out.push(heading('Projects'));
  out.push(
    projects
      .map((project) =>
        [
          `${project.name} — ${project.tagline}${project.url ? ` (${project.url})` : ''}`,
          `Tech: ${project.tech.join(', ')}`,
          bullets(project.bullets),
        ].join('\n'),
      )
      .join('\n\n'),
  );

  out.push(heading('Education'));
  out.push(
    education
      .map((entry) => `${entry.degree}, ${entry.field} — ${entry.school}, ${entry.location} (${entry.year})`)
      .join('\n'),
  );

  out.push(heading('Certifications'));
  out.push(certifications.map((cert) => `${cert.name} — ${cert.detail} (${cert.issuer})`).join('\n'));

  out.push('');
  out.push(RULE);
  out.push(`Last updated by the site build. Canonical HTML version: ${profile.resumeUrl}`);
  out.push(RULE);
  out.push('');

  return out.join('\n');
}

export const GET: APIRoute = () =>
  new Response(buildResume(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Robots-Tag': 'all',
    },
  });
