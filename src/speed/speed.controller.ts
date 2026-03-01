import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Post, Req } from '@nestjs/common';
import type { Request } from 'express';


@Controller('speed')
export class SpeedController {
    @Post('upload')
    upload(@Req() req: Request) {
        return new Promise((resolve) => {
            let totalBytes = 0;

            req.on('data', (chunk) => {
                totalBytes += chunk.length;
            });

            req.on('end', () => {
                resolve({ received: totalBytes });
            });
        });
    }
    @Get('download')
    async download(@Res() res: Response) {
        const chunkSize = 1024 * 1024; // 1MB per chunk
        const totalChunks = 100; // 100MB total stream

        res.set({
            'Content-Type': 'application/octet-stream',
            'Cache-Control': 'no-store',
            'Content-Encoding': 'identity',
        });

        for (let i = 0; i < totalChunks; i++) {
            const chunk = Buffer.alloc(chunkSize);
            res.write(chunk);
            await new Promise(resolve => setImmediate(resolve));
        }

        res.end();
    }
    @Get('ping')
    ping() {
        return { message: 'pong' };
    }
}