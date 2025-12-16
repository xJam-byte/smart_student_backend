import { PartialType } from '@nestjs/swagger';
import { CreateBusRouteDto } from './create-bus-route.dto';

export class UpdateBusRouteDto extends PartialType(CreateBusRouteDto) {}
