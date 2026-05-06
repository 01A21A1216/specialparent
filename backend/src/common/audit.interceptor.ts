import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

const MUTATING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    const method: string = req.method;
    const path: string = req.path;

    return next.handle().pipe(
      tap(async () => {
        if (!MUTATING.has(method)) return;
        try {
          await this.prisma.auditLog.create({
            data: {
              userId: req.user?.id ?? null,
              action: `${method} ${path}`,
              ipAddress: req.ip,
              metadata: {
                ua: req.headers['user-agent'] ?? null,
              },
            },
          });
        } catch (err) {
          // Never let logging failures break a request
          this.logger.warn(`Audit log failed: ${(err as Error).message}`);
        }
      }),
    );
  }
}
