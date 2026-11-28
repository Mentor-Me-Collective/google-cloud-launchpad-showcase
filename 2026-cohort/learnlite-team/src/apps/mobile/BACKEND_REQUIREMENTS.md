# LearnLite — requisitos y contrato del backend

**Versión del documento:** 1.0
**Fecha:** 2026-11-14
**Cliente auditado:** `apps/mobile` (Expo Router, React Native/Web)
**Roles:** `student`, `teacher`

Este documento convierte el comportamiento actual del frontend en un contrato de backend. El frontend todavía persiste datos con Zustand/MMKV y usa datos semilla; las rutas descritas aquí son las que deben implementarse para sustituir esa persistencia local sin cambiar la experiencia de usuario.

## 1. Alcance funcional

### 1.1 Flujos que el backend debe soportar

1. Registro, inicio/cierre de sesión y recuperación de sesión.
2. Perfil editable de estudiante y docente.
3. Preferencias de idioma (solo `es` y `en`), tema y densidad.
4. Docentes:
   - crear y editar aulas;
   - generar/rotar códigos de aula;
   - invitar, aceptar y retirar estudiantes;
   - crear módulos, lecciones y bloques;
   - publicar módulos;
   - adjuntar archivos, imágenes y enlaces;
   - asignar módulos a aulas o a estudiantes concretos;
   - consultar actividad y progreso de su alumnado.
5. Estudiantes:
   - unirse a un aula mediante código;
   - ver aulas y asignaciones;
   - explorar módulos publicados en Comunidad;
   - descargar módulos y materiales;
   - realizar una lección en secuencia, sin saltar actividades;
   - responder opción múltiple, verdadero/falso, unir pares, ordenar pasos, completar espacios y clasificar;
   - conservar progreso, intentos, XP, racha y corazones;
   - completar una lección al llegar al último bloque;
   - repetir una lección sin borrar su historial;
   - trabajar sin conexión y sincronizar después.

### 1.2 Estado actual importante

- No existe todavía un cliente HTTP en el frontend; los stores son locales.
- `auth-store` acepta cualquier credencial mientras no exista backend.
- `teacher-store` contiene entidades semilla y genera IDs/códigos localmente.
- `student-store` guarda descargas completas de `TeacherModule`, resultados por actividad, lecciones completas, XP, racha y corazones.
- La carga de archivos del editor es actualmente un placeholder; el backend debe proporcionar almacenamiento real.
- La UI solo expone español e inglés. No se debe devolver una lista de idiomas mayor que `es`, `en`.
- Las animaciones, sonidos, personaje, confeti y SVG son responsabilidad del cliente; no necesitan endpoints propios.

## 2. Convenciones HTTP y de seguridad

### 2.1 URL y formato

- Base recomendada: `https://api.<dominio>/api/v1`.
- JSON UTF-8 para todos los endpoints salvo descarga de binarios.
- Fechas en ISO-8601 UTC, por ejemplo `2026-11-14T18:30:00Z`.
- IDs opacos UUID/ULID. El cliente no debe depender de prefijos locales como `c1`, `m1` o `a1`.
- Respuestas de colección paginadas con:

```json
{
  "data": [],
  "pagination": { "page": 1, "pageSize": 20, "total": 0, "hasNext": false }
}
```

- Mutaciones aceptan `Idempotency-Key` para evitar duplicados cuando vuelven a sincronizarse.
- Recursos editables deben devolver `ETag` o `version`; el cliente enviará `If-Match`/`baseVersion` para detectar conflictos.

### 2.2 Autenticación

- Access token de corta duración (por ejemplo, 15 minutos) en `Authorization: Bearer <token>`.
- Refresh token rotatorio y revocable; guardarlo únicamente en almacenamiento seguro del dispositivo.
- Nunca almacenar contraseñas, tokens ni respuestas correctas en MMKV sin cifrar.
- El servidor debe aplicar autorización por rol y por pertenencia al recurso, no confiar en IDs enviados por el cliente.

### 2.3 Respuesta de error

Todos los errores deben seguir este formato:

```json
{
  "error": {
    "code": "CLASSROOM_CODE_NOT_FOUND",
    "message": "El código de aula no existe o ya no está activo.",
    "details": { "field": "code" },
    "requestId": "req_01J..."
  }
}
```

Códigos HTTP mínimos: `400` validación, `401` sesión inválida, `403` permisos, `404` no encontrado, `409` conflicto/duplicado, `410` contenido retirado, `413` archivo grande, `422` respuesta no válida, `429` límite de intentos, `5xx` error temporal.

## 3. Modelo de datos requerido

### 3.1 Usuario y perfil

```ts
User {
  id: string
  email: string // único, normalizado en minúsculas
  name: string
  role: "student" | "teacher"
  school?: string
  avatarUrl?: string
  status: "active" | "suspended" | "deleted"
  createdAt: string
  updatedAt: string
}
```

El perfil docente agrega `subject`. Las estadísticas de estudiante (XP, racha, corazones) deben ser calculadas por el servidor, no aceptadas como valores arbitrarios enviados por el cliente.

### 3.2 Aula y membresía

```ts
Classroom {
  id: string
  ownerId: string
  name: string
  grade: string
  subject: string
  color: string
  allowJoinByCode: boolean
  code: string // único mientras esté activo, formato LUM-XXXX
  createdAt: string
  updatedAt: string
}

ClassroomMembership {
  id: string
  classroomId: string
  studentId: string
  status: "pending" | "active" | "removed"
  joinedAt?: string
  createdAt: string
}
```

No borrar la cuenta del estudiante al retirarlo del aula. El historial de aprendizaje queda asociado al usuario.

### 3.3 Módulo, lección y bloque

```ts
Module {
  id: string
  authorId: string
  title: string
  subject: string
  status: "draft" | "published" | "archived"
  version: number
  publishedAt?: string
  createdAt: string
  updatedAt: string
  lessons: Lesson[]
}

Lesson {
  id: string
  moduleId: string
  title: string
  position: number
  blocks: Block[]
}

Block {
  id: string
  lessonId: string
  position: number
  kind: "theory" | "material" | "link" | "activity"
  title: string
  body?: string
  imageDescription?: string
  imageAssetId?: string
  lumiComment?: string
  attachAsSupport?: boolean
  file?: FileAsset
  url?: string
  activity?: ActivityDefinition
}
```

`position` debe ser explícito y estable. El orden de las lecciones y bloques es parte de la experiencia: el estudiante avanza secuencialmente y no puede abrir una actividad aislada desde la lista.

### 3.4 Actividades

```ts
ActivityDefinition {
  type: "multiple-choice" | "true-false" | "match-pairs" |
        "order-steps" | "fill-blanks" | "classify"
  instruction?: string
  prompt: string
  options?: string[]
  correctIndex?: number
  correctBool?: boolean
  answers?: string[]
  pairs?: { left: string; right: string }[]
  steps?: string[]
  categories?: { name: string; items: string[] }[]
  explanation?: string
  hint?: string
  xp: number
}
```

**Regla de seguridad:** las respuestas (`correctIndex`, `correctBool`, `answers`, el orden correcto y la clasificación correcta) no deben enviarse al cliente estudiante en un módulo normal. El servidor debe evaluarlas al recibir un intento o entregar un `attemptToken` firmado. El editor docente sí puede recibirlas si el usuario es autor o administrador.

### 3.5 Archivos

```ts
FileAsset {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: number
  checksumSha256: string
  storageKey: string
  downloadUrl?: string // URL firmada de corta duración
  offlineAvailable: boolean
  createdAt: string
}
```

### 3.6 Asignación

```ts
Assignment {
  id: string
  moduleId: string
  classroomId: string
  studentIds?: string[] // vacío/null = todos los miembros al momento de la asignación
  dueAt?: string
  message?: string
  notify: boolean
  status: "active" | "closed" | "cancelled"
  createdBy: string
  createdAt: string
  updatedAt: string
}
```

### 3.7 Progreso y gamificación

```ts
ActivityAttempt {
  id: string
  studentId: string
  moduleId: string
  lessonId: string
  blockId: string
  attemptNumber: number
  answer: unknown // forma específica según type
  correct: boolean
  earnedXp: number
  heartsBefore: number
  heartsAfter: number
  source: "online" | "offline"
  answeredAt: string
  serverSequence: number
}

LessonProgress {
  studentId: string
  moduleId: string
  lessonId: string
  status: "not_started" | "in_progress" | "completed"
  currentBlockPosition: number
  completedAt?: string
  bestScore?: number
  lastAttemptAt?: string
  version: number
}
```

El historial de intentos es append-only. Repetir una lección crea un nuevo intento y reinicia el estado de la sesión actual, pero no borra XP, intentos ni la marca histórica de finalización.

## 4. Catálogo ordenado de endpoints

### A. Servicio y configuración pública

#### A-01 — `GET /health`

Uso: health check del balanceador y del cliente.

Respuesta `200`:

```json
{ "status": "ok", "version": "2026.11.0", "timestamp": "2026-11-14T18:30:00Z" }
```

#### A-02 — `GET /config`

Uso: obtener configuración no sensible y capacidades del backend.

Respuesta:

```json
{
  "supportedLocales": ["es", "en"],
  "maxUploadBytes": 52428800,
  "maxHearts": 5,
  "offline": { "enabled": true, "maxModuleBytes": 104857600 },
  "features": { "community": true, "notifications": true }
}
```

### B. Autenticación y cuenta

#### B-01 — `POST /auth/register`

Request:

```json
{
  "name": "Learner",
  "email": "learner@example.com",
  "password": "********",
  "role": "student",
  "school": "Colegio San Martín",
  "locale": "es"
}
```

Validar email único, contraseña segura y rol permitido. Responder `201` con `{ user, accessToken, refreshToken, expiresIn }`.

#### B-02 — `POST /auth/login`

Request `{ "email": "...", "password": "..." }`.  Responder los tokens y el usuario. No aceptar el modo “cualquier contraseña” usado por el mock actual.

#### B-03 — `POST /auth/refresh`

Request `{ "refreshToken": "..." }`. Rotar el refresh token y revocar el anterior.

#### B-04 — `POST /auth/logout`

Revocar la sesión actual. Debe ser idempotente.

#### B-05 — `GET /me`

Devuelve usuario, perfil, rol y un resumen mínimo de estadísticas.

#### B-06 — `PATCH /me`

Actualiza `name`, `email`, `school` y, para docente, `subject`. Requiere validar email y devolver el usuario actualizado. Si cambia el email, iniciar verificación.

#### B-07 — `POST /auth/verify-email` y `POST /auth/resend-verification`

Recomendado antes de habilitar invitaciones por email. El token debe expirar y ser de un solo uso.

#### B-08 — `POST /auth/forgot-password` y `POST /auth/reset-password`

Recomendado para producción. No revelar si un correo está registrado.

#### B-09 — `GET /me/preferences` / `PATCH /me/preferences`

Request de actualización:

```json
{ "locale": "en", "theme": "system", "density": "cozy" }
```

`locale` solo acepta `es|en`; `theme` acepta `light|dark|system`; `density` acepta el conjunto que defina el cliente. Tema/densidad pueden permanecer locales, pero el idioma debe sincronizarse si el usuario usa varios dispositivos.

### C. Inicio y estadísticas del estudiante

#### C-01 — `GET /student/home`

Devuelve en una sola respuesta lo necesario para la pantalla de inicio: nombre, módulo activo, módulos asignados, porcentaje por módulo, XP, racha, corazones, aulas y asignaciones próximas. Debe respetar el usuario autenticado.

#### C-02 — `GET /me/gamification`

Respuesta:

```json
{
  "xp": 66,
  "streak": { "current": 2, "best": 7, "lastActiveDate": "2026-11-14" },
  "hearts": { "current": 5, "max": 5, "nextRefillAt": null },
  "dailyGoal": { "earnedXp": 30, "targetXp": 50 }
}
```

#### C-03 — `GET /me/progress?moduleId=&classroomId=`

Devuelve progreso agregado por módulo, lección y actividad. No debe incluir respuestas correctas de actividades.

#### C-04 — `GET /teacher/dashboard`

Devuelve el resumen usado por el panel docente: aulas, estudiantes, módulos, actividad de la semana, estudiantes que requieren atención y conteos de asignaciones. Los datos de detalle deben seguir protegidos por los endpoints de aula/asignación.

### D. Aulas y miembros — docente

#### D-01 — `GET /teacher/classrooms`

Lista paginada de aulas propiedad del docente, con conteo de miembros, asignaciones activas y estadísticas resumidas. Soportar `search`, `subject`, `page`, `pageSize`.

#### D-02 — `POST /teacher/classrooms`

Request:

```json
{
  "name": "6° B",
  "grade": "6° grado",
  "subject": "Ciencias Naturales",
  "color": "#2F6BFF",
  "allowJoinByCode": true
}
```

El servidor genera `id`, `code`, `createdAt` y devuelve el aula completa. El código debe ser impredecible, único y con límite de intentos.

#### D-03 — `GET /teacher/classrooms/{classroomId}`

Devuelve aula, estadísticas, miembros resumidos y asignaciones del docente autorizado.

#### D-04 — `PATCH /teacher/classrooms/{classroomId}`

Actualiza nombre, grado, materia, color y `allowJoinByCode`. Usar `If-Match` para evitar sobrescribir cambios simultáneos.

#### D-05 — `DELETE /teacher/classrooms/{classroomId}`

Recomendado como archivado lógico. No borrar cuentas, progreso ni evidencias de estudiantes.

#### D-06 — `POST /teacher/classrooms/{classroomId}/rotate-code`

Invalida el código anterior y devuelve uno nuevo. Registrar auditoría y opcionalmente notificar miembros.

#### D-07 — `GET /teacher/classrooms/{classroomId}/members`

Lista estudiantes con `id`, nombre, email, XP, precisión, racha, actividad reciente y estado (`on-track`, `needs-help`, `broken-streak`, `at-risk`). Soportar búsqueda y paginación.

#### D-08 — `POST /teacher/classrooms/{classroomId}/invitations`

Request `{ "email": "alumno@colegio.edu" }`. Crear invitación pendiente; no crear una cuenta ficticia como hace el store local.

#### D-09 — `GET /teacher/classrooms/{classroomId}/join-requests`

Lista solicitudes pendientes para que la UI pueda aceptar/rechazar.

#### D-10 — `POST /teacher/classrooms/{classroomId}/join-requests/{requestId}/accept`

Activa la membresía de la solicitud. Idempotente.

#### D-11 — `POST /teacher/classrooms/{classroomId}/join-requests/{requestId}/reject`

Rechaza la solicitud sin borrar la cuenta.

#### D-12 — `DELETE /teacher/classrooms/{classroomId}/members/{studentId}`

Retira al alumno del aula. Conservar su historial global.

#### D-13 — `POST /teacher/classrooms/{classroomId}/members`

Agrega uno o varios estudiantes ya existentes después de aceptar una solicitud o seleccionar estudiantes. Request `{ "studentIds": ["student_123"] }`. Validar que el docente administre el aula y que cada usuario tenga rol `student`; la operación debe ser idempotente.

### E. Aulas y membresías — estudiante

#### E-01 — `GET /me/classrooms`

Lista aulas activas del estudiante, conteo de asignaciones y datos visuales de aula.

#### E-02 — `POST /me/classrooms/join`

Request `{ "code": "LUM-4821" }`. Normalizar mayúsculas y espacios. Respuestas: `201` membresía creada, `200` ya era miembro, `404/410` código inválido/expirado, `403` aula cerrada.

#### E-03 — `DELETE /me/classrooms/{classroomId}`

Permite abandonar un aula sin borrar progreso.

#### E-04 — `GET /me/classrooms/{classroomId}`

Devuelve aula y asignaciones visibles para ese estudiante. No debe exponer otros estudiantes ni información privada del docente.

### F. Módulos y contenido — docente

#### F-01 — `GET /teacher/modules`

Lista módulos propios con filtro `status=draft|published|archived`, búsqueda y paginación.

#### F-02 — `POST /teacher/modules`

Request `{ "title": "Misión: La célula", "subject": "Ciencias Naturales" }`. Crear siempre como `draft`.

#### F-03 — `GET /teacher/modules/{moduleId}`

Devuelve el módulo completo, incluidas respuestas correctas, solo al autor o administrador.

#### F-04 — `PATCH /teacher/modules/{moduleId}`

Actualiza título, materia y metadatos. Incrementar `version`.

#### F-05 — `POST /teacher/modules/{moduleId}/publish`

Validar que el módulo tenga contenido válido, actividades configuradas y archivos disponibles. Cambia a `published`, asigna `publishedAt` y crea una nueva versión inmutable para estudiantes que ya descargaron contenido.

#### F-06 — `POST /teacher/modules/{moduleId}/unpublish`

Recomendado para retirar un módulo de Comunidad y nuevas asignaciones sin borrar el progreso existente.

#### F-07 — `POST /teacher/modules/{moduleId}/lessons`

Request `{ "title": "Partes de la célula", "position": 0 }`.

#### F-08 — `PATCH /teacher/modules/{moduleId}/lessons/{lessonId}`

Actualiza título y metadatos permitidos.

#### F-09 — `DELETE /teacher/modules/{moduleId}/lessons/{lessonId}`

Recomendado como borrado lógico si ya existe progreso. Debe devolver conflicto si el docente intenta eliminar una lección publicada sin confirmación explícita.

#### F-10 — `POST /teacher/modules/{moduleId}/lessons/reorder`

Request `{ "lessonIds": ["lesson_2", "lesson_1"] }`. Validar que pertenezcan al módulo.

#### F-11 — `POST /teacher/modules/{moduleId}/lessons/{lessonId}/blocks`

Crear bloques `theory`, `material`, `link` o `activity`. Validar el esquema según `kind` y `activity.type`.

#### F-12 — `PATCH /teacher/modules/{moduleId}/lessons/{lessonId}/blocks/{blockId}`

Actualiza el bloque y aumenta la versión del módulo.

#### F-13 — `DELETE /teacher/modules/{moduleId}/lessons/{lessonId}/blocks/{blockId}`

Borrado lógico o bloqueo si hay intentos existentes.

#### F-14 — `POST /teacher/modules/{moduleId}/lessons/{lessonId}/blocks/reorder`

Request `{ "blockIds": ["block_1", "block_3", "block_2"] }`.

#### F-15 — `POST /teacher/uploads/presign`

Request `{ "fileName": "guia.pdf", "mimeType": "application/pdf", "sizeBytes": 1258291, "sha256": "..." }`. Responder `uploadUrl`, `assetId`, expiración y headers requeridos.

#### F-16 — `POST /teacher/uploads/{assetId}/complete`

Confirma que la carga terminó, verifica tamaño/hash y devuelve `FileAsset`. No publicar el bloque hasta que el asset esté listo.

Tipos permitidos iniciales: PDF, PNG/JPEG/WebP, audio/video si se habilitan posteriormente. Aplicar antivirus, límites de tamaño y URLs firmadas.

### G. Módulos visibles para estudiantes y Comunidad

#### G-01 — `GET /me/modules`

Lista módulos que el estudiante puede ver por asignación, aula o descarga previa. Incluir `progress`, `assigned`, `dueAt`, `downloadedVersion` y permisos.

#### G-02 — `GET /me/modules/{moduleId}`

Devuelve contenido consumible por estudiante y progreso. **No incluir respuestas correctas ni campos de solución.** Para iniciar una lección se debe solicitar un intento o un paquete firmado.

#### G-03 — `GET /community/modules`

Lista módulos `published` y marcados para Comunidad. Parámetros: `q`, `subject`, `page`, `pageSize`, `sort`. No exponer borradores ni datos privados de autores.

#### G-04 — `GET /community/modules/{moduleId}`

Devuelve ficha y contenido público consumible. El estudiante puede leerlo y descargarlo, pero no editarlo.

#### G-05 — `POST /me/modules/{moduleId}/save`

Registra que el estudiante desea conservar el módulo; es opcional si “guardar” solo significa descarga local.

#### G-06 — `DELETE /me/modules/{moduleId}/save`

Elimina el guardado lógico, sin borrar historial de progreso.

### H. Asignaciones

#### H-01 — `POST /teacher/assignments`

Request:

```json
{
  "moduleId": "mod_123",
  "classroomIds": ["class_123"],
  "studentIds": [],
  "dueAt": "2026-11-21T23:59:59Z",
  "message": "¡Vamos a explorar la célula!",
  "notify": true
}
```

Si `studentIds` está vacío, asignar a todos los miembros activos de cada aula en una transacción. Validar que el docente sea dueño de aulas y módulo.

#### H-02 — `GET /teacher/assignments`

Filtros `classroomId`, `moduleId`, `status`, `page`, `pageSize`. Incluir conteos de estudiantes y completitud.

#### H-03 — `GET /teacher/assignments/{assignmentId}`

Devuelve configuración, destinatarios y progreso agregado.

#### H-04 — `PATCH /teacher/assignments/{assignmentId}`

Permite cambiar fecha, mensaje, notificación o estado. No cambiar el módulo a mitad de una asignación sin crear una versión nueva.

#### H-05 — `DELETE /teacher/assignments/{assignmentId}`

Cancelar lógicamente; no borrar intentos ni progreso.

#### H-06 — `GET /me/assignments`

Lista asignaciones del estudiante, agrupables por aula, con fecha de entrega, mensaje y progreso.

#### H-07 — `GET /me/classrooms/{classroomId}/assignments`

Lista las asignaciones de un aula concreta que el estudiante puede ver.

### I. Sesiones de lección, respuestas y progreso

#### I-01 — `POST /me/modules/{moduleId}/lessons/{lessonId}/attempts`

Inicia una ejecución secuencial de la lección. Request opcional `{ "restart": true, "clientAttemptId": "..." }`.

Respuesta:

```json
{
  "attemptId": "attempt_123",
  "lessonId": "lesson_123",
  "moduleVersion": 4,
  "totalBlocks": 6,
  "currentPosition": 0,
  "hearts": { "current": 5, "max": 5 },
  "blocks": [/* contenido sin soluciones */]
}
```

`restart=true` inicia una nueva ejecución sin eliminar historial ni la marca de lección completada.

#### I-02 — `POST /me/attempts/{attemptId}/blocks/{blockId}/answer`

Endpoint central para la pantalla de actividad. Request de ejemplo para opción múltiple:

```json
{
  "answer": { "selectedIndex": 1 },
  "clientEventId": "evt_01J...",
  "source": "online"
}
```

El backend verifica la respuesta contra la definición privada y responde:

```json
{
  "correct": true,
  "earnedXp": 10,
  "explanation": "...",
  "hearts": { "current": 5, "max": 5 },
  "attemptNumber": 1,
  "nextPosition": 3,
  "canContinue": true,
  "serverSequence": 42
}
```

En una respuesta incorrecta, descontar como máximo un corazón por intento idempotente. Si `current=0`, responder `409 HEARTS_EXHAUSTED` y no avanzar.

Formatos de `answer` por actividad:

| Tipo | Payload esperado |
|---|---|
| `multiple-choice` | `{ selectedIndex: number }` |
| `true-false` | `{ value: boolean }` |
| `match-pairs` | `{ matches: [{ left: string, right: string }] }` |
| `order-steps` | `{ order: string[] }` |
| `fill-blanks` | `{ values: string[] }` o `{ value: string }` |
| `classify` | `{ assignments: [{ item: string, category: string }] }` |

El servidor debe normalizar mayúsculas/espacios cuando corresponda, validar que todos los elementos existan y rechazar elementos duplicados o inventados.

#### I-03 — `POST /me/attempts/{attemptId}/continue`

Avanza al siguiente bloque únicamente si el bloque actual es teoría/material o la actividad fue respondida correctamente. Nunca permitir saltar posiciones mediante un `position` arbitrario.

#### I-04 — `POST /me/attempts/{attemptId}/complete`

Solo válido en el último bloque. Marca `LessonProgress.status=completed`, registra `completedAt`, calcula puntuación y devuelve si se completó el módulo completo.

```json
{
  "lessonCompleted": true,
  "moduleCompleted": false,
  "progressPercent": 66,
  "xpTotal": 80,
  "streak": 3,
  "celebration": "lesson-complete"
}
```

#### I-05 — `GET /me/modules/{moduleId}/progress`

Devuelve progreso por lección y actividad, incluyendo `completed`, `attempts`, `bestScore`, `lastAttemptAt` y la posición reanudable. Nunca incluir la solución.

#### I-06 — `GET /me/lessons/{lessonId}/history`

Historial de ejecuciones, intentos y puntuaciones. Necesario para repetir sin borrar la marca de finalización anterior.

#### I-07 — `POST /me/hearts/restore`

Restaura corazones según la política del producto. La versión inicial puede ser gratuita e inmediata, pero el servidor debe ser la autoridad y limitar abuso. Devuelve el estado actualizado.

#### I-08 — `GET /me/streak`

Devuelve racha actual, mejor racha, días activos y calendario. La racha se actualiza al completar una actividad válida, no al abrir una pantalla.

### J. Sincronización y modo offline

El frontend guarda módulos descargados y una cola local de respuestas. El backend debe hacer la sincronización segura y repetible.

#### J-01 — `GET /me/modules/{moduleId}/download-manifest`

Devuelve versión, hash de contenido, tamaño, archivos y expiración:

```json
{
  "moduleId": "mod_123",
  "version": 4,
  "contentHash": "sha256:...",
  "expiresAt": "2026-12-14T00:00:00Z",
  "resources": [
    { "path": "module.json", "sizeBytes": 42000, "sha256": "...", "url": "https://signed..." }
  ]
}
```

#### J-02 — `POST /me/modules/{moduleId}/downloads`

Registra descarga, versión y dispositivo. No es la fuente de autorización: el acceso se comprueba en cada manifest.

#### J-03 — `DELETE /me/modules/{moduleId}/downloads`

Registra que el paquete fue eliminado localmente; no elimina progreso.

#### J-04 — `POST /me/sync`

Recibe eventos offline en orden:

```json
{
  "deviceId": "device_123",
  "baseSyncToken": "sync_42",
  "events": [
    {
      "eventId": "evt_123",
      "type": "activity_answered",
      "occurredAt": "2026-11-14T18:20:00Z",
      "moduleVersion": 4,
      "payload": {
        "attemptId": "attempt_local_1",
        "lessonId": "lesson_1",
        "blockId": "block_3",
        "answer": { "selectedIndex": 1 },
        "source": "offline"
      }
    },
    {
      "eventId": "evt_124",
      "type": "lesson_completed",
      "occurredAt": "2026-11-14T18:22:00Z",
      "payload": { "attemptId": "attempt_local_1" }
    }
  ]
}
```

Respuesta:

```json
{
  "accepted": [{ "eventId": "evt_123", "serverSequence": 43 }],
  "duplicates": [],
  "rejected": [],
  "conflicts": [],
  "syncToken": "sync_43",
  "state": { "xp": 76, "streak": 3, "hearts": 4 }
}
```

Requisitos de sincronización:

- `eventId` idempotente por usuario/dispositivo.
- Procesar eventos en orden causal y conservar timestamps originales para la racha.
- No aceptar un evento offline que intente contestar una versión de módulo incompatible sin resolverla.
- Si el contenido cambió, devolver `MODULE_VERSION_CONFLICT` y permitir descargar el nuevo paquete.
- Un intento correcto ya procesado no debe volver a entregar XP al reintentarse.
- La respuesta del servidor es la autoridad para XP, corazones, racha y progreso.

#### J-05 — `GET /me/sync?since={syncToken}`

Devuelve cambios remotos ocurridos mientras el dispositivo estuvo offline: nuevas asignaciones, módulos actualizados, aulas retiradas, notificaciones y estado de progreso.

### K. Notificaciones

#### K-01 — `GET /me/notifications`

Lista notificaciones de asignaciones, invitaciones, módulos actualizados y recordatorios.

#### K-02 — `POST /me/notifications/{notificationId}/read`

Marca una notificación como leída.

#### K-03 — `POST /me/push-tokens`

Registra el token Expo/APNs/FCM, plataforma, versión de app y preferencias. El backend lo usa cuando una asignación tiene `notify=true`.

#### K-04 — `DELETE /me/push-tokens/{tokenId}`

Revoca un token al cerrar sesión o desinstalar.

### L. Analítica y soporte (recomendado)

#### L-01 — `POST /analytics/events`

Eventos no sensibles de producto: pantalla abierta, descarga iniciada/finalizada, actividad completada, error de sincronización. No enviar respuestas completas ni datos personales innecesarios.

#### L-02 — `POST /support/tickets`

Opcional para reportar un problema desde la app con `category`, `message`, `route` y `requestId`.

## 5. Reglas de negocio críticas

1. Un estudiante solo puede leer aulas, asignaciones y progreso propios.
2. Un docente solo puede editar módulos que creó y aulas que administra.
3. Un módulo debe estar publicado antes de asignarse o mostrarse en Comunidad.
4. Publicar crea una versión inmutable para que los paquetes offline no cambien a mitad de una lección.
5. La lección avanza en orden; el backend no debe confiar en `nextPosition` enviado por el cliente.
6. La actividad final es la que marca la lección como completada. Abandonar a mitad no cambia la marca histórica.
7. Repetir una lección crea una nueva ejecución; no elimina resultados ni XP anteriores.
8. XP se entrega una sola vez por actividad/ejecución según la política definida. Reintentos incorrectos no deben duplicarlo.
9. Un error descuenta un corazón; una repetición de la misma petición con el mismo `clientEventId` no descuenta otro.
10. La racha se actualiza con actividad válida y debe considerar zona horaria del perfil/dispositivo de forma consistente.
11. El cliente puede mostrar animaciones de éxito/error, pero la decisión `correct`, `earnedXp`, `hearts` y `streak` pertenece al servidor.
12. El backend nunca debe confiar en `xp`, `correct`, `role`, `ownerId` ni `studentIds` recibidos sin verificar.
13. El código de aula permite unirse solo si `allowJoinByCode=true` y el aula está activa.
14. Retirar un estudiante del aula no borra su cuenta, intentos, XP ni historial.
15. El contenido descargado debe poder validarse por hash y revocarse por versión.
16. Los archivos se sirven mediante URLs firmadas, con expiración y control de permisos.
17. Los endpoints de colección deben paginar; no devolver todos los estudiantes, módulos o eventos sin límite.
18. Registrar auditoría para publicar, retirar, eliminar contenido, rotar códigos, añadir/quitar miembros y corregir progreso.

## 6. Matriz de autorización resumida

| Recurso | Estudiante | Docente propietario | Administrador |
|---|---:|---:|---:|
| Perfil propio | leer/editar | leer/editar | administrar |
| Aulas propias | ver/abandonar | CRUD | administrar |
| Miembros de un aula | no listar otros | CRUD/invitar | administrar |
| Módulos publicados asignados | leer/descargar | leer | administrar |
| Módulos propios | no editar | CRUD/publicar | administrar |
| Respuestas correctas | nunca | sí, en editor propio | sí |
| Asignaciones propias | leer | CRUD | administrar |
| Progreso propio | leer/escribir mediante intentos | leer de sus alumnos | administrar |
| XP/corazones/racha | no editar directamente | no editar directamente | ajustar con auditoría |
| Archivos del contenido propio | descargar/servir | subir/reemplazar | administrar |

## 7. Validaciones por tipo de actividad

- **multiple-choice:** `correctIndex` dentro del rango; mínimo dos opciones no vacías.
- **true-false:** `correctBool` obligatorio.
- **match-pairs:** mínimo dos pares; lados no vacíos; no duplicar claves ambiguas.
- **order-steps:** mínimo dos pasos; el orden guardado por el docente es la solución.
- **fill-blanks:** prompt con marcador o formato definido; al menos una respuesta válida; normalizar acentos/mayúsculas según configuración.
- **classify:** mínimo dos categorías; cada ítem debe pertenecer a una sola categoría; impedir ítems duplicados.
- Todos los tipos: `xp >= 0`, prompt y título con límites de longitud, sanitizar HTML/URLs y rechazar payloads excesivos.

## 8. Contrato de descarga y almacenamiento local

El cliente debería reemplazar `downloadedModules: TeacherModule[]` por un índice local mínimo:

```ts
DownloadedModule {
  moduleId: string
  version: number
  contentHash: string
  downloadedAt: string
  expiresAt?: string
  localPath: string
  syncState: "ready" | "stale" | "pending" | "failed"
}
```

La base local debe guardar una cola de eventos (`eventId`, payload, retries, lastError) y nunca eliminarla hasta recibir confirmación del endpoint `POST /me/sync`.

## 9. Mapeo directo del frontend actual

| Store/acción actual | Endpoint que lo reemplaza |
|---|---|
| `auth.signIn` | `POST /auth/login` |
| `auth.signUp` | `POST /auth/register` |
| `auth.updateProfile` | `PATCH /me` |
| `auth.signOut` | `POST /auth/logout` + limpiar tokens |
| `settings.setLocale` | `PATCH /me/preferences` |
| `teacher.createClassroom` | `POST /teacher/classrooms` |
| `teacher.updateClassroom` | `PATCH /teacher/classrooms/{id}` |
| `teacher.addStudentByEmail` | `POST /teacher/classrooms/{id}/invitations` |
| `teacher.addStudents` | `POST /teacher/classrooms/{id}/members` o aceptar solicitudes |
| `teacher.removeStudent` | `DELETE /teacher/classrooms/{id}/members/{studentId}` |
| `teacher.createModule` | `POST /teacher/modules` |
| `teacher.updateModule` | `PATCH /teacher/modules/{id}` |
| `teacher.addLesson` | `POST /teacher/modules/{id}/lessons` |
| `teacher.updateLesson` | `PATCH /teacher/modules/{id}/lessons/{lessonId}` |
| `teacher.addBlock` | `POST /teacher/modules/{id}/lessons/{lessonId}/blocks` |
| `teacher.updateBlock` | `PATCH /teacher/modules/{id}/lessons/{lessonId}/blocks/{blockId}` |
| `teacher.removeBlock` | `DELETE /teacher/modules/{id}/lessons/{lessonId}/blocks/{blockId}` |
| `teacher.publishModule` | `POST /teacher/modules/{id}/publish` |
| `teacher.assignModule` | `POST /teacher/assignments` |
| `student.joinClassroom` | `POST /me/classrooms/join` |
| `student.downloadModule` | `GET download-manifest` + descarga + `POST /downloads` |
| `student.removeModule` | borrar caché local + `DELETE /downloads` opcional |
| `student.recordActivity` | `POST /me/attempts/{attemptId}/blocks/{blockId}/answer` |
| `student.completeLesson` | `POST /me/attempts/{attemptId}/complete` |
| `student.restoreHearts` | `POST /me/hearts/restore` |
| `learn.saveAnswer` | respuesta online o evento `activity_answered` en `/me/sync` |
| `learn.completeLesson` | `POST /me/attempts/{attemptId}/complete` |

## 10. Requisitos operativos del backend

- PostgreSQL (o equivalente relacional) para usuarios, permisos, contenido, asignaciones y progreso.
- Almacenamiento de objetos compatible con URLs firmadas para archivos y medios.
- Cola de trabajos para emails, notificaciones push, antivirus y generación de manifests.
- Redis o equivalente para rate limiting, tokens revocados y trabajos efímeros.
- Logs estructurados con `requestId`, usuario, rol, endpoint, latencia y código de resultado.
- Métricas: latencia p95, errores 4xx/5xx, respuestas duplicadas, tamaño de descargas, eventos offline pendientes y tasa de sincronización exitosa.
- Backups automáticos, retención definida y restauración probada.
- TLS obligatorio, CORS limitado a los clientes conocidos y protección contra abuso de códigos de aula.
- Tests de autorización por cada endpoint, tests de idempotencia offline y tests de concurrencia al descontar corazones/XP.

## 11. Orden recomendado de implementación

### Fase 1 — base utilizable

1. `health`, `config`.
2. Registro, login, refresh, logout, `me` y preferencias.
3. Aulas, membresías y unión por código.
4. Módulos publicados de solo lectura.
5. Asignaciones y home del estudiante.

### Fase 2 — autoría docente

6. CRUD de módulos, lecciones y bloques.
7. Publicación/versionado.
8. Uploads y archivos.
9. Progreso resumido para docente.

### Fase 3 — aprendizaje y gamificación

10. Intentos secuenciales.
11. Evaluación de los seis tipos de actividad.
12. XP, corazones, racha, historial y repetición de lecciones.
13. Notificaciones.

### Fase 4 — offline y Comunidad

14. Manifests y URLs firmadas.
15. Cola de eventos y `/me/sync`.
16. Cambios remotos desde `syncToken`.
17. Comunidad, guardado y analítica.

## 12. Criterios de aceptación antes de conectar el frontend

- Un usuario puede cerrar y abrir la app y recuperar su sesión sin exponer el refresh token.
- Un docente crea un aula, comparte un código y un estudiante se une una sola vez.
- Un docente crea/publica un módulo con una lección de cada tipo de actividad.
- El estudiante solo recibe contenido autorizado y nunca la solución en la respuesta de lectura.
- La lección obliga a avanzar en orden y la actividad final marca la lección completa.
- Repetir una lección no borra el primer resultado ni duplica XP por accidente.
- Una respuesta incorrecta descuenta exactamente un corazón, incluso si se reintenta la petición.
- Dos dispositivos pueden sincronizar respuestas offline sin duplicar XP ni crear estados imposibles.
- Un cambio de versión del módulo invalida o actualiza el paquete offline de forma controlada.
- Un estudiante retirado del aula conserva su historial, pero deja de ver nuevas asignaciones del aula.
- Los archivos respetan permisos, hash, tamaño máximo y expiración de URL.
- Solo `es` y `en` aparecen como idiomas disponibles.
- Todos los endpoints devuelven errores con código estable y `requestId` para diagnóstico.
