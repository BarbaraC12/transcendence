import { Inject, forwardRef, Injectable } from '@nestjs/common';
import { User, StatusUser, MatchInvitation } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { WebsocketsService } from 'src/websockets/websockets.service';
import { Game } from './game.class';
import { Socket } from 'socket.io';
import { giveAchievementService } from 'src/achievement/utils/giveachievement.service';
import { TypeMode } from './Interface';
import { convert_invitation } from './create_state';

@Injectable()
export class GameService {
  private game_queue: Socket[] = [];
  games: Game[] = [];

  constructor(
    @Inject(forwardRef(() => WebsocketsService))
    private readonly websocket: WebsocketsService,
    private readonly prisma: PrismaService,
    private readonly achievement: giveAchievementService,
  ) {}

  async join_queue(socket: any) {
    const user: User | null = await this.prisma.user.findUnique({
      where: { id: socket.user.id },
    });
    if (!user) return;
    socket.user.profile = user.profileId;
    this.register_quit(socket);
    this.game_queue.push(socket);
    this._treat_queue(this.game_queue);
  }

  private async _set_players_status(
    socket: any[],
    status: 'ONLINE' | 'PREPARING',
  ) {
    await this.prisma.user.updateMany({
      where: {
        OR: [{ id: socket[0].user.id }, { id: socket[1].user.id }],
      },
      data: { status: status },
    });
    this.websocket.broadcast('user_status', {
      nickname: socket[0].user.nickname,
      status: status,
    });
    this.websocket.broadcast('user_status', {
      nickname: socket[1].user.nickname,
      status: status,
    });
  }

  async create_invitation_by_nickname(
    socket: any,
    payload: any,
  ): Promise<{ status: number; reason: string }> {
    const user: {
      id: number;
      status: StatusUser;
      blockedUsers: User[];
    } | null = await this.prisma.user.findUnique({
      where: {
        nickname: payload.nickname,
      },
      select: {
        id: true,
        status: true,
        blockedUsers: true,
      },
    });
    if (!user) return { status: 404, reason: 'User not found' };
    if (user.blockedUsers.find((user) => user.nickname == socket.user.nickname))
      return { status: 406, reason: 'User blocked you' };
    if (user.status == 'PLAYING')
      return { status: 400, reason: 'User Already in game' };
    if (user.status == 'PREPARING')
      return { status: 400, reason: 'User is preparing to play' };
    const already_exist = await this.prisma.matchInvitation.findMany({
      where: {
        createdById: socket.user.id,
      },
    });
    if (already_exist.length > 0)
      return { status: 429, reason: 'Invitation already send' };
    const invited_socket: Socket[] = this.websocket.getSockets([user.id]);
    if (!invited_socket || !invited_socket[0])
      return { status: 400, reason: 'User offline' };
    await this.prisma.matchInvitation.create({
      data: {
        createdById: socket.user.id,
        sendToId: user.id,
        winScore: payload.winScore,
        obstacle: payload.obstacle,
      },
    });
    const res = convert_invitation(socket, payload);
    this.websocket.send(invited_socket[0], 'invitation_game', res);
    this._set_players_status([invited_socket[0], socket], 'PREPARING');
    return { status: 200, reason: 'Invitation send' };
  }

  async create_invitation_by_id(
    socket: any,
    payload: any,
  ): Promise<{ status: number; reason: string }> {
    const user: {
      status: StatusUser;
      blockedUsers: User[];
    } | null = await this.prisma.user.findUnique({
      where: {
        id: payload.id,
      },
      select: {
        status: true,
        blockedUsers: true,
      },
    });
    if (!user) return { status: 404, reason: 'User not found' };
    if (user.blockedUsers.find((user) => user.nickname == socket.user.nickname))
      return { status: 406, reason: 'User blocked you' };
    if (user.status == 'PLAYING')
      return { status: 400, reason: 'User Already in game' };
    if (user.status == 'PREPARING')
      return { status: 400, reason: 'User is preparing to play' };
    const already_exist = await this.prisma.matchInvitation.findMany({
      where: {
        createdById: socket.user.id,
      },
    });
    if (already_exist.length > 0)
      return { status: 429, reason: 'Invitation already send' };
    const invited_socket: Socket[] = this.websocket.getSockets([payload.id]);
    if (!invited_socket || !invited_socket[0])
      return { status: 400, reason: 'User offline' };
    await this.prisma.matchInvitation.create({
      data: {
        createdById: socket.user.id,
        sendToId: payload.id,
        winScore: payload.winScore,
        obstacle: payload.obstacle,
      },
    });
    const res = convert_invitation(socket, payload);
    this.websocket.send(invited_socket[0], 'invitation_game', res);
    this._set_players_status([invited_socket[0], socket], 'PREPARING');
    return { status: 200, reason: 'Invitation send' };
  }

  async send_all_invitation(socket: any) {
    if (!socket) return;
    const allInvit = await this.prisma.matchInvitation.findMany({
      where: {
        sendToId: socket.user.id,
      },
      select: {
        createdBy: true,
        obstacle: true,
        winScore: true,
      },
    });
    for (let i = 0; i < allInvit.length; i++) {
      const res = convert_invitation(
        {
          user: {
            nickname: allInvit[i].createdBy.nickname,
            avatar: allInvit[i].createdBy.avatar,
          },
        },
        { obstacle: allInvit[i].obstacle, winScore: allInvit[i].winScore },
      );
      this.websocket.send(socket, 'invitation_game', res);
      await this.prisma.user.updateMany({
        where: {
          id: socket[0].user.id,
        },
        data: { status: 'PREPARING' },
      });
      this.websocket.broadcast('user_status', {
        nickname: socket[0].user.nickname,
        status: 'PREPARING',
      });
    }
  }

  async game_friend_start(
    socket: any,
    payload: any,
  ): Promise<{ status: number; reason: string }> {
    // The user accepted the game invitation
    const type: TypeMode =
      payload.obstacle == true ? TypeMode.CUSTOM : TypeMode.NORMAL;
    const user: { id: number } | null = await this.prisma.user.findUnique({
      where: {
        nickname: payload.nickname,
      },
      select: {
        id: true,
      },
    });
    if (!user) return { status: 403, reason: 'User not found' };
    const sockets: any = this.websocket.getSockets([user.id]);
    if (!sockets[0]) return { status: 400, reason: 'Opponents log out' };
    this.register_quit(socket);
    this.register_quit(sockets[0]);
    this.websocket.send(sockets[0], 'invitation_accepted', '');
    this.websocket.send(sockets[0], 'match_custom_start', '');
    this.websocket.send(socket, 'match_custom_start', '');
    this._delete_user_invitations(user.id);
    const game = new Game(
      this.prisma,
      this.websocket,
      this.achievement,
      type,
      payload.winScore,
      { socket: sockets[0], user: sockets[0].user },
      { socket: socket, user: socket.user },
      payload.obstacle,
    );
    this.games.push(game);
    game.start(() => {
      this.games.splice(this.games.indexOf(game), 1);
    });
    return { status: 200, reason: 'Game start' };
  }

  async game_abort(
    socket: any,
    nickname: string,
  ): Promise<{ status: number; reason: string }> {
    const userId: { id: number } | null = await this.prisma.user.findUnique({
      where: {
        nickname: nickname,
      },
      select: {
        id: true,
      },
    });
    if (!userId) return { status: 403, reason: 'User not found' };
    const inviteUserSocket: Socket[] = this.websocket.getSockets([userId.id]);
    if (!inviteUserSocket[0]) return { status: 400, reason: 'User disconnect' };
    const invit = await this.prisma.matchInvitation.findUnique({
      where: {
        createdById: socket.user.id,
      },
    });
    if (!invit) return { status: 404, reason: 'Invitation not found' };
    this._set_players_status([inviteUserSocket[0], socket], 'ONLINE');
    this.websocket.send(inviteUserSocket[0], 'match_invitation_canceled', {});
    this._delete_user_invitations(socket.user.id);
    return { status: 200, reason: 'Success' };
  }

  async delete_invitation(socket: any, user: User) {
    const invit: MatchInvitation | null =
      await this.prisma.matchInvitation.findUnique({
        where: {
          createdById: user.id,
        },
      });
    if (!invit) return;
    const inviteUserSocket: Socket[] = this.websocket.getSockets([
      invit.sendToId,
    ]);
    if (!inviteUserSocket[0]) return;
    this.websocket.send(inviteUserSocket[0], 'match_invitation_canceled', {});
    this._set_players_status([inviteUserSocket[0], socket], 'ONLINE');
    this._delete_user_invitations(user.id);
  }

  private async _delete_user_invitations(createdID: number) {
    await this.prisma.matchInvitation.delete({
      where: {
        createdById: createdID,
      },
    });
  }

  async refuseInvitation(socket: any, payload: any) {
    const user: { id: number } | null = await this.prisma.user.findUnique({
      where: {
        nickname: payload.nickname,
      },
      select: {
        id: true,
      },
    });
    if (!user) return { status: 404, reason: 'user not found' };
    const socketUserCreate: Socket[] = this.websocket.getSockets([user.id]);
    this.websocket.send(socketUserCreate[0], 'invitation_refused', '');
    const invit: MatchInvitation | null =
      await this.prisma.matchInvitation.findUnique({
        where: {
          createdById: user.id,
        },
      });
    if (!invit) return;
    this._set_players_status([socketUserCreate[0], socket], 'ONLINE');
    this._delete_user_invitations(user.id);
  }

  async create_training_game(socket: any) {
    const msg = {
      action: 'match',
      player1: {
        name: socket.nickname,
        avatar: socket.user.avatar,
      },
      player2: {
        name: 'AI',
        avatar: '',
      },
    };
    this.register_quit(socket);
    this.websocket.send(socket, 'matchmaking', msg);
    const game = new Game(
      this.prisma,
      this.websocket,
      this.achievement,
      TypeMode.TRAINING,
      5,
      { socket: socket, user: socket.user },
    );
    this.games.push(game);
    game.start(() => {
      this.games.splice(this.games.indexOf(game), 1);
    });
  }

  private _treat_queue(queue: Socket[]) {
    if (queue.length >= 2) {
      const player1: any = queue.shift();
      const player2: any = queue.shift();
      const msg = {
        action: 'match',
        player1: {
          name: player1.nickname,
          avatar: player1.user.avatar,
        },
        player2: {
          name: player2.nickname,
          avatar: player2.user.avatar,
        },
      };
      this.websocket.send(player1, 'matchmaking', msg);
      this.websocket.send(player2, 'matchmaking', msg);
      this.register_quit(player1);
      this.register_quit(player2);
      const game = new Game(
        this.prisma,
        this.websocket,
        this.achievement,
        TypeMode.NORMAL,
        5,
        { socket: player1, user: player1.user },
        { socket: player2, user: player2.user },
      );
      this.games.push(game);
      game.start(() => {
        this.games.splice(this.games.indexOf(game), 1);
      });
    }
  }

  register_quit(socket: Socket) {
    this.websocket.registerOnClose(socket, () => {
      this.cancel_queue(socket);
      this.leave_game(socket);
    });
  }

  cancel_queue(socket: any) {
    this.game_queue.splice(this.game_queue.indexOf(socket), 1);
  }

  leave_game(socket: any) {
    const game = this.get_game_where_player_is(socket.user.id);
    if (!game) return;
    game.leave(socket.user.id);
  }

  get_game_where_player_is(userId: number) {
    return this.games.find((game: Game) => game.get_player(userId) != null);
  }

  get_game_where_player_is_by_name(username: string) {
    return this.games.find(
      (game: Game) => game.get_player_by_name(username) != null,
    );
  }

  get_game_where_spectator_is(userId: number) {
    return this.games.find((game: Game) => game.get_spectator(userId) != null);
  }
}
