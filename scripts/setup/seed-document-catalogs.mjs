import "dotenv/config";

import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaMssql(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

const processGroups = [
  {
    code: "PE",
    name: "Procesos estrategicos",
    processes: [
      { code: "PE01", name: "Planeacion Estrategica" },
      { code: "PE02", name: "Gestion de la Direccion General" },
      { code: "PE03", name: "Gobierno Corporativo y Cumplimiento" },
      { code: "PE04", name: "Gestion de Indicadores y Desempeno" },
      { code: "PE05", name: "Inteligencia de Negocios y Analitica" },
    ],
  },
  {
    code: "PC",
    name: "Procesos clave",
    processes: [
      { code: "PC01", name: "Administracion de Categorias" },
      { code: "PC02", name: "Compras, Sourcing y Alianzas Estrategicas" },
      { code: "PC03", name: "Investigacion y Desarrollo de Nuevos Productos" },
      { code: "PC04", name: "Manufactura de Productos" },
      { code: "PC05", name: "Centros de Distribucion y Logistica" },
      { code: "PC06", name: "Operacion de Salas de Ventas" },
      { code: "PC07", name: "E-Commerce y Canales Digitales" },
      { code: "PC08", name: "Atencion y Experiencia del Cliente" },
      { code: "PC09", name: "Gestion de Devoluciones y Servicio Postventa" },
    ],
  },
  {
    code: "PS",
    name: "Procesos de soporte",
    processes: [
      { code: "PS01", name: "Gestion del talento humano" },
      { code: "PS02", name: "Gestion financiera y contable" },
      { code: "PS03", name: "Gestion de Tecnologia y Sistemas de Informacion" },
      { code: "PS04", name: "Mantenimiento e Infraestructura" },
      { code: "PS05", name: "Mercadeo, marca y comunicacion" },
      { code: "PS06", name: "Seguridad Operativa y Patrimonial" },
      { code: "PS07", name: "Control de Calidad Operativa" },
      { code: "PS08", name: "Gestion de Acreedores y Contratacion" },
    ],
  },
  {
    code: "PM",
    name: "Procesos de evaluacion y mejora",
    processes: [
      { code: "PM01", name: "Auditoria y Control Interno" },
      { code: "PM02", name: "Gestion de Indicadores y KPI de Proceso" },
      { code: "PM03", name: "Mejora Continua y Transformacion Operacional" },
      { code: "PM04", name: "Gestion de Riesgos Integrales" },
      { code: "PM05", name: "Satisfaccion del Cliente" },
    ],
  },
];

const documentTypes = [
  { code: "POL", name: "Politica", category: "principal" },
  { code: "PRO", name: "Procedimiento", category: "principal" },
  { code: "NOR", name: "Norma", category: "principal" },
  { code: "LIN", name: "Lineamiento", category: "principal" },
  { code: "INS", name: "Instructivo", category: "principal" },
  { code: "GUI", name: "Guia", category: "principal" },
  { code: "FOR", name: "Formato / Formulario", category: "principal" },
  { code: "PLA", name: "Plan", category: "principal" },
  { code: "INF", name: "Reporte / Informe", category: "principal" },
  { code: "REG", name: "Registro", category: "principal" },
  { code: "MAN", name: "Manual", category: "principal" },
  { code: "MIN", name: "Minuta", category: "secundario" },
  { code: "ATC", name: "Analisis Tecnico", category: "secundario" },
  { code: "PRY", name: "Proyecto", category: "secundario" },
  { code: "ACT", name: "Acta", category: "secundario" },
  { code: "EVA", name: "Evaluacion", category: "secundario" },
  { code: "MEM", name: "Memorando", category: "secundario" },
  { code: "SOL", name: "Solicitud", category: "secundario" },
  { code: "ESD", name: "Esquemas Documentales", category: "secundario" },
  { code: "IND", name: "Indicaciones", category: "secundario" },
  { code: "PRG", name: "Programa", category: "secundario" },
];

const areas = [
  {
    code: "DIR",
    name: "Direccion / Gerencia General",
    description: "Estrategia, actas, decisiones ejecutivas y lineamientos corporativos.",
  },
  {
    code: "COM",
    name: "Comercial / Ventas",
    description: "Ventas, metas comerciales, promociones, precios y desempeno comercial.",
  },
  {
    code: "OPE",
    name: "Operaciones Retail",
    description: "Operacion de tiendas, apertura, cierre, procedimientos operativos y ejecucion en piso de venta.",
  },
  {
    code: "ABA",
    name: "Abastecimiento / Compras",
    description: "Compras, proveedores, ordenes de compra, negociaciones y abastecimiento.",
  },
  {
    code: "LOG",
    name: "Logistica / Distribucion",
    description: "Almacenes, transporte, distribucion, entregas y recepcion de mercancia.",
  },
  {
    code: "INV",
    name: "Inventarios",
    description: "Conteos, ajustes, diferencias, existencias, stock y control de inventario.",
  },
  {
    code: "FIN",
    name: "Finanzas / Contabilidad",
    description: "Pagos, facturas, presupuestos, cierres contables y reportes financieros.",
  },
  {
    code: "RRHH",
    name: "Recursos Humanos",
    description: "Personal, contratos laborales, vacaciones, capacitaciones y expedientes de colaboradores.",
  },
  {
    code: "MKT",
    name: "Marketing",
    description: "Campanas, artes, comunicacion comercial, lanzamientos y material publicitario.",
  },
  {
    code: "TI",
    name: "Tecnologia / Sistemas",
    description: "Soporte tecnico, accesos, sistemas, infraestructura tecnologica y cambios de software.",
  },
  {
    code: "LEG",
    name: "Legal / Cumplimiento",
    description: "Contratos, normativas, politicas, cumplimiento legal y documentacion regulatoria.",
  },
  {
    code: "CAL",
    name: "Calidad / Auditoria Interna",
    description: "Auditorias, controles internos, hallazgos, planes de accion y revisiones.",
  },
  {
    code: "SAC",
    name: "Servicio al Cliente",
    description: "Reclamos, garantias, devoluciones, atencion al cliente y casos de servicio.",
  },
  {
    code: "MAN",
    name: "Mantenimiento / Infraestructura",
    description: "Locales, equipos, reparaciones, remodelaciones e infraestructura fisica.",
  },
  {
    code: "SEG",
    name: "Seguridad / Prevencion de Perdidas",
    description: "Incidentes, CCTV, controles de seguridad, prevencion de perdidas y reportes de riesgo.",
  },
  {
    code: "ADM",
    name: "Administracion General",
    description: "Documentos administrativos transversales que no correspondan claramente a otra area.",
  },
];

async function main() {
  let processCount = 0;

  for (const [groupIndex, processGroup] of processGroups.entries()) {
    const record = await prisma.processGroup.upsert({
      where: { code: processGroup.code },
      update: {
        name: processGroup.name,
        description: processGroup.name,
        sortOrder: groupIndex,
        isActive: true,
      },
      create: {
        code: processGroup.code,
        name: processGroup.name,
        description: processGroup.name,
        sortOrder: groupIndex,
        isActive: true,
      },
    });

    for (const [processIndex, process] of processGroup.processes.entries()) {
      await prisma.process.upsert({
        where: { code: process.code },
        update: {
          name: process.name,
          description: process.name,
          sortOrder: processIndex,
          isActive: true,
          processGroupId: record.id,
        },
        create: {
          code: process.code,
          name: process.name,
          description: process.name,
          sortOrder: processIndex,
          isActive: true,
          processGroupId: record.id,
        },
      });

      processCount += 1;
    }
  }

  for (const [index, documentType] of documentTypes.entries()) {
    await prisma.documentType.upsert({
      where: { code: documentType.code },
      update: {
        name: documentType.name,
        category: documentType.category,
        definition: documentType.name,
        sortOrder: index,
        isActive: true,
      },
      create: {
        code: documentType.code,
        name: documentType.name,
        category: documentType.category,
        definition: documentType.name,
        sortOrder: index,
        isActive: true,
      },
    });
  }

  for (const [index, area] of areas.entries()) {
    await prisma.area.upsert({
      where: { code: area.code },
      update: {
        name: area.name,
        description: area.description,
        sortOrder: index,
        isActive: true,
        validTo: null,
      },
      create: {
        code: area.code,
        name: area.name,
        description: area.description,
        sortOrder: index,
        isActive: true,
      },
    });
  }

  console.log("Catalog seed completed:");
  console.log(`- process groups: ${processGroups.length}`);
  console.log(`- processes: ${processCount}`);
  console.log(`- document types: ${documentTypes.length}`);
  console.log(`- areas: ${areas.length}`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
