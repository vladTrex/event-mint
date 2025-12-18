import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly register: client.Registry;
  public readonly httpRequestDuration: client.Histogram<string>;
  public readonly httpRequestTotal: client.Counter<string>;

  constructor() {
    this.register = new client.Registry();

    // Collect default metrics (CPU, memory, etc.)
    client.collectDefaultMetrics({ register: this.register });

    // HTTP request duration histogram
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    // HTTP request total counter
    this.httpRequestTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });
  }

  getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getRegister(): client.Registry {
    return this.register;
  }
}
