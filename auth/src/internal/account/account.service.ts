import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
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
    try {
      const url = `${this.configService.get('ACCOUNT_SERVICE_URL')}/user/verification`;
      const response = await firstValueFrom(
        this.httpService.get(url, { params }),
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          return false;
        }
        throw new HttpException(
          error.response?.data?.message || 'Account service error',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw error;
    }
  }

  async getUsersByFilter(
    params: GetUsersByFilterParams,
  ): Promise<GetUsersResponse> {
    try {
      const url = `${this.configService.get('ACCOUNT_SERVICE_URL')}/user`;
      const response = await firstValueFrom(
        this.httpService.get(url, { params }),
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data?.message || 'Account service error',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw error;
    }
  }
}
