import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { UpdateSchoolLocationDto } from './dto/update-school-location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('children')
@Controller('children')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChildrenController {
  constructor(private readonly childrenService: ChildrenService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new child profile' })
  create(@CurrentUser('id') userId: string, @Body() createChildDto: CreateChildDto) {
    return this.childrenService.create(userId, createChildDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all children for current parent' })
  findAll(@CurrentUser('id') userId: string) {
    return this.childrenService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get child by ID' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.childrenService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update child profile' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateChildDto: UpdateChildDto,
  ) {
    return this.childrenService.update(userId, id, updateChildDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete (deactivate) child profile' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.childrenService.remove(userId, id);
  }

  @Patch(':id/school-location')
  @ApiOperation({ summary: 'Update school location for child' })
  updateSchoolLocation(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateSchoolLocationDto: UpdateSchoolLocationDto,
  ) {
    return this.childrenService.updateSchoolLocation(userId, id, updateSchoolLocationDto);
  }

  @Get(':id/school-location')
  @ApiOperation({ summary: 'Get school location for child' })
  getSchoolLocation(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.childrenService.getSchoolLocation(userId, id);
  }

  @Get(':id/location/latest')
  @ApiOperation({ summary: 'Get latest location for child' })
  getLatestLocation(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.childrenService.getLatestLocation(userId, id);
  }

  @Get(':id/location/history')
  @ApiOperation({ summary: 'Get location history for child' })
  @ApiQuery({ name: 'from', required: false, type: Date })
  @ApiQuery({ name: 'to', required: false, type: Date })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getLocationHistory(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.childrenService.getLocationHistory(
      userId,
      id,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      limit ? parseInt(limit) : 100,
    );
  }

  @Get(':id/alerts')
  @ApiOperation({ summary: 'Get alerts for child' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAlerts(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.childrenService.getAlerts(
      userId,
      id,
      status,
      limit ? parseInt(limit) : 50,
    );
  }
}
