import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import 'multer';

@Injectable()
export class FileUploadService {
  constructor(private readonly configService: ConfigService) {}

  // Manual upload logic removed as we are using multer-s3 interceptor
}
