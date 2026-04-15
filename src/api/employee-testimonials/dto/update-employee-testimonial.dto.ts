import { PartialType } from '@nestjs/mapped-types';
import { CreateEmployeeTestimonialDto } from './create-employee-testimonial.dto';

export class UpdateEmployeeTestimonialDto extends PartialType(
  CreateEmployeeTestimonialDto,
) {}
