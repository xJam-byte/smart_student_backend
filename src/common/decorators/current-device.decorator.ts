import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentDevice = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const device = request.device;

    return data ? device?.[data] : device;
  },
);
