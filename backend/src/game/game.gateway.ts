import { WebSocketGateway, SubscribeMessage } from '@nestjs/websockets';
import { GameService } from './game.service';
import { WebsocketsService } from 'src/websockets/websockets.service';
import { Socket } from 'socket.io';

@WebSocketGateway()
export class GameGateway {
  constructor(
    private readonly game: GameService,
    private readonly websockets: WebsocketsService,
  ) {}

  @SubscribeMessage('match_making')
  async matchmaking(socket: Socket, payload: any) {
    if (!payload || !payload.action) return;
    switch (payload.action) {
      case 'join':
        this.game.join_queue(socket);
        break;
      case 'cancel':
        this.game.cancel_queue(socket);
        break;
      case 'leave':
        this.game.leave_game(socket);
        break;
    }
  }

  @SubscribeMessage('match_training')
  async training(socket: Socket) {
    this.game.create_training_game(socket);
  }

  @SubscribeMessage('match_leave')
  async leave(socket: Socket) {
    this.game.leave_game(socket);
  }

  @SubscribeMessage('match_game_input')
  async gameInput(socket: any, payload: any) {
    if (!payload || !payload.action || !payload.direction) return;
    const game = this.game.get_game_where_player_is(socket.user.id);
    if (!game) return;
    game.process_input(socket.user.id, payload);
  }

  @SubscribeMessage('match_spectate')
  async spectateMatch(socket: any, payload: any) {
    if (!payload || !payload.id) return;
    const game = this.game.get_game_where_player_is(payload.id);
    if (!game) return { status: 404, reason: 'Game not found' };
    this.websockets.send(socket, 'match_spectate', {
      status: 'success',
    });
    game.add_spectator(socket);
  }

  @SubscribeMessage('match_name_spectate')
  async spectateMatchName(socket: any, payload: any) {
    if (!payload || !payload.name) return;
    const game = this.game.get_game_where_player_is_by_name(payload.name);
    if (!game) {
      this.websockets.send(socket, 'match_spectate_error', {
        status: 'error',
        error: 'Game not found',
      });
      return;
    }
    this.websockets.send(socket, 'match_spectate', {
      status: 'success',
    });
    game.add_spectator(socket);
  }

  @SubscribeMessage('match_send_invitation')
  async getInvitation(
    socket: any,
    payload: any,
  ): Promise<{ status: number; reason: string }> {
    if (
      !socket ||
      !payload ||
      !payload.winScore ||
      (!payload.nickname && (payload.obstacle || !payload.obstacle))
    ) {
      return { status: 403, reason: 'Data needed not fetch' };
    }
    if (payload.id) return this.game.create_invitation_by_id(socket, payload);
    else if (payload.nickname)
      return this.game.create_invitation_by_nickname(socket, payload);
    return { status: 666, reason: 'SATAN' };
  }

  @SubscribeMessage('match_invitation_cancel')
  async closeInvitation(
    socket: any,
    payload: any,
  ): Promise<{ status: number; reason: string }> {
    if (!socket || !payload || !payload.nickname) {
      return { status: 403, reason: 'Data needed not fetch' };
    }
    return this.game.game_abort(socket, payload.nickname);
  }

  @SubscribeMessage('match_invitation_accept')
  async match_invitation_accept(
    socket: Socket,
    payload: any,
  ): Promise<{ status: number; reason: string }> {
    if (
      !socket ||
      !payload ||
      !payload.winScore ||
      (!payload.nickname && (payload.obstacle || !payload.obstacle))
    ) {
      return { status: 403, reason: 'Data needed not fetch' };
    }
    return this.game.game_friend_start(socket, payload);
  }

  @SubscribeMessage('match_invitation_refused')
  async match_invitation_refuse(
    socket: Socket,
    payload: any,
  ): Promise<{ status: number; reason: string }> {
    if (!socket || !payload || !payload.nickname)
      return { status: 403, reason: 'Data needed not fetch' };
    await this.game.refuseInvitation(socket, payload);
    return { status: 200, reason: 'Ok' };
  }

  @SubscribeMessage('match_spectate_leave')
  async spectateLeave(socket: any) {
    const game = this.game.get_game_where_spectator_is(socket.user.id);
    if (!game) return;
    this.websockets.send(socket, 'match_spec_change_state', {});
    game.remove_spectator(socket);
  }
}
