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
import { BusService } from './bus.service';
import { CreateBusRouteDto } from './dto/create-bus-route.dto';
import { UpdateBusRouteDto } from './dto/update-bus-route.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('bus')
@Controller('bus')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BusController {
  constructor(private readonly busService: BusService) {}

  @Post('routes')
  @ApiOperation({ summary: 'Create a new bus route (future expansion)' })
  create(@Body() createBusRouteDto: CreateBusRouteDto) {
    return this.busService.createRoute(createBusRouteDto);
  }

  @Get('routes')
  @ApiOperation({ summary: 'Get all bus routes' })
  findAll() {
    return this.busService.findAllRoutes();
  }

  @Get('routes/:id')
  @ApiOperation({ summary: 'Get bus route by ID' })
  findOne(@Param('id') id: string) {
    return this.busService.findOneRoute(id);
  }

  @Patch('routes/:id')
  @ApiOperation({ summary: 'Update bus route' })
  update(@Param('id') id: string, @Body() updateBusRouteDto: UpdateBusRouteDto) {
    return this.busService.updateRoute(id, updateBusRouteDto);
  }

  @Delete('routes/:id')
  @ApiOperation({ summary: 'Delete (deactivate) bus route' })
  remove(@Param('id') id: string) {
    return this.busService.removeRoute(id);
  }

  @Get('routes/:id/events')
  @ApiOperation({ summary: 'Get events for a bus route' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getEvents(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.busService.getRouteEvents(id, limit ? parseInt(limit) : 50);
  }
}
