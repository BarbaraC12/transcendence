import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/auth/accessToken.guard';
import { StatsService } from 'src/stats/stats.service';

@Controller('/stats')
@ApiTags('Statistique')
export class StatsController {
  constructor(private readonly StatsService: StatsService) {}

  @Get('/:Nickname')
  @UseGuards(AccessTokenGuard)
  @ApiOperation({
    summary: 'Get a user stats by its id',
  })
  @ApiResponse({ status: 200, description: 'Succes' })
  @ApiResponse({ status: 400, description: 'User Not found' })
  @ApiResponse({ status: 400, description: 'Stats Not found' })
  @ApiResponse({ status: 401, description: 'Not authorized' })
  async getUserStatsById(@Param('Nickname') Nickname: string) {
    return this.StatsService.UserStats(Nickname);
  }
}
