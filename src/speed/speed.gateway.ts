import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import axios from 'axios';

const BASE_URL =
  process.env.SPEED_BASE_URL || 'http://localhost:5500';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || '*',
  },
})
export class SpeedGateway {
  @WebSocketServer()
  server: Server;

  // ================= UPLOAD =================
  @SubscribeMessage('start-upload-test')
  async handleUpload(client: any) {
    console.log('Upload test started');

    const THREADS = 4;
    const TEST_DURATION = 8000;

    let totalBytes = 0;
    const startTime = Date.now();

    for (let i = 0; i < THREADS; i++) {
      const buffer = Buffer.alloc(5 * 1024 * 1024);

      axios
        .post(`${BASE_URL}/speed/upload`, buffer, {
          headers: { 'Content-Type': 'application/octet-stream' },
        })
        .then(() => {
          totalBytes += buffer.length;

          const duration = (Date.now() - startTime) / 1000;
          const bitsLoaded = totalBytes * 8;
          const speedMbps = (bitsLoaded / duration) / (1024 * 1024);

          this.server
            .to(client.id)
            .emit('upload-speed', speedMbps);
        })
        .catch(console.error);
    }

    setTimeout(() => {
      this.server.to(client.id).emit('upload-complete');
      console.log('Upload test complete');
    }, TEST_DURATION);
  }

  // ================= DOWNLOAD =================
  @SubscribeMessage('start-download-test')
  async handleDownload(client: any) {
    console.log('Download test started');

    const THREADS = 4;
    const TEST_DURATION = 8000;

    let totalBytes = 0;
    const startTime = Date.now();
    const streams: any[] = [];

    for (let i = 0; i < THREADS; i++) {
      const response = await axios({
        url: `${BASE_URL}/speed/download`,
        method: 'GET',
        responseType: 'stream',
      });

      streams.push(response.data);

      response.data.on('data', (chunk: Buffer) => {
        totalBytes += chunk.length;

        const duration = (Date.now() - startTime) / 1000;
        const bitsLoaded = totalBytes * 8;
        const speedMbps = (bitsLoaded / duration) / (1024 * 1024);

        this.server
          .to(client.id)
          .emit('download-speed', speedMbps);
      });
    }

    setTimeout(() => {
      streams.forEach((stream) => stream.destroy());
      this.server
        .to(client.id)
        .emit('download-complete');

      console.log('Download test complete');
    }, TEST_DURATION);
  }

  // ================= PING =================
  @SubscribeMessage('start-ping-test')
  async handlePing(client: any) {
    const pings: number[] = [];

    for (let i = 0; i < 10; i++) {
      const start = Date.now();

      await axios.get(`${BASE_URL}/speed/ping`);

      const latency = Date.now() - start;
      pings.push(latency);

      this.server
        .to(client.id)
        .emit('ping-update', latency);
    }

    const avgPing =
      pings.reduce((a, b) => a + b) / pings.length;

    const jitter =
      pings
        .slice(1)
        .map((val, i) => Math.abs(val - pings[i]))
        .reduce((a, b) => a + b, 0) /
      (pings.length - 1);

    this.server
      .to(client.id)
      .emit('ping-complete', {
        avgPing,
        jitter,
      });
  }
}