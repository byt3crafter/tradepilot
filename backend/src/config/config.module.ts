import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { JoiValidationSchema } from './config.schema';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: JoiValidationSchema,
      envFilePath: '.env',
    }),
  ],
})
export class ConfigModule {}
