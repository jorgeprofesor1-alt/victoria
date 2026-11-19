import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function migrateLegacyReceipts() {
  console.log('--- INICIANDO MIGRACIÓN DE COMPROBANTES LEGACY (SEC-05) ---');
  const baseUploadDir = process.env.UPLOAD_DIR || 'uploads';
  const rootUploadsDir = path.join(process.cwd(), baseUploadDir);
  const comprobantesDir = path.join(rootUploadsDir, 'comprobantes');

  if (!fs.existsSync(comprobantesDir)) {
    fs.mkdirSync(comprobantesDir, { recursive: true });
    console.log(`[+] Creado directorio privado: ${comprobantesDir}`);
  }

  // 1. Mover archivos huérfanos de la raíz de uploads a uploads/comprobantes
  let filesMoved = 0;
  if (fs.existsSync(rootUploadsDir)) {
    const rootEntries = fs.readdirSync(rootUploadsDir, { withFileTypes: true });
    for (const entry of rootEntries) {
      if (entry.isFile() && entry.name !== '.gitkeep') {
        const sourcePath = path.join(rootUploadsDir, entry.name);
        const destPath = path.join(comprobantesDir, entry.name);
        fs.renameSync(sourcePath, destPath);
        console.log(`[->] Archivo movido a carpeta privada: ${entry.name}`);
        filesMoved++;
      }
    }
  }

  // 2. Normalizar rutas en la base de datos
  const orders = await prisma.pedido.findMany({
    where: {
      comprobantePago: {
        not: null,
      },
    },
    select: {
      id: true,
      codigo: true,
      comprobantePago: true,
    },
  });

  let ordersUpdated = 0;
  for (const order of orders) {
    if (!order.comprobantePago) continue;
    const filename = path.basename(order.comprobantePago);
    const normalizedUrl = `/uploads/comprobantes/${filename}`;

    if (order.comprobantePago !== normalizedUrl) {
      await prisma.pedido.update({
        where: { id: order.id },
        data: { comprobantePago: normalizedUrl },
      });
      console.log(`[OK] Pedido #${order.codigo} normalizado a: ${normalizedUrl}`);
      ordersUpdated++;
    }
  }

  console.log('--- MIGRACIÓN FINALIZADA ---');
  console.log(`Archivos físicos reubicados: ${filesMoved}`);
  console.log(`Registros de base de datos actualizados: ${ordersUpdated}`);
}

migrateLegacyReceipts()
  .catch((e) => {
    console.error('Error durante la migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
