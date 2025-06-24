// chat/chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { v4 } from 'uuid';
import * as moment from 'moment';
import { CacheService } from '../common/cache-manager/cache.service';

type SendMessageItemProps = {
  senderId: string;
  sender: string;
  recipientId: string;
  message: string;
};

const CHAT_USER_SOCKET_MAP = 'chat-user-socket-map';

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: 'http://127.0.0.1:3000', credentials: true },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private cacheService: CacheService) {}

  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Socket>();

  afterInit(server: Server) {
    console.log('WebSocket 网关已初始化');
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.auth.userId;
    this.cacheService.client.hmset(CHAT_USER_SOCKET_MAP, userId, client.id);

    this.userSockets.set(client.id, client);
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.auth.userId;
    this.cacheService.client.hdel(CHAT_USER_SOCKET_MAP, userId, client.id);

    this.userSockets.delete(client.id);
  }

  async sendToUser(userId: string, event: string, data: any) {
    const socketIds = await this.cacheService.client.hmget(
      CHAT_USER_SOCKET_MAP,
      userId,
    );

    if (!socketIds.length) {
      return;
    }

    socketIds.forEach((socketId) => {
      const client = this.userSockets.get(socketId);
      if (!client) return;

      client.emit(event, data);
    });
  }

  @SubscribeMessage('sendMessage')
  handleMessage(
    @MessageBody()
    data: SendMessageItemProps,
    @ConnectedSocket() client: Socket,
  ) {
    const uuid = v4();
    const datetime = moment().format('YYYY-MM-DD HH:mm:ss');
    client.emit('receiveMessage', {
      ...data,
      key: uuid,
      datetime,
      isMe: true,
    });
    console.log('data==', data);

    this.sendToUser(data.recipientId, 'receiveMessage', {
      ...data,
      key: uuid,
      datetime,
      isMe: false,
    });
  }

  broadcastAll(data: any) {
    // 广播消息到所有客户端
    this.server.emit('receiveMessage', {
      ...data,
      key: v4(),
      datetime: moment().format('YYYY-MM-DD HH:mm:ss'),
    });
  }
}
