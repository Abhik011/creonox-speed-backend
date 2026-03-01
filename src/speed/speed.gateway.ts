import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import axios from 'axios';

@WebSocketGateway({
    cors: {
        origin: 'http://localhost:3000',
    },
})
export class SpeedGateway {
    @WebSocketServer()
    server: Server;

    @SubscribeMessage('start-upload-test')
    async handleUpload(client: any) {
        console.log("Upload test started");

        const THREADS = 4;
        const TEST_DURATION = 8000;

        let totalBytes = 0;
        const startTime = Date.now();

        const uploads: any[] = [];

        for (let i = 0; i < THREADS; i++) {

            const buffer = Buffer.alloc(5 * 1024 * 1024); // 5MB chunk

            const upload = axios.post(
                'http://localhost:5500/speed/upload',
                buffer,
                {
                    headers: { 'Content-Type': 'application/octet-stream' },
                }
            );

            uploads.push(upload);

            upload.then(() => {
                totalBytes += buffer.length;

                const duration = (Date.now() - startTime) / 1000;
                const bitsLoaded = totalBytes * 8;
                const speedMbps = (bitsLoaded / duration) / (1024 * 1024);

                this.server.to(client.id).emit('upload-speed', speedMbps);
            });
        }

        setTimeout(() => {
            this.server.to(client.id).emit('upload-complete');
            console.log("Upload test complete");
        }, TEST_DURATION);
    }
    // ✅ DOWNLOAD TEST
    @SubscribeMessage('start-download-test')
    async handleDownload(client: any) {
        console.log("Multi-thread download started");

        const THREADS = 4; // can increase to 6–8 later
        const TEST_DURATION = 8000; // 8 seconds

        let totalBytes = 0;
        const startTime = Date.now();

        const streams: any[] = [];

        for (let i = 0; i < THREADS; i++) {
            const response = await axios({
                url: 'http://localhost:5500/speed/download',
                method: 'GET',
                responseType: 'stream',
            });

            streams.push(response.data);

            response.data.on('data', (chunk: Buffer) => {
                totalBytes += chunk.length;

                const duration = (Date.now() - startTime) / 1000;
                const bitsLoaded = totalBytes * 8;
                const speedMbps = (bitsLoaded / duration) / (1024 * 1024);

                this.server.to(client.id).emit('download-speed', speedMbps);
            });
        }

        // Stop test after duration
        setTimeout(() => {
            streams.forEach((stream) => stream.destroy());
            this.server.to(client.id).emit('download-complete');
            console.log("Multi-thread test complete");
        }, TEST_DURATION);
    }

    // ✅ PING TEST
    @SubscribeMessage('start-ping-test')
    async handlePing(client: any) {
        const pings: number[] = [];

        for (let i = 0; i < 10; i++) {
            const start = Date.now();

            await axios.get('http://localhost:5500/speed/ping');

            const latency = Date.now() - start;
            pings.push(latency);

            this.server.to(client.id).emit('ping-update', latency);
        }

        const avgPing = pings.reduce((a, b) => a + b) / pings.length;

        const jitter =
            pings
                .slice(1)
                .map((val, i) => Math.abs(val - pings[i]))
                .reduce((a, b) => a + b, 0) /
            (pings.length - 1);

        this.server.to(client.id).emit('ping-complete', {
            avgPing,
            jitter,
        });
    }
}