import type {
  RequestTrackingStageRecord,
  RequestType,
  WaitingReason,
  WorkflowStatus,
} from "@/lib/types";

export type RequestTrackingStageTemplateItem = RequestTrackingStageRecord & {
  appliesToRequestType: RequestType | "BOTH";
};

const requestTrackingStageCatalog: RequestTrackingStageTemplateItem[] = [
  {
    code: "0.1",
    phaseCode: "0",
    phaseName: "Fase 0: Planificacion inicial",
    activityName: "Identificacion o solicitud formal del documento",
    description:
      "Solicitud formal enviada por el area usuaria o generada desde estrategia de actualizacion documental.",
    progressPercent: 0,
    sortOrder: 10,
    appliesToRequestType: "BOTH",
  },
  {
    code: "0.2",
    phaseCode: "0",
    phaseName: "Fase 0: Planificacion inicial",
    activityName: "Revision y validacion del requerimiento",
    description:
      "Validacion del tipo documental, necesidad real y alineacion al marco normativo o estrategico.",
    progressPercent: 4,
    sortOrder: 20,
    appliesToRequestType: "BOTH",
  },
  {
    code: "0.3",
    phaseCode: "0",
    phaseName: "Fase 0: Planificacion inicial",
    activityName: "Asignacion del documento a analista responsable",
    description:
      "Asignacion oficial a un analista y registro en el plan de trabajo o sistema de seguimiento.",
    progressPercent: 7,
    sortOrder: 30,
    appliesToRequestType: "BOTH",
  },
  {
    code: "0.4",
    phaseCode: "0",
    phaseName: "Fase 0: Planificacion inicial",
    activityName: "Priorizacion y calendarizacion del trabajo",
    description:
      "Definicion de prioridades, tiempos estimados y planificacion del abordaje documental.",
    progressPercent: 10,
    sortOrder: 40,
    appliesToRequestType: "BOTH",
  },
  {
    code: "1.1",
    phaseCode: "1",
    phaseName: "Fase 1: Analisis y levantamiento de informacion",
    activityName: "Contacto inicial con el area solicitante o responsable",
    description:
      "Contacto directo con responsables del proceso o area solicitante para coordinar entrevistas o reuniones.",
    progressPercent: 13,
    sortOrder: 50,
    appliesToRequestType: "BOTH",
  },
  {
    code: "1.2",
    phaseCode: "1",
    phaseName: "Fase 1: Analisis y levantamiento de informacion",
    activityName: "Revision normativa y documental relacionada",
    description:
      "Revision de normativas legales, politicas internas y documentacion relacionada vigente o complementaria.",
    progressPercent: 17,
    sortOrder: 60,
    appliesToRequestType: "BOTH",
  },
  {
    code: "1.3",
    phaseCode: "1",
    phaseName: "Fase 1: Analisis y levantamiento de informacion",
    activityName: "Levantamiento de procesos, informacion o datos tecnicos",
    description:
      "Recopilacion de informacion tecnica, operativa o administrativa mediante observacion, entrevistas o analisis.",
    progressPercent: 25,
    sortOrder: 70,
    appliesToRequestType: "BOTH",
  },
  {
    code: "1.4",
    phaseCode: "1",
    phaseName: "Fase 1: Analisis y levantamiento de informacion",
    activityName: "Analisis de hallazgos y definicion de estructura",
    description:
      "Analisis de informacion levantada y definicion de estructura del documento.",
    progressPercent: 30,
    sortOrder: 80,
    appliesToRequestType: "BOTH",
  },
  {
    code: "2.1",
    phaseCode: "2",
    phaseName: "Fase 2: Elaboracion tecnica del documento",
    activityName: "Creacion del documento con estructura base",
    description:
      "Creacion inicial del documento aplicando plantilla oficial y completando encabezados y secciones base.",
    progressPercent: 35,
    sortOrder: 90,
    appliesToRequestType: "BOTH",
  },
  {
    code: "2.2",
    phaseCode: "2",
    phaseName: "Fase 2: Elaboracion tecnica del documento",
    activityName: "Redaccion de contenido principal",
    description:
      "Redaccion detallada de todos los apartados principales del documento, con enfoque tecnico y normativo.",
    progressPercent: 45,
    sortOrder: 100,
    appliesToRequestType: "BOTH",
  },
  {
    code: "2.3",
    phaseCode: "2",
    phaseName: "Fase 2: Elaboracion tecnica del documento",
    activityName: "Redaccion de anexos, formatos, diagramas o tablas",
    description:
      "Diseno de formularios, diagramas, flujogramas u otros elementos complementarios requeridos.",
    progressPercent: 50,
    sortOrder: 110,
    appliesToRequestType: "BOTH",
  },
  {
    code: "2.4",
    phaseCode: "2",
    phaseName: "Fase 2: Elaboracion tecnica del documento",
    activityName: "Revision interna del analista",
    description:
      "Revision completa por parte del analista para detectar errores, inconsistencias o mejoras necesarias.",
    progressPercent: 55,
    sortOrder: 120,
    appliesToRequestType: "BOTH",
  },
  {
    code: "2.5",
    phaseCode: "2",
    phaseName: "Fase 2: Elaboracion tecnica del documento",
    activityName: "Prevalidacion interna con lider u otro responsable",
    description:
      "Revision informal o tecnica por parte del lider de procesos u otro analista para asegurar calidad.",
    progressPercent: 60,
    sortOrder: 130,
    appliesToRequestType: "BOTH",
  },
  {
    code: "3.1",
    phaseCode: "3",
    phaseName: "Fase 3: Revision y validacion formal",
    activityName: "Revision por areas involucradas",
    description:
      "Revision por parte del area tecnica u operativa responsable de ejecutar o usar el documento.",
    progressPercent: 65,
    sortOrder: 140,
    appliesToRequestType: "BOTH",
  },
  {
    code: "3.2",
    phaseCode: "3",
    phaseName: "Fase 3: Revision y validacion formal",
    activityName: "Ajustes e incorporacion de comentarios",
    description:
      "Incorporacion de observaciones, sugerencias o cambios propuestos por las areas revisadas.",
    progressPercent: 70,
    sortOrder: 150,
    appliesToRequestType: "BOTH",
  },
  {
    code: "3.3",
    phaseCode: "3",
    phaseName: "Fase 3: Revision y validacion formal",
    activityName: "Validacion por revisores formales",
    description:
      "Revision formal por revisores oficiales segun el tipo documental.",
    progressPercent: 75,
    sortOrder: 160,
    appliesToRequestType: "BOTH",
  },
  {
    code: "3.4",
    phaseCode: "3",
    phaseName: "Fase 3: Revision y validacion formal",
    activityName: "Validacion por el area de procesos",
    description:
      "Verificacion formal del area de procesos sobre formato, estructura, codificacion y estilo.",
    progressPercent: 80,
    sortOrder: 170,
    appliesToRequestType: "BOTH",
  },
  {
    code: "4.1",
    phaseCode: "4",
    phaseName: "Fase 4: Aprobacion y publicacion",
    activityName: "Aprobacion del documento",
    description:
      "Obtencion de firma de aprobacion por la autoridad competente o responsable de validar el documento.",
    progressPercent: 85,
    sortOrder: 180,
    appliesToRequestType: "BOTH",
  },
  {
    code: "4.2",
    phaseCode: "4",
    phaseName: "Fase 4: Aprobacion y publicacion",
    activityName: "Registro y codificacion definitiva",
    description:
      "Asignacion de version, codigo final y actualizacion de la ficha tecnica del documento.",
    progressPercent: 90,
    sortOrder: 190,
    appliesToRequestType: "BOTH",
  },
  {
    code: "4.3",
    phaseCode: "4",
    phaseName: "Fase 4: Aprobacion y publicacion",
    activityName: "Publicacion y notificacion oficial",
    description:
      "Carga en repositorio oficial y notificacion a usuarios del documento por medio de canales definidos.",
    progressPercent: 95,
    sortOrder: 200,
    appliesToRequestType: "BOTH",
  },
  {
    code: "5.1",
    phaseCode: "5",
    phaseName: "Fase 5: Cierre documental y seguimiento",
    activityName: "Archivo del expediente",
    description:
      "Archivo del expediente documental con respaldo de todas las etapas del proceso.",
    progressPercent: 97,
    sortOrder: 210,
    appliesToRequestType: "BOTH",
  },
  {
    code: "5.2",
    phaseCode: "5",
    phaseName: "Fase 5: Cierre documental y seguimiento",
    activityName: "Actualizacion de matriz maestra y control",
    description:
      "Registro del documento final en la matriz maestra u otros sistemas de control vigentes.",
    progressPercent: 99,
    sortOrder: 220,
    appliesToRequestType: "BOTH",
  },
  {
    code: "5.3",
    phaseCode: "5",
    phaseName: "Fase 5: Cierre documental y seguimiento",
    activityName: "Cierre y seguimiento",
    description:
      "Verificacion de uso, comprension o retroalimentacion posterior a la publicacion si aplica.",
    progressPercent: 100,
    sortOrder: 230,
    appliesToRequestType: "BOTH",
  },
];

const draftReviewStartStageCode = "3.1";

export function getRequestTrackingStages(requestType: RequestType) {
  return requestTrackingStageCatalog.filter(
    (item) => item.appliesToRequestType === "BOTH" || item.appliesToRequestType === requestType,
  );
}

export function getRequestTrackingStage(
  stageCode: string | null | undefined,
  requestType: RequestType,
) {
  const stages = getRequestTrackingStages(requestType);

  if (!stageCode) {
    return stages[0];
  }

  return stages.find((stage) => stage.code === stageCode) ?? stages[0];
}

export function hasRequestStarted(
  stageCode: string | null | undefined,
  requestType: RequestType,
) {
  return getRequestTrackingStage(stageCode, requestType).sortOrder >= 40;
}

export function canRequestEnterDraftReviewFlow(
  stageCode: string | null | undefined,
  requestType: RequestType,
) {
  const currentStage = getRequestTrackingStage(stageCode, requestType);
  const draftReviewStartStage = getRequestTrackingStage(draftReviewStartStageCode, requestType);

  return currentStage.sortOrder >= draftReviewStartStage.sortOrder;
}

export function deriveWorkflowStatusFromTracking(input: {
  assignedEditorUserId?: string | null;
  stageCode: string | null | undefined;
  requestType: RequestType;
  waitingReason: WaitingReason;
}) {
  if (input.waitingReason !== "NONE") {
    return "OBSERVED" satisfies WorkflowStatus;
  }

  const stage = getRequestTrackingStage(input.stageCode, input.requestType);

  if (!stage) {
    return input.assignedEditorUserId ? "ASSIGNED" : "PENDING_ASSIGNMENT";
  }

  if (stage.code === "0.1" || stage.code === "0.2") {
    return input.assignedEditorUserId ? "ASSIGNED" : "PENDING_ASSIGNMENT";
  }

  if (stage.phaseCode === "0" || stage.phaseCode === "1" || stage.phaseCode === "2") {
    return "IN_PROGRESS" satisfies WorkflowStatus;
  }

  if (stage.phaseCode === "3") {
    return "IN_REVIEW" satisfies WorkflowStatus;
  }

  if (stage.code === "4.1") {
    return "APPROVED" satisfies WorkflowStatus;
  }

  if (stage.phaseCode === "4" || stage.code === "5.1" || stage.code === "5.2") {
    return "OFFICIALIZED" satisfies WorkflowStatus;
  }

  return "CLOSED" satisfies WorkflowStatus;
}
