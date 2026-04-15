import { PartialType } from '@nestjs/swagger';
import { CreatePlatformStatDto } from './create-platform-stat.dto';

export class UpdatePlatformStatDto extends PartialType(CreatePlatformStatDto) {}
