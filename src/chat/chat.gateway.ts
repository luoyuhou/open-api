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

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: 'http://127.0.0.1:3000', credentials: true },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    console.log('WebSocket 网关已初始化');
  }

  handleConnection(client: Socket) {
    console.log(`客户端连接: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`客户端断开: ${client.id}`);
  }

  @SubscribeMessage('sendMessage')
  handleMessage(
    @MessageBody() data: { user: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    // 广播消息到所有客户端
    console.log('data', data);
    this.server.emit('receiveMessage', {
      ...data,
      key: v4(),
      datetime: moment().format('YYYY-MM-DD HH:mm:ss'),
    });
  }
}
