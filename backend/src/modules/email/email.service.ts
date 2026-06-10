import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('RESEND_API_KEY') ?? '';
    this.from = this.config.get<string>('EMAIL_FROM') ?? 'Mocoa Market <no-reply@mocoastore.alexsters.works>';
  }

  async sendInvitation(email: string, tempPassword: string, tenantName: string) {
    const html = `
      <h1>Bienvenido a Mocoa Market</h1>
      <p>Has sido invitado a ${tenantName}.</p>
      <p>Tu clave temporal es: <strong>${tempPassword}</strong></p>
      <p>Deberas cambiarla en tu primer acceso.</p>
    `;

    return this.send({
      to: email,
      subject: `Invitacion a ${tenantName} - Mocoa Market`,
      html,
    });
  }

  async sendPasswordReset(email: string, resetLink: string) {
    const html = `
      <h1>Recuperacion de contrasena</h1>
      <p>Haz clic en el enlace para restablecer tu contrasena:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>Este enlace expira en 1 hora.</p>
    `;

    return this.send({
      to: email,
      subject: 'Recuperacion de contrasena - Mocoa Market',
      html,
    });
  }

  async sendPaymentConfirmation(email: string, tenantName: string, monto: number) {
    const html = `
      <h1>Pago confirmado</h1>
      <p>Tu pago para ${tenantName} ha sido confirmado.</p>
      <p>Monto: $${(monto / 100).toLocaleString('es-CO')} COP</p>
      <p>Tu suscripcion esta activa.</p>
    `;

    return this.send({
      to: email,
      subject: 'Pago confirmado - Mocoa Market',
      html,
    });
  }

  async sendSubscriptionExpired(email: string, tenantName: string) {
    const html = `
      <h1>Suscripcion vencida</h1>
      <p>La suscripcion de ${tenantName} ha vencido.</p>
      <p>Actualiza tu pago para reactivar el servicio.</p>
    `;

    return this.send({
      to: email,
      subject: 'Suscripcion vencida - Mocoa Market',
      html,
    });
  }

  private async send(options: { to: string; subject: string; html: string }) {
    if (!this.apiKey || this.apiKey === 'RESEND_API_KEY_PLACEHOLDER') {
      this.logger.warn(`Email not sent (no API key): ${options.subject} -> ${options.to}`);
      return { sent: false, reason: 'NO_API_KEY' };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: options.to,
          subject: options.subject,
          html: options.html,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`Email failed: ${response.status} ${errorBody}`);
        return { sent: false, reason: `HTTP_${response.status}` };
      }

      this.logger.log(`Email sent: ${options.subject} -> ${options.to}`);
      return { sent: true };
    } catch (err) {
      this.logger.error(`Email error: ${String(err)}`);
      return { sent: false, reason: 'NETWORK_ERROR' };
    }
  }
}
