import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

interface ApiResponse<T> {
  data: T;
  meta: {
    requestId?: string;
    timestamp: string;
  };
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<{ id?: string }>();
    return next.handle().pipe(
      map((data: T) => ({
        data,
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }
}

