import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import slugify from 'slugify';

const prisma = new PrismaClient();

async function main() {
  console.log('--- INICIANDO SEED OFICIAL VICTORIA SPORTS NUTRITION (CATÁLOGO COMPLETO) ---');

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

  // 3. Crear las 5 Categorías Oficiales
  const officialCategories = [
    { nombre: 'Geles Energéticos', slug: 'geles-energeticos' },
    { nombre: 'Hidratación y Electrolitos', slug: 'hidratacion-electrolitos' },
    { nombre: 'Bebidas Energéticas', slug: 'bebidas-energeticas' },
    { nombre: 'Recuperación y Proteínas', slug: 'recuperacion-proteinas' },
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
  console.log(`✓ 5 Categorías oficiales creadas:`, Object.keys(createdCategories).join(', '));

  // 4. Catálogo Oficial Completo (20 Productos: Enervit + SiS)
  const officialProducts = [
    // ==========================================
    // 1. GAMA ENERVIT (C2:1 PRO)
    // ==========================================
    {
      nombre: 'Enervit Magic Cherry (Extracto de Cereza After Sport)',
      slug: 'enervit-magic-cherry',
      categoriaSlug: 'recuperacion-proteinas',
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
    {
      nombre: 'Enervit Carbo Gel C2:1 Pro Mango 60ml (40g Carbs)',
      slug: 'enervit-carbo-gel-c2-1-pro-mango-40g',
      categoriaSlug: 'geles-energeticos',
      precio: 24000,
      precioAntes: 27000,
      stock: 80,
      badges: ['DURING SPORT', '40G CARBS', 'RATIO 2:1', 'SIN GLUTEN'],
      descripcion: 'Gel semi-líquido alto en carbohidratos a base de diferentes maltodextrinas y fructosa en relación 2:1. C2:1 PRO es la fórmula innovadora desarrollada directamente con los equipos World Tour: UAE Team Emirates, Lidl-Trek y la FCI. Fórmula altamente densa en carbohidratos con leve y agradable sabor a mango.',
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

    // ==========================================
    // 2. GAMA SCIENCE IN SPORT (SiS) - RECUPERACIÓN Y PROTEÍNAS
    // ==========================================
    {
      nombre: 'SiS REGO Rapid Recovery 1.6kg (Strawberry / Fresa)',
      slug: 'sis-rego-rapid-recovery-1-6kg',
      categoriaSlug: 'recuperacion-proteinas',
      precio: 280000,
      precioAntes: 310000,
      stock: 25,
      badges: ['RECOVERY', 'VEGANO', '21G PROTEÍNA', '2.5G LEUCINA'],
      descripcion: 'REGO Rapid Recovery es una bebida de recuperación apta para veganos, diseñada para recargar energías, reconstruir los músculos y reducir la fatiga tras el entrenamiento. Su fórmula combina carbohidratos, proteínas de soja, aminoácidos esenciales, vitaminas y minerales para una recuperación más rápida y efectiva.',
      beneficios: [
        '22g de carbohidratos (maltodextrina) para reponer energía y glucógeno muscular',
        '21g de proteína de soja para desarrollar y mantener la masa muscular',
        '2.5g de L-leucina, aminoácido clave para estimular la síntesis de proteínas',
        'Vitaminas C y B6 que ayudan al sistema inmunológico y reducen el cansancio',
        'Apto para veganos e intolerantes a la lactosa',
        'Ideal para entrenamientos de resistencia y alta intensidad'
      ],
      especificaciones: {
        "Presentación": "Bolsa 1.6 kg / 1.5 kg (30 tomas)",
        "Carbohidratos": "22g por porción de 50g",
        "Proteína": "21g por porción",
        "L-Leucina": "2.5 g",
        "Vitaminas": "Vitamina C y Complejo B (B6)",
        "Sabor": "Fresa (Strawberry)",
        "Marca": "SiS (Science in Sport)"
      },
      modoUso: 'Mezcla 50g (2 dosificadores) en 500ml de agua fría. Consumir dentro de los 30 minutos posteriores al ejercicio para una recuperación óptima.',
      imagen: '/products/sis-rego-rapid-recovery-1-6kg.png',
    },
    {
      nombre: 'SiS REGO Rapid Recovery 500g (Strawberry / Fresa)',
      slug: 'sis-rego-rapid-recovery-500g',
      categoriaSlug: 'recuperacion-proteinas',
      precio: 110000,
      precioAntes: 125000,
      stock: 35,
      badges: ['RECOVERY', 'VEGANO', '21G PROTEÍNA', 'FORMATO 500G'],
      descripcion: 'Bolsa de 500g de REGO Rapid Recovery. Bebida de recuperación completa apta para veganos, diseñada para recargar energías, reconstruir los músculos y reducir la fatiga tras el entrenamiento. Fórmula que combina carbohidratos, proteínas de soja, aminoácidos esenciales, vitaminas y minerales.',
      beneficios: [
        'Formato práctico de 500g (10 tomas completas)',
        '22g de carbohidratos (maltodextrina) para recarga de glucógeno',
        '21g de proteína de soja para reparar fibras musculares',
        '2.5g de L-leucina para estimular la síntesis proteica',
        'Vitaminas C y B6 contra la fatiga extrema',
        'Apto para veganos y 100% libre de lactosa'
      ],
      especificaciones: {
        "Presentación": "Bolsa 500g (10 porciones)",
        "Carbohidratos": "22g por porción",
        "Proteína": "21g por porción",
        "L-Leucina": "2.5 g",
        "Sabor": "Fresa (Strawberry)",
        "Marca": "SiS (Science in Sport)"
      },
      modoUso: 'Mezcla 50g (2 dosificadores) en 500ml de agua fría dentro de los 30 minutos posteriores al ejercicio.',
      imagen: '/products/sis-rego-rapid-recovery-500g.jpeg',
    },
    {
      nombre: 'SiS BETA Recovery 1.6kg (Dual Source / Chocolate)',
      slug: 'sis-beta-recovery-1-6kg',
      categoriaSlug: 'recuperacion-proteinas',
      precio: 319900,
      precioAntes: 350000,
      stock: 20,
      badges: ['DUAL SOURCE 1:1', '60G CARBS', '30G WHEY', 'PROBIÓTICO BC30'],
      descripcion: 'BETA Recovery es una bebida de recuperación científicamente formulada con carbohidratos de doble fuente y proteína de suero, ideal para atletas que realizan entrenamientos o competencias de alta intensidad y duración superior a 90 minutos. Ayuda a recargar rápidamente las reservas de glucógeno en músculos e hígado, a la vez que repara y reconstruye el tejido muscular.',
      beneficios: [
        'Aporta 60g de carbohidratos en proporción 1:1 (maltodextrina y fructosa) para reponer energía en hígado y músculo',
        'Contiene 30g de proteína de suero con 3g de leucina por porción para estimular la síntesis de proteínas musculares',
        'Incluye BC30™ (Bacillus coagulans), un probiótico que mejora la digestión, absorción de proteínas y la salud inmunológica',
        'Favorece la recuperación muscular completa y la adaptación al entrenamiento',
        'Probado y certificado por Informed Sport para atletas de alto rendimiento'
      ],
      especificaciones: {
        "Presentación": "Bolsa 1.6 kg / 1.5 kg (15 tomas de 100g)",
        "Carbohidratos": "60g en ratio dual 1:1",
        "Proteína": "30g Proteína de Suero (Whey)",
        "Leucina": "3 g",
        "Probiótico": "BC30™ (Bacillus coagulans)",
        "Sabor": "Chocolate",
        "Uso": "Sesiones extenuantes de más de 90 minutos",
        "Marca": "SiS (Science in Sport)"
      },
      modoUso: 'Disolver 100g (3 medidas) en 500ml de agua fría y agitar bien. Tomar dentro de los primeros 30 minutos tras finalizar la actividad.',
      imagen: '/products/sis-beta-recovery-1-6kg.jpeg',
    },
    {
      nombre: 'SiS REGO Whey Protein 1.6kg (Premium Whey / Fresa)',
      slug: 'sis-rego-whey-protein-1-6kg',
      categoriaSlug: 'recuperacion-proteinas',
      precio: 320000,
      precioAntes: 355000,
      stock: 20,
      badges: ['WHEY PREMIUM', '22G PROTEÍNA', '9 EAA + BCAA', 'LOW SUGAR'],
      descripcion: 'REGO Whey Protein de Science in Sport es una proteína premium diseñada para apoyar la recuperación muscular y el mantenimiento de la masa muscular después de entrenamientos cortos o de alta intensidad. Su fórmula está pensada para deportistas que no requieren una alta carga de carbohidratos, pero sí una proteína de alta calidad para optimizar la recuperación.',
      beneficios: [
        '22g de proteína whey por porción para recuperación muscular',
        'Perfil completo con 9 aminoácidos esenciales + BCAA',
        'Favorece la síntesis de proteína muscular (MPS)',
        'Ideal para sesiones cortas o menos demandantes',
        'Rápida absorción que mejora la recuperación post-entrenamiento',
        'Fácil de preparar y consumir en cualquier momento'
      ],
      especificaciones: {
        "Presentación": "Bolsa 1.6 kg / 1.35 kg (45 tomas)",
        "Proteína": "22g por porción",
        "Aminoácidos": "9 esenciales + BCAA (2.8g Leucina)",
        "Azúcar": "Bajo en azúcar (Low Sugar)",
        "Sabor": "Fresa (Strawberry)",
        "Marca": "SiS (Science in Sport)"
      },
      modoUso: 'Mezclar 30g (1 dosificador) en 300ml de agua o leche descremada después de entrenar o como complemento proteico entre comidas.',
      imagen: '/products/sis-rego-whey-protein-1-6kg.jpeg',
    },

    // ==========================================
    // 3. GAMA SCIENCE IN SPORT (SiS) - HIDRATACIÓN Y GELES
    // ==========================================
    {
      nombre: 'SiS GO Electrolyte Polvo 1.6 Kg (Orange / Naranja)',
      slug: 'sis-go-electrolyte-1-6kg',
      categoriaSlug: 'hidratacion-electrolitos',
      precio: 220000,
      precioAntes: 245000,
      stock: 25,
      badges: ['ISOTÓNICO', '36G CARBS', 'SODIO 20MMOL', 'INFORMED SPORT'],
      descripcion: 'SiS GO Electrolyte es una bebida deportiva en polvo que combina carbohidratos de rápida absorción y electrolitos esenciales, como el sodio, para ayudarte a mantener un rendimiento óptimo durante entrenamientos o competencias de resistencia. Diseñada para reponer la energía, mejorar la hidratación y prevenir los calambres.',
      beneficios: [
        'Aporta 36g de carbohidratos por porción (500ml) para mantener tus niveles de energía',
        'Rico en sodio (20 mmol/L) para una hidratación celular ultra eficiente',
        '146 calorías por porción, ideal para esfuerzos prolongados',
        'Rápida absorción de energía y fluidos sin causar molestias digestivas',
        'Apto para dietas veganas y con certificación Informed Sport'
      ],
      especificaciones: {
        "Presentación": "Tarro 1.6 kg (40 porciones)",
        "Carbohidratos": "36g por porción de 40g",
        "Fuente energética": "Maltodextrina de alta biodisponibilidad",
        "Electrolito principal": "Sodio (20 mmol/L)",
        "Tipo de bebida": "Isotónica",
        "Sabor": "Orange (Naranja)",
        "Marca": "SiS (Science in Sport)"
      },
      modoUso: 'Disolver 40g (aprox. 3 cucharadas) en 500ml - 750ml de agua. Tomar durante el ejercicio a sorbos regulares cada 15-20 minutos.',
      imagen: '/products/sis-go-electrolyte-1-6kg.jpeg',
    },
    {
      nombre: 'SiS GO Electrolyte Polvo 500g (Orange / Naranja)',
      slug: 'sis-go-electrolyte-500g',
      categoriaSlug: 'hidratacion-electrolitos',
      precio: 70000,
      precioAntes: 80000,
      stock: 40,
      badges: ['ISOTÓNICO', '36G CARBS', 'FORMATO 500G', 'INFORMED SPORT'],
      descripcion: 'Presentación de 500g de SiS GO Electrolyte. Bebida deportiva en polvo que combina carbohidratos de rápida asimilación con electrolitos esenciales para evitar la deshidratación y retrasar la fatiga en carreras y salidas de fin de semana.',
      beneficios: [
        'Formato compacto de 500g (aprox. 12-13 bidones)',
        '36g de carbohidratos por toma para sostener el ritmo',
        'Concentración precisa de sodio (20 mmol/L) contra calambres',
        'Excelente tolerancia digestiva incluso a ritmo de competición',
        'Certificación Informed Sport'
      ],
      especificaciones: {
        "Presentación": "Tarro 500g",
        "Carbohidratos": "36g por toma",
        "Electrolito": "Sodio (20 mmol/L)",
        "Sabor": "Naranja (Orange)",
        "Marca": "SiS (Science in Sport)"
      },
      modoUso: 'Disolver 40g en 500ml de agua fría y beber continuamente durante la actividad física.',
      imagen: '/products/sis-go-electrolyte-500g.png',
    },
    {
      nombre: 'SiS Hydro Pastillas Efervescentes (Pineapple & Mango - Tubo x 20 Tabs)',
      slug: 'sis-hydro-pastillas',
      categoriaSlug: 'hidratacion-electrolitos',
      precio: 70000,
      precioAntes: 78000,
      stock: 50,
      badges: ['HIPOTÓNICO', 'ZERO SUGAR', '30MMOL SODIO', '20 TABLETAS'],
      descripcion: 'SiS Hydro es una tableta efervescente que se disuelve fácilmente en agua (500ml) y proporciona una solución rápida y práctica para hidratarse eficazmente durante el ejercicio sin aportar calorías vacías. Diseñada científicamente con electrolitos esenciales que reponen lo perdido por el sudor.',
      beneficios: [
        'Solo 9 calorías por porción (Zero Sugar)',
        'Alto contenido de sodio (30 mmol/L) para evitar la hiponatremia',
        '4 minerales clave: Sodio, potasio, magnesio y calcio',
        'Previene calambres y deshidratación sin alterar planes calóricos',
        'Apto para veganos, libre de gluten y certificado por Informed Sport'
      ],
      especificaciones: {
        "Formato": "Tubo portátil x 20 tabletas",
        "Calorías": "0 kcal / 9 kcal por tableta",
        "Electrolitos": "Sodio (30 mmol/L), Potasio, Magnesio, Calcio",
        "Sabor": "Pineapple & Mango (Piña y Mango)",
        "Tipo de bebida": "Hipotónica",
        "Marca": "SiS (Science in Sport)"
      },
      modoUso: 'Disolver 1 tableta en 500ml de agua. Tomar 500ml 3-4 horas antes del ejercicio y beber a sorbos regulares durante la sesión.',
      imagen: '/products/sis-hydro-pastillas.jpeg',
    },
    {
      nombre: 'SiS Hydro + Caffeine Pastillas Efervescentes (Cola - Tubo x 20 Tabs)',
      slug: 'sis-hydro-caffeine',
      categoriaSlug: 'hidratacion-electrolitos',
      precio: 70000,
      precioAntes: 78000,
      stock: 50,
      badges: ['75MG CAFEÍNA', 'ZERO SUGAR', '4 ELECTROLITOS', '20 TABLETAS'],
      descripcion: 'SiS Hydro + Caffeine – Cola es una bebida de hidratación en tabletas efervescentes desarrollada para aportar electrolitos clave durante el ejercicio y, al mismo tiempo, proporcionar un estímulo de 75mg de cafeína por tableta para elevar el estado de alerta y reducir la percepción del esfuerzo.',
      beneficios: [
        '75mg de cafeína por tableta para agudeza mental y energía',
        '4 electrolitos principales: Sodio, calcio, magnesio y potasio (789mg totales)',
        'Enriquecido con vitaminas del complejo B (B1, B2 y B6)',
        'Fácil transporte y disolución instantánea en bidón',
        'Libre de azúcar (aprox. 9 kcal) y apto para veganos'
      ],
      especificaciones: {
        "Presentación": "Tubo x 20 tabletas efervescentes",
        "Cafeína": "75 mg por tableta",
        "Electrolitos": "Sodio, calcio, magnesio y potasio",
        "Vitaminas": "B1, B2 y B6",
        "Sabor": "Cola",
        "Marca": "SiS (Science in Sport)"
      },
      modoUso: 'Disolver 1 tableta en 500ml de agua fría. Ideal para tomar antes o durante entrenamientos y etapas donde se requiera máximo enfoque.',
      imagen: '/products/sis-hydro-caffeine.jpeg',
    },
    {
      nombre: 'SiS Hydro+ Electrolyte Drink Mix Sobres (Pack x 6)',
      slug: 'sis-hydro-sobres-pack6',
      categoriaSlug: 'hidratacion-electrolitos',
      precio: 42000,
      precioAntes: 46000,
      stock: 40,
      badges: ['0 KCAL', '5 ELECTROLITOS', 'VITAMINAS C Y B', 'PACK X 6'],
      descripcion: 'Mezcla de electrolitos de hidratación avanzada en sobres individuales desarrollada por Science in Sport. Su fórmula aporta cinco electrolitos esenciales (sodio, potasio, cloruro, calcio y magnesio) junto con vitaminas C, B6 y B12 para evitar el cansancio y sostener una hidratación celular óptima.',
      beneficios: [
        '5 electrolitos esenciales: 350mg sodio, 300mg potasio, 750mg cloruro, 120mg calcio, 56mg magnesio',
        '0 carbohidratos, 0 azúcares y 0 calorías',
        'Enriquecido con Vitamina C (80mg), B6 y B12',
        'Formato en sobre ultraligero para llevar en maillot o mochila',
        'Sabor refrescante Berry / Naranja-Mango de disolución rápida'
      ],
      especificaciones: {
        "Presentación": "Caja/Pack de 6 sobres ($7.000 c/u)",
        "Sodio": "350 mg por porción",
        "Potasio": "300 mg",
        "Cloruro": "750 mg",
        "Calorías": "0 kcal",
        "Vitaminas": "C, B6, B12",
        "Marca": "SiS (Science in Sport)"
      },
      modoUso: 'Disolver el contenido de 1 sobre en 500ml de agua fresca durante el entrenamiento o en el día a día para rehidratarse.',
      imagen: '/products/sis-hydro-sobres-pack6.jpeg',
    },
    {
      nombre: 'SiS GO Isotonic Energy Gel 60ml (Naranja)',
      slug: 'sis-gel-go-isotonic',
      categoriaSlug: 'geles-energeticos',
      precio: 12000,
      precioAntes: 14000,
      stock: 120,
      badges: ['ISOTÓNICO', '22G CARBS', 'NO NECESITA AGUA', 'FAST ENERGY'],
      descripcion: 'El primer gel energético isotónico del mundo. Diseñado para ofrecer un impulso inmediato de energía sin necesidad de agua, reduciendo el riesgo de calambres estomacales. Su fórmula aporta 22g de carbohidratos de rápida absorción en un envase práctico y fácil de abrir sobre la marcha.',
      beneficios: [
        '22g de carbohidratos de asimilación ultrarrápida',
        'Verdaderamente isotónico: no requiere tomar agua adicional',
        'Digestión liviana y textura fluida que no empalaga',
        'Compatible con todo tipo de deportes de resistencia (running, ciclismo, triatlón)',
        'Certificación Informed Sport'
      ],
      especificaciones: {
        "Contenido": "Sobre individual de 60 ml",
        "Carbohidratos": "22g por gel",
        "Tecnología": "Fórmula Isotónica limpia",
        "Necesita agua": "No",
        "Sabor": "Orange (Naranja)",
        "Marca": "SiS (Science in Sport)"
      },
      modoUso: 'Consumir 1 a 3 geles por hora durante el ejercicio para alcanzar el aporte recomendado de 60g de carbohidratos.',
      imagen: '/products/sis-gel-go-isotonic.jpeg',
    },
    {
      nombre: 'SiS GO Energy + Electrolyte Gel 60ml (Caramelo Salado / Limón)',
      slug: 'sis-gel-go-electrolyte',
      categoriaSlug: 'geles-energeticos',
      precio: 15000,
      precioAntes: 17000,
      stock: 100,
      badges: ['ELECTROLITOS', '22G CARBS', 'ANTI-CALAMBRES', '0.3G SAL'],
      descripcion: 'Combina 22g de carbohidratos de fácil absorción con electrolitos clave (sodio, potasio y magnesio) para reponer lo que se pierde a través del sudor en entrenamientos intensos o en días de calor, favoreciendo la hidratación y el equilibrio hídrico.',
      beneficios: [
        '22g de carbohidratos para energía sostenida',
        'Electrolitos clave: 0.3g de sal, potasio y magnesio contra calambres',
        'Fórmula isotónica de digestión rápida y efectiva',
        'Ideal para sesiones largas, calor extremo o alta tasa de sudoración',
        'Certificado Informed Sport'
      ],
      especificaciones: {
        "Contenido": "Sobre individual de 60 ml",
        "Carbohidratos": "22g por gel",
        "Sal": "0.3 g",
        "Calorías": "87 kcal",
        "Sabor": "Salted Caramel / Lemon Mint",
        "Marca": "SiS (Science in Sport)"
      },
      modoUso: 'Consumir 1 gel de electrolitos por hora alternando con geles isotónicos estándar en sesiones largas.',
      imagen: '/products/sis-gel-go-electrolyte.jpeg',
    },
    {
      nombre: 'SiS Beta Fuel Gel + Nootropics 60ml (Apple / Manzana)',
      slug: 'sis-gel-beta-fuel-nootropics',
      categoriaSlug: 'geles-energeticos',
      precio: 20000,
      precioAntes: 23000,
      stock: 90,
      badges: ['40G CARBS', 'NOOTROPICS', '200MG CITICOLINA', 'DUAL SOURCE 1:0.8'],
      descripcion: 'El gel energético más avanzado para resistencia extrema. Combina una masiva carga de 40g de carbohidratos en relación óptima Dual Source 1:0.8 (maltodextrina a fructosa) con 200mg de Cognizin® Citicolina para potenciar simultáneamente la potencia muscular y el enfoque cognitivo cuando la fatiga es extrema.',
      beneficios: [
        '40g de carbohidratos en relación 1:0.8 para asimilar hasta 120g/hora',
        '200mg de Cognizin® Citicolina para concentración y toma de decisiones rápida',
        'Reduce la fatiga central y la percepción del esfuerzo',
        'Textura ligera y digestibilidad probada en el World Tour',
        'Certificación Informed Sport'
      ],
      especificaciones: {
        "Contenido": "Sobre individual de 60 ml",
        "Carbohidratos": "40g (Dual Source 1:0.8)",
        "Nootrópico": "200 mg Cognizin® Citicolina",
        "Sabor": "Apple / Lemon & Lime",
        "Uso": "Etapas decisivas, maratón y triatlón de larga distancia",
        "Marca": "SiS (Science in Sport)"
      },
      modoUso: 'Consumir máximo 1 gel al día, preferiblemente en el último tercio de la prueba o cuando la fatiga mental y física sea crítica.',
      imagen: '/products/sis-gel-beta-fuel-nootropics.jpeg',
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

  console.log(`✓ ${officialProducts.length} Productos oficiales insertados con éxito.`);
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
