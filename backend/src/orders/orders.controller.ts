import { Controller, Post, Body, Get, Param, Patch, Query, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { EstadoPedido, Rol } from '@prisma/client';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post(['pedidos', 'orders'])
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  create(@Body() createOrderDto: CreateOrderDto, @GetUser('id') userId: string) {
    return this.ordersService.createOrder(createOrderDto, userId);
  }

  /**
   * Rastreo de pedidos público y seguro (SEC-02):
   * Exige código exacto y teléfono de 10 dígitos. Rate limit: 5 peticiones/min.
   */
  @Get(['pedidos/rastreo', 'orders/track'])
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  trackOrder(
    @Query('codigo') codigo?: string,
    @Query('telefono') telefono?: string,
  ) {
    return this.ordersService.trackOrder(codigo || '', telefono || '');
  }

  @Get(['pedidos/rastreo/:codigo', 'orders/track/:codigo'])
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  trackOrderByParam(
    @Param('codigo') codigo: string,
    @Query('telefono') telefono?: string,
  ) {
    return this.ordersService.trackOrder(codigo || '', telefono || '');
  }

  @Post(['pedidos/:codigo/comprobante', 'orders/:codigo/receipt'])
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('comprobante', {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5 MB max
  }))
  uploadComprobante(
    @Param('codigo') codigo: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('telefono') telefono?: string,
  ) {
    return this.ordersService.uploadComprobante(codigo, file, telefono);
  }

  @Get(['admin/pedidos', 'admin/orders'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  findAll(@Query('estado') estado?: EstadoPedido) {
    return this.ordersService.findAll(estado);
  }

  @Get(['admin/pedidos/:id', 'admin/orders/:id'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(['admin/pedidos/:id/estado', 'admin/orders/:id/status'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  updateEstado(@Param('id') id: string, @Body('estado') estado: EstadoPedido) {
    return this.ordersService.updateEstado(id, estado);
  }

  /**
   * Descarga/Visualización privada y segura de comprobantes (SEC-05):
   * Restringido exclusivamente al rol ADMIN autenticado.
   * Emite cabeceras de seguridad estrictas (sin sniffing, caché privada/no-store).
   */
  @Get(['admin/pedidos/:id/comprobante', 'admin/orders/:id/receipt'])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  async getComprobante(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { filePath, mimeType, filename } = await this.ordersService.getComprobanteFile(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    return res.sendFile(filePath);
  }
}
