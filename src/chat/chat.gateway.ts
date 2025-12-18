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
import customLogger from '../common/logger';
import { sleep } from '@nestjs/terminus/dist/utils';
import Env from '../common/const/Env';

type SendMessageItemProps = {
  senderId: string;
  sender: string;
  recipientId: string;
  message: string;
};

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: [Env.FRONTEND_URL].filter(Boolean),
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private cacheService: CacheService) {}

  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Socket>();

  afterInit(server: Server) {
    customLogger.log({ message: 'Websocket started' });
  }

  private getUserSocketMapKey(userId: string) {
    const CHAT_USER_SOCKET_MAP = 'chat-user-socket-map';
    return `${CHAT_USER_SOCKET_MAP}:${userId}`;
  }

  private getMessagePipelineKey(userId: string) {
    const CHAT_MESSAGE_PIPELINE_SET = 'chat-message-pipeline';
    return `${CHAT_MESSAGE_PIPELINE_SET}:${userId}`;
  }

  async handleConnection(client: Socket) {
    const userId = client.handshake.auth.userId;
    const chatUserSocketMapKey = this.getUserSocketMapKey(userId);
    this.cacheService.client.hset(chatUserSocketMapKey, client.id, 1);
    this.cacheService.client.expire(chatUserSocketMapKey, 24 * 3600);

    this.userSockets.set(client.id, client);

    const pipelineKey = this.getMessagePipelineKey(userId);
    const messages = await this.cacheService.client.smembers(pipelineKey);
    this.cacheService.client.expire(pipelineKey, 3 * 24 * 3600);

    customLogger.log({
      userId,
      count: messages.length,
      message: '待发送 message 数量',
    });

    if (!messages) {
      return;
    }
    messages.reverse();

    for (const item of messages) {
      try {
        if (!item) return;
        const { event, data } = JSON.parse(item);
        client.emit(event, data);
        this.cacheService.client.srem(pipelineKey, item);
        await sleep(200);
      } catch (e) {
        customLogger.error({
          user_id: userId,
          message: 'Failed parse chat message',
          data: item,
          error: (e as { message: string }).message,
        });
      }
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.handshake.auth.userId;
    const mapKey = this.getUserSocketMapKey(userId);

    this.userSockets.delete(client.id);

    const users = await this.cacheService.client.hgetall(mapKey);
    const socketIds = Object.keys(users);

    for (const socketId of socketIds) {
      this.userSockets.delete(socketId);
      this.cacheService.client.hdel(mapKey, socketId);
    }
  }

  async sendToUser(userId: string, event: string, data: any) {
    const _socketIds = await this.cacheService.client.hgetall(
      this.getUserSocketMapKey(userId),
    );
    const socketIds = Object.keys(_socketIds);

    if (!socketIds.filter(Boolean).length) {
      this.cacheService.client.sadd(
        this.getMessagePipelineKey(userId),
        JSON.stringify({ event, data }),
      );
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
