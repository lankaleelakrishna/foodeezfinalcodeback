import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { DeliveryTrackingService } from './delivery-tracking.service';
import { UpdateLocationDto } from './dto/update-location.dto';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/delivery-tracking',
})
export class DeliveryTrackingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DeliveryTrackingGateway.name);

  constructor(private readonly trackingService: DeliveryTrackingService) {}

  afterInit() {
    this.logger.log('Delivery tracking WebSocket gateway initialized.');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('rider-location-update')
  async handleLocationUpdate(
    @MessageBody() payload: UpdateLocationDto,
    @ConnectedSocket() client: Socket,
  ) {
    const result = await this.trackingService.updateLocation(payload);

    this.server.to(`order-${payload.orderId}`).emit('rider-location-update', result);
    this.server.to(`rider-${payload.partnerId}`).emit('rider-location-update', result);
    this.server.to('admin-room').emit('rider-location-update', result);

    return result;
  }

  @SubscribeMessage('join-order-room')
  handleJoinOrderRoom(
    @MessageBody() data: { orderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`order-${data.orderId}`);
    client.emit('joined', { room: `order-${data.orderId}` });
  }

  @SubscribeMessage('join-rider-room')
  handleJoinRiderRoom(
    @MessageBody() data: { riderId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`rider-${data.riderId}`);
    client.emit('joined', { room: `rider-${data.riderId}` });
  }

  @SubscribeMessage('join-admin-room')
  handleJoinAdminRoom(@ConnectedSocket() client: Socket) {
    client.join('admin-room');
    client.emit('joined', { room: 'admin-room' });
  }

  emitOrderStatusUpdate(orderId: string, status: string) {
    this.server.to(`order-${orderId}`).emit('order-status-update', { orderId, status });
    this.server.to('admin-room').emit('order-status-update', { orderId, status });
  }

  emitEtaUpdate(orderId: string, etaMins: number) {
    this.server.to(`order-${orderId}`).emit('eta-update', { orderId, etaMins });
  }
}
