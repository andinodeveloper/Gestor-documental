import type {
  RequestProgressItemStatus,
  RequestType,
  WaitingReason,
  WorkflowStatus,
} from "@/lib/types";

export type RequestProgressTemplateItem = {
  phaseCode: string;
  phaseName: string;
  activityCode: string;
  activityName: string;
  description: string;
  weight: number;
  sortOrder: number;
  appliesToRequestType: RequestType | "BOTH";
};

type ProgressSnapshotItem = {
  activityCode: string;
  activityName: string;
  phaseCode: string;
  phaseName: string;
  sortOrder: number;
  status: RequestProgressItemStatus;
  weight: number;
};

const progressTemplate: RequestProgressTemplateItem[] = [
  {
    phaseCode: "0",
    phaseName: "Fase 0: Planificacion inicial",
    activityCode: "0.1",
    activityName: "Identificacion o solicitud formal del documento",
    description: "Solicitud formal enviada por el area usuaria o generada por estrategia documental.",
    weight: 0,
    sortOrder: 10,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "0",
    phaseName: "Fase 0: Planificacion inicial",
    activityCode: "0.2",
    activityName: "Revision y validacion del requerimiento",
    description: "Validacion del tipo documental, necesidad real y alineacion normativa.",
    weight: 4,
    sortOrder: 20,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "0",
    phaseName: "Fase 0: Planificacion inicial",
    activityCode: "0.3",
    activityName: "Asignacion del documento a analista responsable",
    description: "Asignacion oficial al responsable y registro en el plan de trabajo.",
    weight: 3,
    sortOrder: 30,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "0",
    phaseName: "Fase 0: Planificacion inicial",
    activityCode: "0.4",
    activityName: "Priorizacion y calendarizacion del trabajo",
    description: "Definicion de prioridades, tiempos estimados y planificacion del abordaje.",
    weight: 3,
    sortOrder: 40,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "1",
    phaseName: "Fase 1: Analisis y levantamiento de informacion",
    activityCode: "1.1",
    activityName: "Contacto inicial con el area solicitante o responsable",
    description: "Coordinacion inicial para entrevistas, reuniones o levantamiento.",
    weight: 3,
    sortOrder: 50,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "1",
    phaseName: "Fase 1: Analisis y levantamiento de informacion",
    activityCode: "1.2",
    activityName: "Revision normativa y documental relacionada",
    description: "Revision de normativas, politicas y documentacion relacionada vigente.",
    weight: 4,
    sortOrder: 60,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "1",
    phaseName: "Fase 1: Analisis y levantamiento de informacion",
    activityCode: "1.3",
    activityName: "Levantamiento de procesos, informacion o datos tecnicos",
    description: "Recopilacion de informacion tecnica, operativa o administrativa.",
    weight: 8,
    sortOrder: 70,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "1",
    phaseName: "Fase 1: Analisis y levantamiento de informacion",
    activityCode: "1.4",
    activityName: "Analisis de hallazgos y definicion de estructura",
    description: "Analisis de hallazgos y definicion de la estructura del documento.",
    weight: 5,
    sortOrder: 80,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "2",
    phaseName: "Fase 2: Elaboracion tecnica del documento",
    activityCode: "2.1",
    activityName: "Creacion del documento con estructura base",
    description: "Creacion inicial del documento con plantilla, encabezados y secciones base.",
    weight: 5,
    sortOrder: 90,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "2",
    phaseName: "Fase 2: Elaboracion tecnica del documento",
    activityCode: "2.2",
    activityName: "Redaccion de contenido principal",
    description: "Redaccion detallada de los apartados principales del documento.",
    weight: 10,
    sortOrder: 100,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "2",
    phaseName: "Fase 2: Elaboracion tecnica del documento",
    activityCode: "2.3",
    activityName: "Redaccion de anexos, formatos, diagramas o tablas",
    description: "Diseno de formularios, diagramas, flujogramas u otros complementos requeridos.",
    weight: 5,
    sortOrder: 110,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "2",
    phaseName: "Fase 2: Elaboracion tecnica del documento",
    activityCode: "2.4",
    activityName: "Revision interna del analista",
    description: "Revision integral del documento para detectar errores o mejoras.",
    weight: 5,
    sortOrder: 120,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "2",
    phaseName: "Fase 2: Elaboracion tecnica del documento",
    activityCode: "2.5",
    activityName: "Prevalidacion interna con lider u otro responsable",
    description: "Revision informal o tecnica previa a la fase de validacion formal.",
    weight: 5,
    sortOrder: 130,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "3",
    phaseName: "Fase 3: Revision y validacion formal",
    activityCode: "3.1",
    activityName: "Revision por areas involucradas",
    description: "Revision del documento por parte de las areas usuarias o ejecutoras.",
    weight: 5,
    sortOrder: 140,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "3",
    phaseName: "Fase 3: Revision y validacion formal",
    activityCode: "3.2",
    activityName: "Ajustes e incorporacion de comentarios",
    description: "Incorporacion de observaciones, sugerencias o cambios solicitados.",
    weight: 5,
    sortOrder: 150,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "3",
    phaseName: "Fase 3: Revision y validacion formal",
    activityCode: "3.3",
    activityName: "Validacion por revisores formales",
    description: "Revision formal por revisores oficiales del tipo documental.",
    weight: 5,
    sortOrder: 160,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "3",
    phaseName: "Fase 3: Revision y validacion formal",
    activityCode: "3.4",
    activityName: "Validacion por el area de procesos",
    description: "Verificacion formal de formato, estructura, codificacion y estilo.",
    weight: 5,
    sortOrder: 170,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "4",
    phaseName: "Fase 4: Aprobacion y publicacion",
    activityCode: "4.1",
    activityName: "Aprobacion del documento",
    description: "Obtencion de la aprobacion de la autoridad o responsable competente.",
    weight: 5,
    sortOrder: 180,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "4",
    phaseName: "Fase 4: Aprobacion y publicacion",
    activityCode: "4.2",
    activityName: "Registro y codificacion definitiva",
    description: "Asignacion de version, codigo final y actualizacion de ficha tecnica.",
    weight: 5,
    sortOrder: 190,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "4",
    phaseName: "Fase 4: Aprobacion y publicacion",
    activityCode: "4.3",
    activityName: "Publicacion y notificacion oficial",
    description: "Carga al repositorio oficial y notificacion por canales definidos.",
    weight: 5,
    sortOrder: 200,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "5",
    phaseName: "Fase 5: Cierre documental y seguimiento",
    activityCode: "5.1",
    activityName: "Archivo del expediente",
    description: "Archivo del expediente documental con respaldo de las etapas del proceso.",
    weight: 2,
    sortOrder: 210,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "5",
    phaseName: "Fase 5: Cierre documental y seguimiento",
    activityCode: "5.2",
    activityName: "Actualizacion de matriz maestra y control",
    description: "Registro del documento final en la matriz maestra y controles relacionados.",
    weight: 2,
    sortOrder: 220,
    appliesToRequestType: "BOTH",
  },
  {
    phaseCode: "5",
    phaseName: "Fase 5: Cierre documental y seguimiento",
    activityCode: "5.3",
    activityName: "Cierre y seguimiento",
    description: "Verificacion de uso, comprension o retroalimentacion posterior si aplica.",
    weight: 1,
    sortOrder: 230,
    appliesToRequestType: "BOTH",
  },
];

export function getRequestProgressTemplate(requestType: RequestType) {
  return progressTemplate.filter(
    (item) => item.appliesToRequestType === "BOTH" || item.appliesToRequestType === requestType,
  );
}

export function getRequestProgressSnapshot(items: ProgressSnapshotItem[]) {
  const applicableItems = items.filter((item) => item.status !== "NOT_APPLICABLE");
  const completedWeight = applicableItems.reduce((total, item) => {
    return item.status === "COMPLETED" ? total + item.weight : total;
  }, 0);
  const totalWeight = applicableItems.reduce((total, item) => total + item.weight, 0);
  const progressPercent =
    totalWeight === 0 ? 0 : Math.round((completedWeight / totalWeight) * 100);
  const currentItem = applicableItems.find((item) => item.status !== "COMPLETED");
  const phase4Complete = hasPhaseCompleted(applicableItems, "4");
  const phase3Complete = hasPhaseCompleted(applicableItems, "3");
  const phase3Touched = applicableItems.some(
    (item) =>
      item.phaseCode === "3" &&
      item.status !== "PENDING" &&
      item.status !== "NOT_APPLICABLE",
  );

  return {
    completedWeight,
    currentActivityCode: currentItem?.activityCode,
    currentActivityName: currentItem?.activityName,
    currentPhaseCode: currentItem?.phaseCode,
    currentPhaseName: currentItem?.phaseName,
    phase3Complete,
    phase3Touched,
    phase4Complete,
    progressPercent,
    totalWeight,
  };
}

export function deriveWorkflowStatusFromTracking(input: {
  assignedEditorUserId?: string | null;
  items: ProgressSnapshotItem[];
  waitingReason: WaitingReason;
}) {
  if (input.waitingReason !== "NONE") {
    return "OBSERVED" satisfies WorkflowStatus;
  }

  const snapshot = getRequestProgressSnapshot(input.items);

  if (snapshot.phase4Complete) {
    return "OFFICIALIZED" satisfies WorkflowStatus;
  }

  if (snapshot.phase3Complete) {
    return "APPROVED" satisfies WorkflowStatus;
  }

  if (snapshot.phase3Touched) {
    return "IN_REVIEW" satisfies WorkflowStatus;
  }

  if (input.assignedEditorUserId) {
    const hasWorkStarted = input.items.some(
      (item) =>
        item.status === "IN_PROGRESS" ||
        item.status === "COMPLETED" ||
        item.status === "RETURNED" ||
        item.status === "WAITING",
    );

    return hasWorkStarted ? "IN_PROGRESS" : "ASSIGNED";
  }

  return "PENDING_ASSIGNMENT";
}

function hasPhaseCompleted(items: ProgressSnapshotItem[], phaseCode: string) {
  const phaseItems = items.filter((item) => item.phaseCode === phaseCode);

  if (phaseItems.length === 0) {
    return false;
  }

  return phaseItems.every(
    (item) => item.status === "COMPLETED" || item.status === "NOT_APPLICABLE",
  );
}
