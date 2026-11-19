import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { EstadoPedido } from '@prisma/client';
import { join, basename, extname } from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as sharp from 'sharp';
// @ts-ignore
const sharpModule = sharp.default || sharp;
const uuidv4 = () => crypto.randomUUID();
import { validateReceiptFile } from '../common/file-validator.util';

// Alfabeto sin caracteres ambiguos (excluye 0, O, 1, I, L)
const ORDER_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Genera un código de pedido criptográficamente seguro y legible (ej. PED-K9X2-M4P7).
 */
export function generateSecureOrderCode(): string {
  const bytes = crypto.randomBytes(8);
  let p1 = '';
  let p2 = '';
  for (let i = 0; i < 4; i++) {
    p1 += ORDER_CODE_ALPHABET[bytes[i] % ORDER_CODE_ALPHABET.length];
  }
  for (let i = 4; i < 8; i++) {
    p2 += ORDER_CODE_ALPHABET[bytes[i] % ORDER_CODE_ALPHABET.length];
  }
  return `PED-${p1}-${p2}`;
}

/**
 * Funciones de enmascaramiento de PII para la consulta pública de rastreo.
 */
function maskCustomerName(fullName: string): string {
  if (!fullName) return 'Cliente';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].length > 2 ? `${parts[0].slice(0, 2)}***` : parts[0];
  }
  const first = parts[0];
  const lastInitial = parts[1][0]?.toUpperCase() || '';
  return `${first} ${lastInitial}.`;
}

function maskCustomerPhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 2) return '**';
  return `******${digits.slice(-2)}`;
}

function maskCustomerAddress(address: string, city: string): string {
  return `Zona urbana en ${city || 'Colombia'}`;
}

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async createOrder(createOrderDto: CreateOrderDto, userId?: string) {
    return this.prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const orderDetails = [];

      for (const item of createOrderDto.items) {
        const product = await tx.producto.findUnique({
          where: { id: item.productoId },
        });

        if (!product || !product.activo) {
          throw new BadRequestException(`Producto no disponible o inactivo: ${item.productoId}`);
        }

        if (product.stock < item.cantidad) {
          throw new BadRequestException(`Stock insuficiente para: ${product.nombre}`);
        }

        // Descontar stock
        await tx.producto.update({
          where: { id: product.id },
          data: { stock: { decrement: item.cantidad } },
        });

        // Calcular subtotal
        subtotal += product.precio * item.cantidad;

        orderDetails.push({
          productoId: product.id,
          cantidad: item.cantidad,
          precio: product.precio,
        });
      }

      // Costo de envío
      const shippingCost = createOrderDto.metodoEnvio === 'Local' ? 8000 : 0;
      const total = subtotal + shippingCost;

      // Generar código de alta entropía con reintentos para garantizar unicidad estricta
      let codigo = '';
      let isUnique = false;
      let retries = 0;

      while (!isUnique && retries < 5) {
        codigo = generateSecureOrderCode();
        const existing = await tx.pedido.findUnique({ where: { codigo } });
        if (!existing) {
          isUnique = true;
        } else {
          retries++;
        }
      }

      if (!isUnique) {
        throw new Error('No fue posible generar un código único de pedido tras múltiples intentos.');
      }

      // Insertar pedido
      const order = await tx.pedido.create({
        data: {
          codigo,
          usuarioId: userId || null,
          nombreCliente: createOrderDto.nombreCliente,
          telefono: createOrderDto.telefono,
          direccion: createOrderDto.direccion,
          ciudad: createOrderDto.ciudad,
          metodoEnvio: createOrderDto.metodoEnvio,
          metodoPago: createOrderDto.metodoPago,
          notas: createOrderDto.notas,
          aceptaHabeasData: createOrderDto.aceptaHabeasData ?? true,
          aceptaHabeasDataAt: new Date(),
          total,
          detalles: {
            create: orderDetails,
          },
        },
        include: {
          detalles: {
            include: { producto: true },
          },
        },
      });

      return order;
    });
  }

  async findAll(estado?: EstadoPedido) {
    const where = estado ? { estado } : {};
    return this.prisma.pedido.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { 
        detalles: { include: { producto: true } }, 
        usuario: true 
      },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.pedido.findUnique({
      where: { id },
      include: {
        detalles: {
          include: { producto: true },
        },
        usuario: true,
      },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  async updateEstado(id: string, estado: EstadoPedido) {
    const order = await this.prisma.pedido.findUnique({
      where: { id },
      include: { detalles: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    // Restituir stock si se cancela el pedido
    if (order.estado !== 'CANCELADO' && estado === 'CANCELADO') {
      return this.prisma.$transaction(async (tx) => {
        for (const item of order.detalles) {
          await tx.producto.update({
            where: { id: item.productoId },
            data: { stock: { increment: item.cantidad } },
          });
        }
        return tx.pedido.update({
          where: { id },
          data: { estado },
          include: { detalles: { include: { producto: true } }, usuario: true },
        });
      });
    }

    // Re-descontar stock si se reactiva un pedido cancelado
    if (order.estado === 'CANCELADO' && estado !== 'CANCELADO') {
      return this.prisma.$transaction(async (tx) => {
        for (const item of order.detalles) {
          await tx.producto.update({
            where: { id: item.productoId },
            data: { stock: { decrement: item.cantidad } },
          });
        }
        return tx.pedido.update({
          where: { id },
          data: { estado },
          include: { detalles: { include: { producto: true } }, usuario: true },
        });
      });
    }

    return this.prisma.pedido.update({
      where: { id },
      data: { estado },
      include: { detalles: { include: { producto: true } }, usuario: true },
    });
  }

  /**
   * Rastreo público seguro (SEC-02):
   * Requiere coincidencia exacta de código Y teléfono.
   * Responde 404 genérico si no coincide o no existe.
   * Retorna un único pedido con PII enmascarada y sin exponer URLs de comprobantes.
   */
  async trackOrder(codigo: string, telefono: string) {
    const cleanCodigo = (codigo || '').trim().replace(/^#/, '').toUpperCase();
    const rawInputPhone = (telefono || '').replace(/\D/g, '');
    const cleanInputPhone = rawInputPhone.slice(-10);

    // Validación previa de formato: ambos parámetros son obligatorios
    if (!cleanCodigo || cleanInputPhone.length < 10) {
      throw new NotFoundException('No encontramos un pedido con esos datos');
    }

    const order = await this.prisma.pedido.findFirst({
      where: {
        codigo: { equals: cleanCodigo, mode: 'insensitive' },
      },
      include: {
        detalles: {
          include: { producto: true },
        },
      },
    });

    const orderPhoneDigits = (order?.telefono || '').replace(/\D/g, '').slice(-10);

    // Coincidencia exacta estricta tanto de código como de teléfono
    if (!order || orderPhoneDigits !== cleanInputPhone) {
      throw new NotFoundException('No encontramos un pedido con esos datos');
    }

    return {
      id: order.id,
      codigo: order.codigo,
      estado: order.estado,
      nombreCliente: maskCustomerName(order.nombreCliente),
      telefono: maskCustomerPhone(order.telefono),
      direccion: maskCustomerAddress(order.direccion, order.ciudad),
      ciudad: order.ciudad,
      metodoEnvio: order.metodoEnvio,
      metodoPago: order.metodoPago,
      total: order.total,
      notas: order.notas ? 'Observaciones registradas para el despacho' : null,
      tieneComprobante: Boolean(order.comprobantePago),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      detalles: order.detalles.map((d) => ({
        id: d.id,
        cantidad: d.cantidad,
        precio: d.precio,
        producto: d.producto
          ? {
              id: d.producto.id,
              nombre: d.producto.nombre,
              slug: d.producto.slug,
              imagen: d.producto.imagen,
            }
          : null,
      })),
    };
  }

  async uploadComprobante(codigo: string, file: Express.Multer.File, telefono?: string) {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo de comprobante');
    }

    const cleanCodigo = (codigo || '').trim().replace(/^#/, '').toUpperCase();
    const order = await this.prisma.pedido.findFirst({
      where: { codigo: { equals: cleanCodigo, mode: 'insensitive' } },
    });

    if (!order) {
      throw new NotFoundException('No encontramos un pedido con esos datos');
    }

    // Si se proporciona teléfono, verificar que coincida con el pedido
    if (telefono) {
      const orderPhoneDigits = order.telefono.replace(/\D/g, '').slice(-10);
      const inputPhoneDigits = telefono.replace(/\D/g, '').slice(-10);
      if (inputPhoneDigits && orderPhoneDigits !== inputPhoneDigits) {
        throw new NotFoundException('No encontramos un pedido con esos datos');
      }
    }

    // Validación estricta de tamaño (5MB) y magic bytes reales (%PDF-, JPG, PNG, WEBP) (SEC-07)
    const { realMime, isPdf } = validateReceiptFile(file);

    const baseUploadDir = process.env.UPLOAD_DIR || 'uploads';
    const comprobantesDir = join(process.cwd(), baseUploadDir, 'comprobantes');
    if (!fs.existsSync(comprobantesDir)) {
      fs.mkdirSync(comprobantesDir, { recursive: true });
    }

    let filename = '';
    if (isPdf) {
      filename = `${uuidv4()}.pdf`;
      const filepath = join(comprobantesDir, filename);
      fs.writeFileSync(filepath, file.buffer);
    } else {
      filename = `${uuidv4()}.webp`;
      const filepath = join(comprobantesDir, filename);
      try {
        await sharpModule(file.buffer)
          .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toFile(filepath);
      } catch (error) {
        throw new BadRequestException('El archivo de imagen no pudo ser procesado o está dañado');
      }
    }

    const comprobanteUrl = `/uploads/comprobantes/${filename}`;

    await this.prisma.pedido.update({
      where: { id: order.id },
      data: { comprobantePago: comprobanteUrl },
    });

    return {
      message: 'Comprobante cargado exitosamente',
      tieneComprobante: true,
    };
  }

  /**
   * Obtiene la ruta física segura y metadatos de un comprobante de pago (SEC-05).
   * Previene Path Traversal usando path.basename y valida existencia física en disco.
   */
  async getComprobanteFile(orderId: string): Promise<{
    filePath: string;
    mimeType: string;
    filename: string;
  }> {
    const order = await this.prisma.pedido.findUnique({
      where: { id: orderId },
      select: { id: true, comprobantePago: true },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (!order.comprobantePago) {
      throw new NotFoundException('El pedido no tiene ningún comprobante de pago adjunto');
    }

    // Mitigación de Path Traversal: extraer únicamente el nombre base del archivo
    const safeFilename = basename(order.comprobantePago);
    const baseUploadDir = process.env.UPLOAD_DIR || 'uploads';
    const filePath = join(process.cwd(), baseUploadDir, 'comprobantes', safeFilename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('El archivo de comprobante no existe físicamente en el servidor');
    }

    const ext = extname(safeFilename).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === '.pdf') {
      mimeType = 'application/pdf';
    } else if (ext === '.webp') {
      mimeType = 'image/webp';
    } else if (ext === '.jpg' || ext === '.jpeg') {
      mimeType = 'image/jpeg';
    } else if (ext === '.png') {
      mimeType = 'image/png';
    }

    return { filePath, mimeType, filename: safeFilename };
  }
}
