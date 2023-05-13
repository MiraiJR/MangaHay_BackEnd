import {
  Body,
  Controller,
  HttpStatus,
  Logger,
  Post,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { Response } from 'express';
import { JwtAuthorizationd } from 'src/common/guards/jwt-guard';
import { CreateReportDTO } from './DTO/create-report';
import { IdUser } from '../user/decorators/id-user';

@Controller('api/report')
export class ReportController {
  constructor(
    private reportService: ReportService,
    private logger: Logger = new Logger(ReportController.name),
  ) {}

  @UseGuards(JwtAuthorizationd)
  @Post('create')
  async createReport(
    @IdUser() id_user: number,
    @Body(new ValidationPipe()) body: CreateReportDTO,
    @Res() response: Response,
  ) {
    try {
      this.reportService.create({
        ...body,
        reporter: id_user,
      });

      return response.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        success: true,
        message: 'Báo cáo thành công!',
        result: {},
      });
    } catch (error) {
      this.logger.error(error);
      return response.status(error.status | 500).json({
        statusCode: error.status,
        success: false,
        message: error.message,
      });
    }
  }
}
