import {
  Controller,
  Post,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';
import { S3FileFieldsInterceptor } from '../../utils/s3-interceptor';
import 'multer';

@ApiTags('File Upload')
@Controller('upload')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a file to S3' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @S3FileFieldsInterceptor([{ name: 'file', maxCount: 5 }])
  async uploadFile(@UploadedFiles() files: { file?: Express.Multer.File[] }) {
    if (!files || !files.file || files.file.length === 0) {
      throw new BadRequestException('File is required');
    }

    // keys/locations are added by multer-s3
    const urls = files.file.map((f: any) => f.location);
    return { urls };
  }
}
