import { UseInterceptors, applyDecorators } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import * as dotenv from 'dotenv';

dotenv.config();

export function S3FileFieldsInterceptor(
  fields: { name: string; maxCount: number }[],
  folderName = 'any',
  options: {
    bucket?: string;
    fieldNamePrefix?: string;
  } = {},
) {
  const s3 = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const bucket =
    options.bucket || process.env.AWS_S3_BUCKET_NAME || 'ceramic-ihill';

  const storage = multerS3({
    s3,
    bucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      try {
        const userWithOrg = req as any;
        const orgName = userWithOrg.user?.organization?.name || 'default';
        const randomName = Array(32)
          .fill(null)
          .map(() => Math.floor(Math.random() * 16).toString(16))
          .join('');
        const filename = `media/${orgName}/${folderName}/${randomName}${extname(file.originalname)}`;
        cb(null, filename);
      } catch (err) {
        cb(err, '');
      }
    },
  });

  return applyDecorators(
    UseInterceptors(FileFieldsInterceptor(fields, { storage })),
  );
}
