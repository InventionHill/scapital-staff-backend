import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
} from '@nestjs/common';
import { LoanComparisonService } from './loan-comparison.service';
import { CreateLoanProductDto } from './dto/create-loan-product.dto';
import { CreateComparisonParameterDto } from './dto/create-comparison-parameter.dto';
import { UpdateComparisonValueDto } from './dto/update-comparison-value.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('loan-comparison')
export class LoanComparisonController {
  constructor(private readonly service: LoanComparisonService) {}

  // Products
  @Post('products')
  @UseGuards(AuthGuard('jwt'))
  createProduct(@Body() dto: CreateLoanProductDto) {
    return this.service.createProduct(dto);
  }

  @Put('products/reorder')
  @UseGuards(AuthGuard('jwt'))
  reorderProducts(@Body() body: { ids: string[] }) {
    return this.service.reorderProducts(body.ids);
  }

  @Get('products')
  findAllProducts() {
    return this.service.findAllProducts();
  }

  @Put('products/:id')
  @UseGuards(AuthGuard('jwt'))
  updateProduct(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @UseGuards(AuthGuard('jwt'))
  removeProduct(@Param('id') id: string) {
    return this.service.removeProduct(id);
  }

  // Parameters
  @Post('parameters')
  @UseGuards(AuthGuard('jwt'))
  createParameter(@Body() dto: CreateComparisonParameterDto) {
    return this.service.createParameter(dto);
  }

  @Put('parameters/reorder')
  @UseGuards(AuthGuard('jwt'))
  reorderParameters(@Body() items: { id: string; order: number }[]) {
    return this.service.reorderParameters(items);
  }

  @Get('parameters')
  findAllParameters() {
    return this.service.findAllParameters();
  }

  @Put('parameters/:id')
  @UseGuards(AuthGuard('jwt'))
  updateParameter(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateParameter(id, dto);
  }

  @Delete('parameters/:id')
  @UseGuards(AuthGuard('jwt'))
  removeParameter(@Param('id') id: string) {
    return this.service.removeParameter(id);
  }

  // Values
  @Get('values')
  getValues() {
    return this.service.getComparisonValues();
  }

  @Post('values')
  @UseGuards(AuthGuard('jwt'))
  updateValue(@Body() dto: UpdateComparisonValueDto) {
    return this.service.updateComparisonValue(dto);
  }
}
