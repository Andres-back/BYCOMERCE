import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoleName } from '../../database/prisma-client';

type JwtPayload = {
  sub: string;
  email: string;
  rol: RoleName;
  tenantId: string | null;
  isSuperAdmin: boolean;
  impersonatedBy: string | null;
};

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 20000,
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token: string = (client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '')) as string;
      if (!token) {
        throw new WsException('Token requerido');
      }

      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>('jwt.accessSecret') ?? '',
      });

      void client.join(`user:${payload.sub}`);

      if (payload.tenantId) {
        void client.join(`tenant:${payload.tenantId}`);
        this.logger.log(`Client joined tenant:${payload.tenantId}`);
      }

      this.logger.log(`Client connected: ${client.id} (${payload.email})`);

      client.emit('connected', { userId: payload.sub, tenantId: payload.tenantId });
    } catch (err) {
      this.logger.warn(`Connection rejected: ${String(err)}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitToTenant(tenantId: string, event: string, data: unknown) {
    this.server?.to(`tenant:${tenantId}`).emit(event, data);
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server?.to(`user:${userId}`).emit(event, data);
  }

  emitToAll(event: string, data: unknown) {
    this.server?.emit(event, data);
  }
}
