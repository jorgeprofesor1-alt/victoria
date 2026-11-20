import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import slugify from 'slugify';

const prisma = new PrismaClient();

async function main() {
  console.log('--- INICIANDO SEED OFICIAL ENERVIT (VICTORIA SPORTS NUTRITION) ---');

  // 1. Limpieza de pedidos y productos de prueba anteriores
  await prisma.detallePedido.deleteMany({});
  await prisma.pedido.deleteMany({});
  await prisma.producto.deleteMany({});
  await prisma.categoria.deleteMany({});
  console.log('✓ Tablas anteriores limpiadas correctamente.');

  // 2. Crear usuario Administrador solo si no existe
  const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL || 'jorge.profesor@hotmail.com';
  const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;

  const existingAdmin = await prisma.usuario.findFirst({
    where: { rol: 'ADMIN' },
  });

  if (existingAdmin) {
    console.log(`✓ Administrador ya existente detectado (${existingAdmin.email}). No se sobreescribe su contraseña.`);
  } else {
    if (!initialAdminPassword || initialAdminPassword.trim().length < 14) {
      console.log('Aviso: INITIAL_ADMIN_PASSWORD no definida o corta. Creando admin por defecto si es necesario.');
    }
    const defaultPassword = initialAdminPassword?.trim() || 'VictoriaAdmin2026!Pasto#Secure';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);
    const newAdmin = await prisma.usuario.create({
      data: {
        email: initialAdminEmail.trim().toLowerCase(),
        password: hashedPassword,
        nombre: 'Prof. Jorge Eliécer Eraso',
        rol: 'ADMIN',
      },
    });
    console.log(`✓ Administrador inicial creado exitosamente: ${newAdmin.email}`);
  }

  // 3. Crear las 4 Categorías Oficiales
  const officialCategories = [
    { nombre: 'Geles Energéticos', slug: 'geles-energeticos' },
    { nombre: 'Hidratación y Electrolitos', slug: 'hidratacion-electrolitos' },
    { nombre: 'Bebidas Energéticas', slug: 'bebidas-energeticas' },
    { nombre: 'Packs y Rendimiento', slug: 'packs-rendimiento' },
  ];

  const createdCategories: Record<string, any> = {};

  for (const cat of officialCategories) {
    const createdCat = await prisma.categoria.create({
      data: {
        nombre: cat.nombre,
        slug: cat.slug,
      },
    });
    createdCategories[cat.slug] = createdCat;
  }
  console.log(`✓ 4 Categorías oficiales creadas:`, Object.keys(createdCategories).join(', '));

  // 4. Catálogo Oficial Enervit C2:1 Pro (UAE Team, Lidl-Trek, FCI)
  const officialProducts = [
    // 1. MAGIC CHERRY
    {
      nombre: 'Enervit Magic Cherry (Extracto de Cereza After Sport)',
      slug: 'enervit-magic-cherry',
      categoriaSlug: 'bebidas-energeticas',
      precio: 27500,
      precioAntes: 31000,
      stock: 50,
      badges: ['AFTER SPORT', 'CHERRY EXTRACT', 'SUGAR FREE', 'RECUPERACIÓN'],
      descripcion: 'Extracto concentrado de cereza negra ácida. "La bebida morada que toman los profesionales al terminar la etapa". Diseñada para combatir la inflamación y el cansancio post ejercicio, promueve la recuperación muscular eliminando radicales libres. Complemento alimenticio para después de la actividad a base de extracto CherryCraft® - sin azúcares ni edulcorantes.',
      beneficios: [
        '300mg de polifenoles por porción (antinflamatorio natural)',
        '50mg de antocianinas protectoras contra el estrés oxidativo',
        'Acelera la recuperación muscular y combate la fatiga muscular profunda',
        'Sin azúcares añadidos ni edulcorantes artificiales',
        'Fórmula After Sport utilizada por ciclistas del World Tour',
      ],
      especificaciones: {
        "Contenido": "1 Sobre (1 serving)",
        "Polifenoles": "300 mg",
        "Antocianinas": "50 mg",
        "Calorías": "Bajas calorías / Sugar Free",
        "Uso": "Inmediatamente al terminar el ejercicio",
        "Marca": "Enervit"
      },
      modoUso: 'Disolver el contenido de 1 sobre en un vaso de agua fresca inmediatamente después de terminar entrenamientos de fondo o competencias.',
      imagen: '/products/enervit-magic-cherry.png',
    },

    // 2. CARBO GEL 40GR CARBOS (MANGO)
    {
      nombre: 'Enervit Carbo Gel C2:1 Pro Mango 60ml (40g Carbs)',
      slug: 'enervit-carbo-gel-c2-1-pro-mango-40g',
      categoriaSlug: 'geles-energeticos',
      precio: 24000,
      precioAntes: 27000,
      stock: 80,
      badges: ['DURING SPORT', '40G CARBS', 'RATIO 2:1', 'SIN GLUTEN'],
      descripcion: 'Gel semi-líquido alto en carbohidratos a base de diferentes maltodextrinas y fructosa en relación 2:1. C2:1 PRO es la fórmula innovadora desarrollada directamente con los equipos World Tour: UAE Team Emirates, Lidl-Trek y la FCI. Fórmula altamente densa en carbohidratos (patente pendiente) con leve y agradable sabor a mango.',
      beneficios: [
        '40g de carbohidratos densos por gel',
        'Relación Glucosa-Fructosa 2:1 para máxima velocidad de absorción',
        'Fórmula C2:1 PRO desarrollada junto a ciclistas profesionales',
        'Consistencia semi-líquida fácil de tragar a pulso alto',
        '0% Grasas y 100% Libre de Gluten',
      ],
      especificaciones: {
        "Contenido": "60 ml",
        "Carbohidratos": "40g por gel",
        "Relación": "2:1 Glucosa a Fructosa",
        "Sabor": "Leve sabor a Mango",
        "Grasas": "0 g",
        "Gluten": "Libre de gluten",
        "Marca": "Enervit"
      },
      modoUso: 'Tomar 1 o 2 geles por hora durante la actividad deportiva de resistencia según el requerimiento de carbohidratos.',
      imagen: '/products/enervit-carbo-gel-mango.png',
    },

    // 3. CARBO GEL CAFEINA (COLA)
    {
      nombre: 'Enervit Carbo Gel C2:1 Pro Cola + 100mg Cafeína (40g Carbs)',
      slug: 'enervit-carbo-gel-c2-1-pro-cafeina-cola',
      categoriaSlug: 'geles-energeticos',
      precio: 25800,
      precioAntes: 29000,
      stock: 80,
      badges: ['DURING SPORT', '100MG CAFEÍNA', '40G CARBS', 'RATIO 2:1'],
      descripcion: 'Gel semi-líquido de alta densidad a base de maltodextrinas y fructosa en relación 2:1 potenciado con 100mg de Cafeína pura. Desarrollado con UAE Team Emirates y Lidl-Trek para los momentos críticos de carrera donde se necesita una recarga energética máxima y un estímulo mental inmediato.',
      beneficios: [
        '40g de carbohidratos con ratio óptimo 2:1',
        '100mg de Cafeína para activar el enfoque y retrasar la fatiga mental',
        'Fuente de Vitamina B1 para el metabolismo energético',
        'Sabor Cola suave no invasivo',
        'Sin grasas y libre de gluten',
      ],
      especificaciones: {
        "Contenido": "60 ml",
        "Carbohidratos": "40g por gel",
        "Cafeína": "100 mg",
        "Sabor": "Cola",
        "Vitamina B1": "Enriquecido con Vitamina B1",
        "Marca": "Enervit"
      },
      modoUso: 'Consumir en la fase final de la prueba, antes de un ascenso exigente o cuando aparezcan signos de fatiga física y mental.',
      imagen: '/products/enervit-carbo-gel-cafeina-cola.png',
    },

    // 4. PRE SPORT JELLY (NARANJA)
    {
      nombre: 'Enervit Pre Sport Jelly Naranja (Gelatina Pre-Entreno)',
      slug: 'enervit-pre-sport-jelly-naranja',
      categoriaSlug: 'packs-rendimiento',
      precio: 20500,
      precioAntes: 23000,
      stock: 60,
      badges: ['BEFORE SPORT', 'ISOMALTULOSA', 'BAJO ÍNDICE GLICÉMICO', 'SIN GRASAS'],
      descripcion: 'Alimento que reemplaza o acompaña el desayuno previo al ejercicio. Su bajo índice glicémico permite ser consumido en ayunas sin generar choque glicémico ni caídas reactivas de azúcar. Pre Sport es una gelatina a base de carbohidratos lentos (Isomaltulosa) diseñada para cargar los depósitos de energía antes de arrancar.',
      beneficios: [
        'Carbohidratos de absorción gradual (Isomaltulosa)',
        'Evita picos bruscos de insulina y pájaras tempranas',
        'Cero grasas, digestión ultraliviana para no sobrecargar el estómago',
        'Puede tomarse en ayunas con total seguridad digestiva',
        'Libre de gluten con sabor natural a naranja',
      ],
      especificaciones: {
        "Uso": "Pre-actividad (30 min a 2 horas antes)",
        "Carbohidratos": "Isomaltulosa de liberación prolongada",
        "Grasas": "0 g",
        "Sabor": "Naranja natural",
        "Vitamina B1": "Aporte de Vitamina B1",
        "Marca": "Enervit"
      },
      modoUso: 'Consumir 1 gelatina Pre Sport entre 30 minutos y 2 horas antes de iniciar el entrenamiento o la prueba.',
      imagen: '/products/enervit-pre-sport-jelly-orange.png',
    },

    // 5. BARRAS PERFORMANCE COCOA 2X1
    {
      nombre: 'Enervit Barras Performance Cocoa 2x1 (Cacao + Avellana)',
      slug: 'enervit-barras-performance-cocoa-2x1',
      categoriaSlug: 'packs-rendimiento',
      precio: 24000,
      precioAntes: 28000,
      stock: 45,
      badges: ['PROMO 2X1', '16G CARBS', '20% PROTEÍNA', 'FONDO LARGO'],
      descripcion: 'Combate el desgaste muscular experimentado durante el ejercicio mediante un aporte balanceado de carbohidratos, proteínas, potasio y magnesio. Nutrientes esenciales para sostener el rendimiento en fondos muy largos. Presentación especial doble con 12g de proteína, baja en grasa y rica en Vitamina C.',
      beneficios: [
        'Pack de 2 barras individuales de 30g',
        '16g de carbohidratos + 20% de proteína para protección muscular',
        'Aporte de Magnesio y Potasio contra calambres en largas jornadas',
        'Baja en grasa (< 5%) y enriquecida con Vitamina C',
        'Delicioso sabor a Cacao y Avellana',
      ],
      especificaciones: {
        "Contenido": "2 x 30g (60g total)",
        "Carbohidratos": "16g por barra",
        "Proteína": "20% (12g por porción)",
        "Minerales": "Potasio y Magnesio",
        "Grasas": "< 5%",
        "Sabor": "Cacao + Avellana",
        "Marca": "Enervit"
      },
      modoUso: 'Consumir 1 porción cada hora en entrenamientos de fondo de más de 2 horas y media alternando con líquidos.',
      imagen: '/products/enervit-barras-performance-cocoa.png',
    },

    // 6. CARBO GEL SODIUM (LIMÓN)
    {
      nombre: 'Enervit Carbo Gel C2:1 Pro Limón + 200mg Sodio (40g Carbs)',
      slug: 'enervit-carbo-gel-c2-1-pro-sodium-limon',
      categoriaSlug: 'geles-energeticos',
      precio: 25800,
      precioAntes: 29000,
      stock: 80,
      badges: ['DURING SPORT', '200MG SODIO', '40G CARBS', 'ANTI-CALAMBRES'],
      descripcion: 'Gel semi-líquido alto en carbohidratos a base de maltodextrinas y fructosa en ratio 2:1 con un aporte estratégico de 200mg de Sodio. Fórmula innovadora C2:1 PRO desarrollada junto a UAE Team y Lidl-Trek para etapas calurosas o ciclistas con alta tasa de sudoración.',
      beneficios: [
        '40g de carbohidratos densos por gel',
        '200mg de Sodio para prevenir la hiponatremia y los calambres',
        'Relación 2:1 Glucosa a Fructosa patentada',
        'Sabor suave a limón que no empalaga bajo el calor',
        'Sin grasas y libre de gluten',
      ],
      especificaciones: {
        "Contenido": "60 ml",
        "Carbohidratos": "40g por gel",
        "Sodio": "200 mg",
        "Sabor": "Leve sabor a Limón",
        "Grasas": "0 g",
        "Marca": "Enervit"
      },
      modoUso: 'Tomar 1 gel cada 40-50 minutos en jornadas de alta temperatura o cuando el sudor sea intenso para reponer sales y energía a la vez.',
      imagen: '/products/enervit-carbo-gel-sodium-lemon.png',
    },

    // 7. ISOTONIC DRINK TARRO
    {
      nombre: 'Enervit Isotonic Drink Tarro (Bebida Hidratante Naranja)',
      slug: 'enervit-isotonic-drink-tarro-naranja',
      categoriaSlug: 'hidratacion-electrolitos',
      precio: 98400,
      precioAntes: 110000,
      stock: 35,
      badges: ['REHYDRATION', 'DURING SPORT', 'ELECTROLITOS', 'SALES MINERALES'],
      descripcion: 'Bebida hidratante en polvo a base de electrolitos, sales minerales y carbohidratos. Desarrollada con el objetivo de reponer rápidamente las sales minerales gastadas durante el ejercicio y mantener el nivel adecuado de electrolitos en sangre, reduciendo el cansancio y la fatiga.',
      beneficios: [
        '25g de carbohidratos por toma para facilitar la rehidratación celular',
        'Equilibrio óptimo de sodio, potasio, magnesio y cloro',
        'Sin colorantes ni edulcorantes artificiales',
        'Sabor natural a naranja de alta digestibilidad',
        'Mantiene el rendimiento y previene descompensaciones hídricas',
      ],
      especificaciones: {
        "Presentación": "Tarro en polvo",
        "Carbohidratos": "25g por toma",
        "Fórmula": "Carbohidratos + Electrolitos esenciales",
        "Sabor": "Naranja natural",
        "Edulcorantes": "Sin edulcorantes ni colorantes artificiales",
        "Marca": "Enervit"
      },
      modoUso: 'Disolver 2 medidas rasas (aprox. 30g) en un bidón de 500ml de agua fresca. Beber de 100 a 150ml cada 15-20 minutos durante el ejercicio.',
      imagen: '/products/enervit-isotonic-drink-tarro.png',
    },

    // 8. ISOCARB TARRO
    {
      nombre: 'Enervit Isocarb C2:1 Pro Tarro (Bebida Alta Densidad Limón)',
      slug: 'enervit-isocarb-c2-1-pro-tarro-limon',
      categoriaSlug: 'bebidas-energeticas',
      precio: 152500,
      precioAntes: 170000,
      stock: 30,
      badges: ['WORLD TOUR PRO', 'HASTA 90G/H CH', 'MALTODEXTRINA DE1', 'RATIO 2:1'],
      descripcion: 'Bebida de vanguardia desarrollada durante el Giro de Italia y Tour de Francia en colaboración directa con los equipos World Tour: UAE Team Emirates y Trek-Segafredo. ISOCARB es una bebida que permite maximizar la ingesta de carbohidratos en el cuerpo hasta llegar a 90g por hora sin molestias estomacales, gracias a su fórmula isotónica con Maltodextrina DE1 Agenanova® y fructosa en ratio 2:1.',
      beneficios: [
        'Permite asimilar hasta 90g de carbohidratos por hora',
        '60g de carbohidratos de asimilación continua por porción',
        'Maltodextrina de última generación DE1 Agenanova®',
        'Fórmula isotónica que vacía rápidamente el estómago',
        'Sabor suave a limón especialmente formulado para no cansar el paladar',
      ],
      especificaciones: {
        "Presentación": "Tarro en polvo",
        "Carbohidratos": "60g por porción (hasta 90g/h asimilables)",
        "Ratio": "2:1 Maltodextrina a Fructosa",
        "Maltodextrina": "DE1 Agenanova® de ultra baja osmolaridad",
        "Sabor": "Mild Lemon (Leve limón)",
        "Uso": "Etapas exigentes World Tour, Gran Fondos y Maratones",
        "Marca": "Enervit"
      },
      modoUso: 'Disolver entre 2 y 3 medidas dosificadoras en 500ml de agua según el plan nutricional del atleta para conseguir entre 60g y 90g de carbohidratos por hora.',
      imagen: '/products/enervit-isocarb-c2-1-pro-tarro.png',
    },
  ];

  for (const prod of officialProducts) {
    const cat = createdCategories[prod.categoriaSlug];
    if (!cat) continue;

    await prisma.producto.create({
      data: {
        nombre: prod.nombre,
        slug: prod.slug,
        descripcion: prod.descripcion,
        precio: prod.precio,
        precioAntes: prod.precioAntes,
        stock: prod.stock,
        imagen: prod.imagen,
        badges: prod.badges,
        beneficios: prod.beneficios,
        especificaciones: prod.especificaciones,
        modoUso: prod.modoUso,
        activo: true,
        categoriaId: cat.id,
      },
    });
    console.log(`  + Producto registrado: [${cat.nombre}] ${prod.nombre}`);
  }

  console.log(`✓ ${officialProducts.length} Productos oficiales Enervit insertados con éxito.`);
  console.log('--- SEED COMPLETADO SATISFACTORIAMENTE ---');
}

main()
  .catch((e) => {
    console.error('Error durante la ejecución del seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
