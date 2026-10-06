import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Express 5 defaults to the simple parser, which rejects `userIds[]=x` sent by auth
  app.set('query parser', 'extended');
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const configSwagger = new DocumentBuilder()
    .setTitle(`${config.get('SERVICE_NAME')} microservice`)
    .setDescription('API Documentation')
    .addServer(
      `http://${config.get('HTTP_HOST')}:${config.get('HTTP_PORT')}${config.get('HTTP_PREFIX')}`,
    )
    .build();

  const document = SwaggerModule.createDocument(app, configSwagger);
  SwaggerModule.setup(`${config.get('HTTP_PREFIX')}/docs`, app, document);

  app.setGlobalPrefix(config.get('HTTP_PREFIX'));
  await app.listen(config.get('HTTP_PORT'));
}
bootstrap();
