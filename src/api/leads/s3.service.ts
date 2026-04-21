import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucketName = this.configService.get('AWS_S3_BUCKET_NAME');
  }

  async uploadPdf(buffer: Buffer, fileName: string): Promise<string> {
    const key = `application-forms/${fileName}`;

    try {
      // Attempt 1: Try with public-read ACL
      return await this.performUpload(buffer, key, 'public-read');
    } catch (error: any) {
      this.logger.warn(
        `⚠ Public upload failed, retrying without ACL: ${error.message}`,
      );
      // Attempt 2: Fallback to private upload (default bucket policy)
      return await this.performUpload(buffer, key, undefined);
    }
  }

  private async performUpload(
    buffer: Buffer,
    key: string,
    acl?: 'public-read',
  ): Promise<string> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: 'application/pdf',
        ACL: acl,
      }),
    );

    const url = `https://${this.bucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;
    this.logger.log(`✓ PDF uploaded to S3 (${acl || 'private'}): ${url}`);
    return url;
  }

  async downloadPdf(fileName: string): Promise<Buffer> {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const key = `application-forms/${fileName}`;

    try {
      // Actual Retrieval
      const data = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );

      const streamToBuffer = (stream: any): Promise<Buffer> =>
        new Promise((resolve, reject) => {
          const chunks: any[] = [];
          stream.on('data', (chunk: any) => chunks.push(chunk));
          stream.on('error', reject);
          stream.on('end', () => resolve(Buffer.concat(chunks)));
        });

      return await streamToBuffer(data.Body);
    } catch (error: any) {
      this.logger.error(`✗ S3 Download Error for ${key}: ${error.message}`);
      throw error;
    }
  }

  async getPresignedUrl(fileName: string): Promise<string> {
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const key = `application-forms/${fileName}`;

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      // URL expires in 1 hour (3600 seconds)
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600,
      });
      return url;
    } catch (error: any) {
      this.logger.error(`✗ S3 Presign Error for ${key}: ${error.message}`);
      throw error;
    }
  }
}
