import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import {
  VerificationParams,
  GetUsersByFilterParams,
  GetUsersResponse,
} from './account.types';

@Injectable()
export class InternalAccountService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async verification(params: VerificationParams): Promise<boolean> {
    const url = `${this.configService.get('ACCOUNT_SERVICE_URL')}/v1/user/verification`;
    const response = await firstValueFrom(
      this.httpService.get(url, { params }),
    );
    return response.data;
  }

  async getUsersByFilter(
    params: GetUsersByFilterParams,
  ): Promise<GetUsersResponse> {
    const url = `${this.configService.get('ACCOUNT_SERVICE_URL')}/v1/user/get-users-by-filter`;
    const response = await firstValueFrom(
      this.httpService.get(url, { params }),
    );
    return response.data;
  }
}
