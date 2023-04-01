import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AchievementService } from 'src/achievement/achievement.service';
import { AchievementDTO } from 'src/achievement/dto/achievement.dto';
import { IsAdmin } from 'src/achievement/guard/isadmin.guard';
import { AccessTokenGuard } from 'src/auth/accessToken.guard';

@UseGuards(AccessTokenGuard)
@Controller('achievements')
@ApiTags('Achievement')
export class AchievementController {
  constructor(private AchivService: AchievementService) {}

  @Get('')
  @ApiOperation({
    summary: 'Get all achievements',
  })
  @ApiResponse({ status: 401, description: 'Not authorized' })
  @ApiResponse({ status: 200, description: 'Succes' })
  allAchievement() {
    return this.AchivService.allAchievement();
  }

  @HttpCode(HttpStatus.CREATED)
  @IsAdmin()
  @Post('/add')
  @ApiOperation({
    summary: 'Add achivement',
    security: [{ baseUserSecutity: ['Admin'] }],
  })
  @ApiResponse({ status: 400, description: 'Achievement already exist' })
  @ApiResponse({ status: 401, description: 'Not authorized' })
  @ApiResponse({ status: 200, description: 'Succes' })
  addAchievement(@Body() dto: AchievementDTO) {
    return this.AchivService.addAchievement(dto);
  }

  @HttpCode(HttpStatus.OK)
  @IsAdmin()
  @Patch(':id')
  @ApiOperation({
    summary: 'Modif achivement',
    security: [{ baseUserSecutity: ['Admin'] }],
    parameters: [{ name: 'id', in: 'query' }],
  })
  @ApiResponse({ status: 401, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Achievement not found' })
  @ApiResponse({ status: 200, description: 'Succes' })
  updateAchievement(
    @Param('id', ParseIntPipe) achvId: number,
    @Body() dto: AchievementDTO,
  ) {
    return this.AchivService.updateAchievement(achvId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @IsAdmin()
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete achivement',
    security: [{ baseUserSecutity: ['Admin'] }],
    parameters: [{ name: 'id', in: 'query' }],
  })
  @ApiResponse({ status: 401, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Achievement not found' })
  @ApiResponse({ status: 200, description: 'Succes' })
  deleteAchievement(@Param('id', ParseIntPipe) achId: number) {
    return this.AchivService.deleteAchievement(achId);
  }

  @HttpCode(HttpStatus.OK)
  @Get(':Nickname')
  @ApiOperation({
    summary: 'Get user achivement',
    parameters: [{ name: 'Nickname', in: 'query' }],
  })
  @ApiResponse({ status: 401, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 200, description: 'Succes' })
  userAchievement(@Param('Nickname') Nickname: string) {
    return this.AchivService.userAchievement(Nickname);
  }

  @HttpCode(HttpStatus.OK)
  @IsAdmin()
  @Post('/add/:userId/:achievementId')
  @ApiOperation({
    summary: 'Add achievement to user',
    security: [{ User: ['Admin'] }],
    parameters: [
      { name: 'userId', in: 'query' },
      { name: 'achievementId', in: 'query' },
    ],
  })
  @ApiResponse({ status: 200, description: 'Succes' })
  // @ApiResponse({ status: 400, description: 'User already got the achivement' })
  @ApiResponse({ status: 401, description: 'Not authorized' })
  @ApiResponse({
    status: 404,
    description: 'Achievement not found or User not found',
  })
  addToUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('achievementId', ParseIntPipe) achId: number,
  ) {
    return this.AchivService.addToUser(userId, achId);
  }
}
