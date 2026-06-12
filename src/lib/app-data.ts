import { mockUserRecords } from "@/lib/auth/mock-accounts";
import type {
  AccessRule,
  AiResponsePreset,
  AuditEvent,
  DocumentRecord,
  MetricCard,
  ReaderGroupRecord,
  RequestRecord,
  ReviewComment,
  ReviewTask,
  TreeBranch,
  UserRecord,
} from "@/lib/types";

export const dashboardMetrics: MetricCard[] = [
  {
    label: "Solicitudes pendientes",
    value: "18",
    detail: "5 por asignar hoy",
    tone: "accent",
  },
  {
    label: "Documentos en revisión",
    value: "11",
    detail: "3 con rechazo activo",
    tone: "amber",
  },
  {
    label: "Aprobaciones por resolver",
    value: "07",
    detail: "2 vencen en 24 h",
    tone: "amber",
  },
  {
    label: "Descargas pendientes",
    value: "04",
    detail: "Vigencia máxima 24 horas",
    tone: "green",
  },
];

export const requestRecords: RequestRecord[] = [
  {
    code: "SOL-2026-019",
    title: "Actualización del procedimiento de devoluciones en sala",
    process: "PC09 - Gestión de Devoluciones y Servicio Postventa",
    type: "PRO",
    priority: "Alta",
    requester: "María Chicas",
    dueDate: "31 may 2026",
    status: "ASSIGNED",
  },
  {
    code: "SOL-2026-017",
    title: "Nuevo lineamiento para descuentos extraordinarios",
    process: "PC01 - Administración de Categorías",
    type: "LIN",
    priority: "Alta",
    requester: "Carlos Alvarenga",
    dueDate: "30 may 2026",
    status: "IN_PROGRESS",
  },
  {
    code: "SOL-2026-014",
    title: "Formato de registro para auditoría de piso",
    process: "PM01 - Auditoría y Control Interno",
    type: "FOR",
    priority: "Media",
    requester: "Paola Marroquín",
    dueDate: "04 jun 2026",
    status: "PENDING_ASSIGNMENT",
  },
  {
    code: "SOL-2026-012",
    title: "Ajuste del instructivo de uso de handheld",
    process: "PS03 - Gestión de Tecnología y Sistemas de Información",
    type: "INS",
    priority: "Media",
    requester: "José Guardado",
    dueDate: "06 jun 2026",
    status: "IN_REVIEW",
  },
];

export const reviewTasks: ReviewTask[] = [
  {
    code: "POL-014-V2.0",
    title: "Política de manejo de inventario sensible",
    version: "Mayor",
    owner: "Ana Pleitéz",
    status: "APPROVED",
    role: "Revisor",
    dueDate: "Hoy",
  },
  {
    code: "PRO-077-V1.3",
    title: "Procedimiento de recepción en CEDI",
    version: "Menor",
    owner: "Luis Martínez",
    status: "PENDING",
    role: "Aprobador",
    dueDate: "Hoy",
  },
  {
    code: "INS-031-V4.0",
    title: "Instructivo de cierre de caja",
    version: "Mayor",
    owner: "Gabriela Pérez",
    status: "REJECTED",
    role: "Revisor",
    dueDate: "Mañana",
  },
];

export const auditEvents: AuditEvent[] = [
  {
    actor: "Administrador",
    action: "Aprobó permiso temporal de descarga",
    target: "POL-014-V2.0",
    timestamp: "Hace 11 min",
  },
  {
    actor: "Editor PC09",
    action: "Envió borrador a ronda 3 de revisión",
    target: "PRO-077-V1.3",
    timestamp: "Hace 26 min",
  },
  {
    actor: "Sistema IA",
    action: "Reindexó versión oficial vigente",
    target: "NOR-009-V1.1",
    timestamp: "Hace 41 min",
  },
  {
    actor: "Administrador",
    action: "Revocó acceso histórico a grupo OPERATIVO",
    target: "ACT-004-V1.0",
    timestamp: "Hace 58 min",
  },
];

export const documentRecords: DocumentRecord[] = [
  {
    id: "doc-1",
    code: "POL-014",
    title: "Política de manejo de inventario sensible",
    process: "PC05 - Centros de Distribución y Logística",
    type: "POL",
    version: "V2.0",
    state: "OFFICIAL",
    visibility: "RESTRICTED_BY_GROUP",
    updatedAt: "28 may 2026",
    owner: "Ana Pleitéz",
    summary:
      "Define principios, responsables y controles para inventario sensible en centros de distribución.",
    tags: ["Oficial", "Grupo restringido", "Indexado IA"],
    relatedCodes: ["PRO-077", "FOR-012", "NOR-009"],
    downloadWindow: "Sin permiso activo",
    allowedReaderGroups: ["DIRECTIVO", "CENTROS_DISTRIBUCION"],
    aiEnabled: true,
  },
  {
    id: "doc-2",
    code: "PRO-077",
    title: "Procedimiento de recepción en CEDI",
    process: "PC05 - Centros de Distribución y Logística",
    type: "PRO",
    version: "V1.3",
    state: "IN_REVIEW",
    visibility: "RESTRICTED_BY_ROLE",
    updatedAt: "29 may 2026",
    owner: "Luis Martínez",
    summary:
      "Describe el flujo operativo para recepción física, validación, rechazo y registro de mercancía.",
    tags: ["Borrador", "Ronda 3", "Sin lectura general"],
    relatedCodes: ["POL-014", "FOR-012"],
    allowedRoles: ["ADMINISTRATOR", "EDITOR"],
  },
  {
    id: "doc-3",
    code: "INS-031",
    title: "Instructivo de cierre de caja",
    process: "PC06 - Operación de Salas de Ventas",
    type: "INS",
    version: "V4.0",
    state: "APPROVED_DRAFT",
    visibility: "PUBLIC_INTERNAL",
    updatedAt: "27 may 2026",
    owner: "Gabriela Pérez",
    summary:
      "Paso a paso para arqueo, conciliación y cierre operativo al final del turno.",
    tags: ["Aprobado", "Pendiente oficializar", "Lectura futura"],
    relatedCodes: ["FOR-021", "REG-099"],
  },
  {
    id: "doc-4",
    code: "NOR-009",
    title: "Norma de acceso a zonas de alta seguridad",
    process: "PS06 - Seguridad Operativa y Patrimonial",
    type: "NOR",
    version: "V1.1",
    state: "OFFICIAL",
    visibility: "CONFIDENTIAL",
    updatedAt: "23 may 2026",
    owner: "Mauricio Arévalo",
    summary:
      "Reglas, autorizaciones y excepciones para acceso físico a áreas de resguardo y custodias críticas.",
    tags: ["Confidencial", "Control estricto", "Citable IA autorizada"],
    relatedCodes: ["POL-014", "ACT-004"],
    allowedRoles: ["ADMINISTRATOR", "EDITOR"],
    allowedReaderGroups: ["DIRECTIVO", "CENTROS_DISTRIBUCION"],
    allowedUsernames: ["juan.arias"],
    aiEnabled: true,
  },
  {
    id: "doc-5",
    code: "ACT-004",
    title: "Acta de sustitución de protocolo de custodia",
    process: "PS06 - Seguridad Operativa y Patrimonial",
    type: "ACT",
    version: "V1.0",
    state: "ARCHIVED",
    visibility: "ARCHIVED_RESTRICTED",
    updatedAt: "10 may 2026",
    owner: "Mauricio Arévalo",
    summary:
      "Documento histórico del protocolo reemplazado durante la actualización del marco de custodia.",
    tags: ["Histórico", "Solo autorizados", "Relaciones migradas"],
    relatedCodes: ["NOR-009"],
    replacement: "NOR-009",
    allowedRoles: ["ADMINISTRATOR", "EDITOR"],
    allowedReaderGroups: ["DIRECTIVO"],
  },
];

export const reviewComments: ReviewComment[] = [
  {
    author: "Laura Ventura",
    role: "Revisor",
    status: "Aplicada",
    section: "5. Recepción de producto con diferencias",
    note:
      "Alinear el texto con la versión vigente de la política logística y mover la excepción de rotura al anexo.",
  },
  {
    author: "David Portillo",
    role: "Aprobador",
    status: "Pendiente",
    section: "7. Evidencias obligatorias",
    note:
      "Confirmar si el registro fotográfico se exigirá para todas las recepciones o solo para incidencias críticas.",
  },
  {
    author: "Luis Martínez",
    role: "Editor",
    status: "Aceptada",
    section: "Metadatos de vigencia",
    note:
      "Se ajustó la versión a V1.3 por tratarse de cambio menor sin alterar contenido sustantivo del procedimiento.",
  },
];

export const accessRules: AccessRule[] = [
  {
    subject: "ROLE · LECTOR",
    scope: "Lectura directa",
    effect: "ALLOW",
  },
  {
    subject: "GROUP · CENTROS_DISTRIBUCION",
    scope: "Consulta IA",
    effect: "ALLOW",
  },
  {
    subject: "GROUP · OPERATIVO",
    scope: "Histórico",
    effect: "DENY",
  },
  {
    subject: "USER · juan.arias",
    scope: "Descarga",
    effect: "ALLOW",
    expiresAt: "29 may 2026 · 16:40",
  },
];

export const readerGroups: ReaderGroupRecord[] = [
  { code: "DIRECTIVO", name: "Dirección y alta gerencia", members: 14, mode: "Restringido" },
  { code: "AUDITORIA_CONTROL", name: "Auditoría y control interno", members: 11, mode: "Restringido" },
  { code: "ADMINISTRATIVO", name: "Áreas administrativas", members: 36, mode: "General" },
  { code: "OPERATIVO", name: "Operación de tiendas y salas", members: 108, mode: "General" },
  { code: "TIENDAS_SALAS", name: "Jefaturas y supervisión de salas", members: 42, mode: "General" },
  { code: "CENTROS_DISTRIBUCION", name: "CEDI y logística", members: 27, mode: "Restringido" },
];

export const users: UserRecord[] = mockUserRecords;

export const aiResponsePresets: AiResponsePreset[] = [
  {
    id: "inventario",
    prompt: "¿Cuál es el criterio vigente para inventario sensible en CEDI?",
    answer:
      "La política vigente exige doble validación física, registro de incidencias y autorización escalonada para ajustes extraordinarios. La consulta se sustenta en documentos oficiales vigentes y excluye histórico no autorizado.",
    citations: [
      {
        code: "POL-014-V2.0",
        title: "Política de manejo de inventario sensible",
        section: "3. Principios de control",
        snippet:
          "Todo inventario sensible debe contar con doble validación y evidencia de custodia antes de su liberación.",
      },
      {
        code: "NOR-009-V1.1",
        title: "Norma de acceso a zonas de alta seguridad",
        section: "4. Reglas de ingreso",
        snippet:
          "El ingreso a áreas resguardadas requiere autorización previa y registro verificable del responsable.",
      },
    ],
  },
  {
    id: "devoluciones",
    prompt: "¿Qué documento regula devoluciones y servicio postventa?",
    answer:
      "Existe una actualización en curso del procedimiento de devoluciones, pero la respuesta oficial debe sustentarse en la última versión oficial publicada. El borrador en revisión no se expone a lectores ni a IA general.",
    citations: [
      {
        code: "PRO-064-V2.1",
        title: "Procedimiento de devoluciones y postventa",
        section: "2. Alcance operativo",
        snippet:
          "Las devoluciones de sala deben registrarse en el flujo validado por servicio al cliente y jefatura operativa.",
      },
    ],
  },
];

export const documentTree: TreeBranch[] = [
  {
    code: "PE",
    label: "Procesos estratégicos",
    children: [
      {
        code: "PE01",
        label: "Planeación Estratégica",
        children: [
          { code: "POL", label: "Políticas" },
          { code: "PRO", label: "Procedimientos" },
          { code: "ESD", label: "Esquemas documentales" },
        ],
      },
    ],
  },
  {
    code: "PC",
    label: "Procesos clave",
    children: [
      {
        code: "PC05",
        label: "Centros de Distribución y Logística",
        children: [
          { code: "POL", label: "Políticas" },
          { code: "PRO", label: "Procedimientos" },
          { code: "FOR", label: "Formatos" },
          { code: "OBSOLETOS", label: "Obsoletos" },
        ],
      },
      {
        code: "PC06",
        label: "Operación de Salas de Ventas",
        children: [
          { code: "INS", label: "Instructivos" },
          { code: "REG", label: "Registros" },
        ],
      },
    ],
  },
  {
    code: "PS",
    label: "Procesos de soporte",
    children: [
      {
        code: "PS06",
        label: "Seguridad Operativa y Patrimonial",
        children: [
          { code: "NOR", label: "Normas" },
          { code: "ACT", label: "Actas" },
        ],
      },
    ],
  },
];
