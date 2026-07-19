import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

// Runtime validator for process.env. Wired into ConfigModule.forRoot so the
// app crashes on startup — rather than at first request — when a required
// secret is missing or a URL is malformed. Never trust a silent .env file.

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvSchema {
  @IsOptional()
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number = 4000;

  // DB / cache infra
  @IsString()
  @MinLength(1, { message: 'DATABASE_URL is required (postgresql://...)' })
  DATABASE_URL!: string;

  @IsOptional()
  @IsString()
  REDIS_URL?: string;

  // Auth — reject the dev placeholder values that used to be shipped.
  @IsString()
  @MinLength(32, {
    message:
      'JWT_ACCESS_SECRET must be at least 32 chars — generate one with `openssl rand -hex 32`',
  })
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(32, {
    message:
      'JWT_REFRESH_SECRET must be at least 32 chars — generate one with `openssl rand -hex 32`',
  })
  JWT_REFRESH_SECRET!: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_TTL?: string; // e.g. "15m"

  @IsOptional()
  @IsString()
  JWT_REFRESH_TTL?: string; // e.g. "30d"

  // CORS
  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  // Optional integrations — validated for shape when present but not required.
  @IsOptional()
  @IsString()
  OPENAI_API_KEY?: string;

  @IsOptional()
  @IsString()
  OPENAI_MODEL?: string;

  @IsOptional()
  @IsUrl({ require_tld: false, protocols: ['cloudinary'] }, {
    message: 'CLOUDINARY_URL must look like cloudinary://<api-key>:<secret>@<cloud>',
  })
  CLOUDINARY_URL?: string;

  // Mail (feature-flagged) — smtp://user:pass@host:port
  @IsOptional()
  @IsString()
  SMTP_URL?: string;

  @IsOptional()
  @IsString()
  MAIL_FROM?: string;

  // Base URL used in outgoing emails (verification + reset links).
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true })
  WEB_URL?: string;

  // Sentry (feature-flagged) — enables error reporting on backend.
  @IsOptional()
  @IsString()
  SENTRY_DSN?: string;

  // Pino log level. Defaults to 'debug' in dev, 'info' in prod.
  @IsOptional()
  @IsString()
  LOG_LEVEL?: string;
}

// Nest ConfigModule calls this with process.env; on failure we throw with a
// consolidated error listing every problem so the operator can fix them all
// in one go instead of restart-guessing.
export function validateEnv(config: Record<string, unknown>): EnvSchema {
  const validated = plainToInstance(EnvSchema, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: false,
    forbidUnknownValues: false,
  });
  if (errors.length > 0) {
    const messages = errors
      .flatMap((e) =>
        Object.values(e.constraints ?? {}).map((m) => `  • ${e.property}: ${m}`),
      )
      .join('\n');
    throw new Error(`\nInvalid environment variables:\n${messages}\n`);
  }
  return validated;
}
