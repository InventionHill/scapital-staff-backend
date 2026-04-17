import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
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
  create(@Body() createLoanTypeDto: CreateLoanTypeDto, @Request() req: any) {
    return this.loanTypesService.create(createLoanTypeDto, req.user.id);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.loanTypesService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.loanTypesService.findOne(id, req.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLoanTypeDto: UpdateLoanTypeDto,
    @Request() req: any,
  ) {
    return this.loanTypesService.update(id, updateLoanTypeDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.loanTypesService.remove(id, req.user.id);
  }
}
