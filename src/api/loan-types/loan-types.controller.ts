import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { LoanTypesService } from './loan-types.service';
import { CreateLoanTypeDto, UpdateLoanTypeDto } from './dto/loan-types.dto';

@Controller('loan-types')
export class LoanTypesController {
  constructor(private readonly loanTypesService: LoanTypesService) {}

  @Get()
  findAll() {
    return this.loanTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loanTypesService.findOne(id);
  }

  @Post()
  create(@Body() createLoanTypeDto: CreateLoanTypeDto) {
    return this.loanTypesService.create(createLoanTypeDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLoanTypeDto: UpdateLoanTypeDto,
  ) {
    return this.loanTypesService.update(id, updateLoanTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.loanTypesService.remove(id);
  }
}
