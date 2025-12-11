import { IsEnum, IsString } from 'class-validator';
import { Environment } from './config/types/configuration.enums';

export class ApplicaitonConfig {
  @IsEnum(Environment, { always: true })
  NODE_ENV: Environment;

  @IsString({ always: true })
  SERVICE_NAME: string;

  @IsString({ always: true })
  HTTP_PORT: string;

  @IsString({ always: true })
  HTTP_HOST: string;

  @IsString({ always: true })
  HTTP_PREFIX: string;

  @IsString({ always: true })
  HTTP_VERSION: string;
}
