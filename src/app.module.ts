import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SpeedModule } from './speed/speed.module';

@Module({
  imports: [SpeedModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
