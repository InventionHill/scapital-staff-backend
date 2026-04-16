import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { LoanTypesService } from './loan-types.service';
import { CreateLoanTypeDto } from './dto/create-loan-type.dto';
import { UpdateLoanTypeDto } from './dto/update-loan-type.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('loan-types')
@UseGuards(AuthGuard('jwt'))
export class LoanTypesController {
  constructor(private readonly loanTypesService: LoanTypesService) {}

  @Post()
  create(@Body() createLoanTypeDto: CreateLoanTypeDto) {
    return this.loanTypesService.create(createLoanTypeDto);
  }

  @Get()
  findAll() {
    return this.loanTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loanTypesService.findOne(id);
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
