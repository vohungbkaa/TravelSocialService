import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  check() {
    return {
      status: 'ok',
      service: 'travel-social-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
