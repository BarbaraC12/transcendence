import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Logger,
  NotFoundException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { Request, Response } from 'express';
import { AccessTokenGuard } from 'src/auth/accessToken.guard';
import { VerifyTokenDTO } from 'src/auth/totp/dto/verifyToken.dto';
import { TotpService } from 'src/auth/totp/totp.service';
import { SessionUser } from 'src/decorator/session-user.decorator';
import { UserService } from 'src/user/user.service';

@UseGuards(AccessTokenGuard)
@Controller('/auth/totp')
export class TotpController {
  private readonly logger = new Logger(TotpController.name);

  constructor(
    private readonly totp: TotpService,
    private readonly users: UserService,
  ) {}

  @Post('/')
  @ApiTags('Authentication/TOTP')
  @ApiOperation({
    summary: 'Enable TOTP for the current user',
  })
  @ApiConflictResponse({
    description: 'the user already has OTP set',
  })
  async enableTotp(@SessionUser() user: User) {
    if (await this.users.hasTotpSecret(user)) {
      throw new ConflictException('OTP already set');
    }

    const secret = this.totp.generateSecret(128);
    const updatedUser = await this.users.setTotpSecret(user, secret);
    const uri = this.totp.getTotpUrl(updatedUser);

    return uri;
  }

  @Delete('/')
  @ApiTags('Authentication/TOTP')
  @ApiOperation({
    summary: 'Disable TOTP for the current user',
  })
  @ApiConflictResponse({
    description: 'the user does not have OTP set',
  })
  async disableTotp(@SessionUser() user: User) {
    if (!(await this.users.hasTotpSecret(user))) {
      throw new ConflictException('OTP not set');
    }

    return this.users.removeTotpSecret(user);
  }

  @Post('/activate')
  @ApiTags('Authentication/TOTP')
  // @UsePipes(ValidationPipe)
  @ApiOperation({
    summary: 'Activate the TOTP secret for the current user',
  })
  @ApiOkResponse({
    description: 'The supplied code has been validated ',
  })
  @ApiBadRequestResponse({
    description: 'The supplied code was invalid',
  })
  @ApiNotFoundResponse({
    description: 'TOTP was not enabled for this user',
  })
  async activateSecret(
    @SessionUser() user: User,
    @Body() dto: VerifyTokenDTO,
    @Res() res: Response,
  ) {
    const isValid = await this.totp.verifyToken(user, dto.token);

    if (isValid === null)
      throw new NotFoundException('2-Factor Authentication is not enabled');
    if (!isValid) throw new BadRequestException('Invalid code');

    this.totp.enableTotp(user);

    res.status(200).json(user);
  }

  @Post('/verify')
  @ApiTags('Authentication/TOTP')
  @ApiOperation({
    summary: "Verify a code against the user's secret",
  })
  async verifyToken(
    @SessionUser() user: User,
    @Body() dto: VerifyTokenDTO,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const isValid = await this.totp.verifyToken(user, dto.token);

    if (isValid === null)
      throw new NotFoundException('2-Factor Authentication is not enabled');
    if (!isValid) throw new BadRequestException('Invalid code');

    req.session.totpVerified = true;

    res.status(200).json(user);
  }
}
