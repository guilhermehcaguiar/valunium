import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { mkdir, lstat, writeFile, readdir, unlink } from 'node:fs/promises';
import { resolve, isAbsolute, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import nodemailer from 'nodemailer';
import { ENVIRONMENT } from './environment.token';
import type { Environment } from '../config/environment';

export interface MailMessage { to: string; resetUrl: string }
export interface MailAdapter { send(message: MailMessage): Promise<void> }

/** Private local mailbox: never served over HTTP or written to logs/the repository. */
export class LocalMailAdapter implements MailAdapter {
  constructor(private readonly directory: string) {}
  async send(message: MailMessage): Promise<void> {
    if (!isAbsolute(this.directory) || resolve(this.directory).startsWith(resolve(__dirname, '../../../..') + sep)) throw new Error('Mailbox must be outside the repository');
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const info = await lstat(this.directory);
    if (!info.isDirectory() || info.isSymbolicLink() || (info.mode & 0o077) !== 0 || info.uid !== process.getuid?.()) {
      throw new Error('Mailbox must be private and owned by the current user');
    }
    // Local reset links expire after 15 minutes. Remove old messages on delivery.
    for (const file of await readdir(this.directory)) {
      if (!/^[0-9a-f-]{36}\.json$/.test(file)) continue;
      const target = resolve(this.directory, file);
      const stat = await lstat(target);
      if (!stat.isSymbolicLink() && Date.now() - stat.mtimeMs > 15 * 60_000) await unlink(target);
    }
    await writeFile(resolve(this.directory, `${randomUUID()}.json`), JSON.stringify(message), { flag: 'wx', mode: 0o600 });
  }
}

export class SmtpMailAdapter implements MailAdapter {
  constructor(private readonly url: string, private readonly from: string) {}
  async send(message: MailMessage): Promise<void> {
    const url = new URL(this.url);
    if (!['smtp:', 'smtps:'].includes(url.protocol)) throw new Error('Invalid SMTP transport');
    const transport = nodemailer.createTransport({ host: url.hostname, port: Number(url.port || (url.protocol === 'smtps:' ? 465 : 587)),
      secure: url.protocol === 'smtps:', requireTLS: true, logger: false, debug: false,
      ...(url.username ? { auth: { user: decodeURIComponent(url.username), pass: decodeURIComponent(url.password) } } : {}),
      connectionTimeout: 10_000, socketTimeout: 15_000, tls: { rejectUnauthorized: true } });
    try {
      await transport.sendMail({ from: this.from, to: message.to, subject: 'Redefinição de senha — Valunium',
        text: `Use o link em até 15 minutos: ${message.resetUrl}\nSe você não solicitou, ignore esta mensagem.` });
    } finally { transport.close(); }
  }
}

@Injectable()
export class MailDelivery implements OnModuleDestroy {
  private readonly pending = new Set<Promise<void>>();
  private readonly adapter: MailAdapter;
  constructor(@Inject(ENVIRONMENT) environment: Environment) {
    this.adapter = environment.smtpUrl && environment.smtpFrom
      ? new SmtpMailAdapter(environment.smtpUrl, environment.smtpFrom)
      : new LocalMailAdapter(environment.mailOutbox ?? resolve(tmpdir(), `valunium-mail-${process.getuid?.() ?? 'local'}`));
    if (environment.nodeEnv === 'production' && !(this.adapter instanceof SmtpMailAdapter)) throw new Error('SMTP required');
  }
  enqueue(message: MailMessage): void {
    const task = this.adapter.send(message).catch(() => {
      new Logger('MailDelivery').warn('Password recovery delivery failed');
    }).finally(() => this.pending.delete(task));
    this.pending.add(task);
  }
  async drain(): Promise<void> { await Promise.all(this.pending); }
  async onModuleDestroy(): Promise<void> { await this.drain(); }
}
