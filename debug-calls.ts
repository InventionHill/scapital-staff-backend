/* eslint-disable no-console */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { CallsService } from './src/api/calls/calls.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const callsService = app.get(CallsService);
  try {
    const res = await callsService.findAll(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      1,
      10,
    );
    console.log('Success:', res.data.length);
  } catch (err) {
    console.error('SERVICE ERROR:', err);
  }
  await app.close();
}
bootstrap();
