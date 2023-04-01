import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { AccessTokenGuard } from 'src/auth/accessToken.guard';
import { SessionUser } from 'src/decorator/session-user.decorator';
import { FriendDto } from './dto/friends.dto';
import { FriendService } from './friends.service';

@Controller('/friend')
@ApiTags('Friends')
@UseGuards(AccessTokenGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendService) {}

  @Get('')
  @ApiOperation({
    summary: 'Get all friends',
    parameters: [{ name: 'nickname', in: 'query' }],
  })
  @ApiResponse({ status: 401, description: 'Not authorized' })
  @ApiResponse({ status: 200, description: 'Succes' })
  async getFriendsByNickname(@SessionUser() user: User) {
    return this.friendsService.getAllFriendsFromUser(user);
  }

  @Get(':nickname')
  @ApiOperation({
    summary: 'Get friends by is nickname',
  })
  @ApiResponse({ status: 401, description: 'Not authorized' })
  @ApiResponse({ status: 200, description: 'Succes' })
  async getFriends(@Param('nickname') nickname: string) {
    return this.friendsService.getFriendsFromNickname(nickname);
  }

  @Post('add/:nickname')
  @ApiOperation({
    summary: 'Add friends',
    parameters: [{ name: 'nickname', in: 'query' }],
  })
  @ApiResponse({ status: 401, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 200, description: 'Succes' })
  async addFriendsNickname(
    @SessionUser() user: User,
    @Param('nickname') nickname: string,
  ) {
    // Add function for adding friends
    this.friendsService.addFriendsByNickname(user, nickname);
  }

  @Post('add')
  @ApiOperation({
    summary: 'Add friends',
  })
  @ApiResponse({ status: 401, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 200, description: 'Succes' })
  async addFriend(@SessionUser() user: User, @Body() addFriendDto: FriendDto) {
    this.friendsService.addFriendsByNickname(user, addFriendDto.nickname);
  }

  @Patch('remove:nickname')
  @ApiOperation({
    summary: 'Remove friends',
    parameters: [{ name: 'nickname', in: 'query' }],
  })
  @ApiResponse({ status: 401, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 200, description: 'Succes' })
  async removeFriendByNickname(
    @SessionUser() user: User,
    @Param('nickname') nickname: string,
  ) {
    this.friendsService.removeFriendsByNickname(user, nickname);
  }

  @Patch('remove')
  @ApiOperation({
    summary: 'Remove friends',
  })
  @ApiResponse({ status: 401, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 200, description: 'Succes' })
  async removeFriend(
    @SessionUser() user: User,
    @Body() removeFriendDto: FriendDto,
  ) {
    this.friendsService.removeFriendsByNickname(user, removeFriendDto.nickname);
  }
}
