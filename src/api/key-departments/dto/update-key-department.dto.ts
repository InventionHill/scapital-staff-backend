import { PartialType } from '@nestjs/mapped-types';
import { CreateKeyDepartmentDto } from './create-key-department.dto';

export class UpdateKeyDepartmentDto extends PartialType(
  CreateKeyDepartmentDto,
) {}
