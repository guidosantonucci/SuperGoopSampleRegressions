import { request, expect, type APIRequestContext } from '@playwright/test';
import { env } from '../config/env';

export interface Email {
  subject: string;
  html: { body: string };
  text: { body: string };
  from: { email: string }[];
  received: string;
}

/** Mailosaur inbox: every address @<serverId>.mailosaur.net lands in one server. */
export class Mailbox {
  private constructor(private readonly ctx: APIRequestContext) {}

  static async create() {
    const ctx = await request.newContext({
      baseURL: 'https://mailosaur.com/api/',
      httpCredentials: { username: env.mailosaur.apiKey, password: '' },
    });
    return new Mailbox(ctx);
  }

  /** Unique, routable test address, e.g. order-1731790000000-0@abc123.mailosaur.net */
  address(prefix: string, workerIndex = 0) {
    return `${prefix}-${Date.now()}-${workerIndex}@${env.mailosaur.serverId}.mailosaur.net`;
  }

  /** Waits up to `timeoutMs` for the first message sent to `to` (optionally matching subject). */
  async waitFor(to: string, opts: { subject?: string; timeoutMs?: number } = {}): Promise<Email> {
    const res = await this.ctx.post(`messages/await?server=${env.mailosaur.serverId}&timeout=${opts.timeoutMs ?? 300_000}`, {
      data: { sentTo: to, ...(opts.subject ? { subject: opts.subject } : {}) },
      timeout: (opts.timeoutMs ?? 300_000) + 10_000,
    });
    expect(res.status(), `No email to ${to} in time`).toBe(200);
    return res.json();
  }

  async dispose() {
    await this.ctx.dispose();
  }
}
