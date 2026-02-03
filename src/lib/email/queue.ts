/**
 * Email Queue System
 * For handling failed emails and retries
 */

import type { EmailCategory, EmailPayload } from './types';

export interface QueuedEmail {
  id: string;
  category: EmailCategory;
  payload: EmailPayload;
  attempts: number;
  maxAttempts: number;
  lastAttempt?: Date;
  error?: string;
  createdAt: Date;
}

class EmailQueue {
  private queue: Map<string, QueuedEmail> = new Map();
  private processing = false;

  /**
   * Add email to queue
   */
  add(category: EmailCategory, payload: EmailPayload, maxAttempts = 3): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedEmail: QueuedEmail = {
      id,
      category,
      payload,
      attempts: 0,
      maxAttempts,
      createdAt: new Date(),
    };

    this.queue.set(id, queuedEmail);
    console.log(`Email queued: ${id} [${category}]`);
    
    return id;
  }

  /**
   * Get queued email by ID
   */
  get(id: string): QueuedEmail | undefined {
    return this.queue.get(id);
  }

  /**
   * Remove email from queue
   */
  remove(id: string): boolean {
    return this.queue.delete(id);
  }

  /**
   * Get all queued emails
   */
  getAll(): QueuedEmail[] {
    return Array.from(this.queue.values());
  }

  /**
   * Get pending emails (not exceeded max attempts)
   */
  getPending(): QueuedEmail[] {
    return this.getAll().filter(email => email.attempts < email.maxAttempts);
  }

  /**
   * Get failed emails (exceeded max attempts)
   */
  getFailed(): QueuedEmail[] {
    return this.getAll().filter(email => email.attempts >= email.maxAttempts);
  }

  /**
   * Update email attempt
   */
  updateAttempt(id: string, error?: string): void {
    const email = this.queue.get(id);
    if (email) {
      email.attempts++;
      email.lastAttempt = new Date();
      if (error) {
        email.error = error;
      }
    }
  }

  /**
   * Clear all emails
   */
  clear(): void {
    this.queue.clear();
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.size;
  }

  /**
   * Process queue (to be called periodically)
   */
  async process(sendFn: (category: EmailCategory, payload: EmailPayload) => Promise<any>): Promise<void> {
    if (this.processing) {
      console.log('Queue already processing, skipping...');
      return;
    }

    this.processing = true;
    const pending = this.getPending();

    console.log(`Processing email queue: ${pending.length} pending emails`);

    for (const email of pending) {
      try {
        const result = await sendFn(email.category, email.payload);
        
        if (result.success) {
          console.log(`✓ Queued email sent: ${email.id}`);
          this.remove(email.id);
        } else {
          this.updateAttempt(email.id, result.error);
          console.log(`✗ Queued email failed (attempt ${email.attempts}/${email.maxAttempts}): ${email.id}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        this.updateAttempt(email.id, errorMsg);
        console.error(`✗ Error processing queued email ${email.id}:`, error);
      }

      // Small delay between emails
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.processing = false;
  }
}

// Singleton instance
export const emailQueue = new EmailQueue();

/**
 * Start queue processor (call this on app startup)
 */
export function startQueueProcessor(
  sendFn: (category: EmailCategory, payload: EmailPayload) => Promise<any>,
  intervalMs = 60000 // Process every minute
): NodeJS.Timeout {
  console.log('Starting email queue processor...');
  
  return setInterval(() => {
    emailQueue.process(sendFn).catch(error => {
      console.error('Queue processor error:', error);
    });
  }, intervalMs);
}
