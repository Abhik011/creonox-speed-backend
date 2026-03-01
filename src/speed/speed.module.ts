import { Module } from '@nestjs/common';
import { SpeedGateway } from './speed.gateway';
import { SpeedController } from './speed.controller';

@Module({
  controllers: [SpeedController],
  providers: [SpeedGateway],  // ⚠️ This is REQUIRED
})
export class SpeedModule {}