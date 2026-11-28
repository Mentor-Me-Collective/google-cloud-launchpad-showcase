import type {
  Assignment,
  Classroom,
  Student,
  StudentStatus,
  TeacherModule,
  TeacherProfile,
} from '../types';

const FIRST_NAMES = [
  'Ana',
  'Luis',
  'Diego',
  'Sofía',
  'Valeria',
  'Mateo',
  'Camila',
  'Andrés',
  'Isabella',
  'Sebastián',
  'Daniela',
  'Emilio',
  'Lucía',
  'Gabriel',
  'Mariana',
  'Tomás',
  'Regina',
  'Nicolás',
  'Paula',
  'Joaquín',
  'Ximena',
  'Bruno',
  'Renata',
  'Iván',
];

const LAST_NAMES = ['Martínez', 'Pérez', 'Torres', 'Ramírez', 'Sánchez'];

function buildStudents(): Student[] {
  const counts = [24, 22, 22];
  const rows: Student[] = [];
  let index = 0;

  counts.forEach((count, classroomIndex) => {
    const classroomId = `c${classroomIndex + 1}`;
    for (let k = 0; k < count; k += 1, index += 1) {
      const name = `${FIRST_NAMES[index % FIRST_NAMES.length]} ${
        LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length]
      }`;
      const activeToday = index % 5 === 0 || index === 7;
      const streak = (index * 5) % 16;
      const accuracy = 58 + ((index * 13) % 41);

      let status: StudentStatus = 'on-track';
      if (streak === 0) status = 'broken-streak';
      else if (accuracy < 66) status = 'needs-help';
      else if (!activeToday && streak < 3) status = 'at-risk';

      rows.push({
        id: `s${index + 1}`,
        name,
        classroomId,
        xp: 180 + ((index * 137) % 2400),
        accuracy,
        streak,
        activeToday,
        status,
        lastActive: activeToday ? 'Hoy' : streak === 0 ? 'Hace 5 días' : index % 3 === 0 ? 'Hace 2 días' : 'Ayer',
      });
    }
  });

  return rows;
}

export const seedStudents = buildStudents();

function studentIdsFor(classroomId: string): string[] {
  return seedStudents.filter((student) => student.classroomId === classroomId).map((student) => student.id);
}

export const seedClassrooms: Classroom[] = [
  {
    id: 'c1',
    name: '6° B',
    grade: '6° grado',
    subject: 'Ciencias Naturales',
    color: '#2F6BFF',
    allowCommunity: true,
    code: 'LUM-4821',
    studentIds: studentIdsFor('c1'),
    createdAt: '2026-08-12',
  },
  {
    id: 'c2',
    name: '6° A',
    grade: '6° grado',
    subject: 'Ciencias Naturales',
    color: '#F06AA6',
    allowCommunity: true,
    code: 'LUM-3310',
    studentIds: studentIdsFor('c2'),
    createdAt: '2026-08-12',
  },
  {
    id: 'c3',
    name: '5° C',
    grade: '5° grado',
    subject: 'Ciencias Naturales',
    color: '#F5B301',
    allowCommunity: false,
    code: 'LUM-1190',
    studentIds: studentIdsFor('c3'),
    createdAt: '2026-08-12',
  },
];

export const seedModules: TeacherModule[] = [
  {
    id: 'm1',
    title: 'Misión: La célula',
    subject: 'Ciencias Naturales',
    status: 'published',
    createdAt: '2026-09-02',
    lessons: [
      {
        id: 'l1',
        title: 'Partes de la célula',
        blocks: [
          {
            id: 'b1',
            kind: 'theory',
            title: '¿Qué es una célula?',
            body:
              'La célula es la unidad más pequeña de vida. Todos los seres vivos están formados por células.\n\nCada célula tiene una membrana que la protege, un núcleo que guarda la información y organelos que cumplen funciones especiales.',
            imageDescription: 'Ilustración de una célula animal con sus partes señaladas.',
            lumiComment: 'Imagina la célula como una pequeña ciudad: cada parte tiene un trabajo.',
            attachAsSupport: true,
          },
          {
            id: 'b2',
            kind: 'material',
            title: 'Guía de la célula',
            fileName: 'Guia-de-la-celula.pdf',
            fileSize: '1.2 MB',
          },
          {
            id: 'b3',
            kind: 'activity',
            title: '¿Qué parte produce energía?',
            activityType: 'multiple-choice',
            instruction: 'Lee la pregunta y elige la respuesta correcta.',
            prompt: '¿Qué parte de la célula produce la energía?',
            options: ['Núcleo', 'Mitocondria', 'Membrana', 'Ribosoma'],
            correctIndex: 1,
            explanation: 'La mitocondria transforma los nutrientes en energía para la célula.',
            xp: 10,
            hint: 'Su nombre empieza con M.',
          },
        ],
      },
      {
        id: 'l2',
        title: 'Organelos',
        blocks: [
          {
            id: 'b4',
            kind: 'theory',
            title: 'Los organelos',
            body:
              'Los organelos son las partes especializadas de la célula. Cada uno cumple una función distinta y trabajan en equipo.\n\nEl núcleo dirige, las mitocondrias dan energía y los ribosomas construyen proteínas.',
            lumiComment: 'Piensa en ellos como los equipos de una escuela: cada uno aporta lo suyo.',
          },
          {
            id: 'b5',
            kind: 'activity',
            title: 'La mitocondria produce energía',
            activityType: 'true-false',
            instruction: 'Marca si la afirmación es verdadera o falsa.',
            prompt: 'La mitocondria produce energía para la célula.',
            correctBool: true,
            explanation: 'Sí. La mitocondria es la central energética de la célula.',
            xp: 8,
          },
          {
            id: 'b6',
            kind: 'activity',
            title: 'Une cada organelo con su función',
            activityType: 'match-pairs',
            instruction: 'Toca un concepto y luego su pareja.',
            prompt: 'Une cada organelo con su función.',
            pairs: [
              { left: 'Núcleo', right: 'Dirige la célula' },
              { left: 'Mitocondria', right: 'Produce energía' },
              { left: 'Ribosoma', right: 'Construye proteínas' },
            ],
            xp: 12,
          },
          {
            id: 'b7',
            kind: 'activity',
            title: 'Ordena el proceso',
            activityType: 'order-steps',
            instruction: 'Arrastra los pasos hasta el orden correcto.',
            prompt: 'Ordena los pasos de la respiración celular.',
            steps: ['Entra el oxígeno', 'Se transforman los nutrientes', 'Se libera energía'],
            xp: 12,
          },
          {
            id: 'b8',
            kind: 'activity',
            title: 'Completa la frase',
            activityType: 'fill-blanks',
            instruction: 'Escribe la palabra que falta.',
            prompt: 'La ___ es la central energética de la célula.',
            answers: ['mitocondria'],
            xp: 10,
          },
          {
            id: 'b9',
            kind: 'activity',
            title: 'Clasifica las partes',
            activityType: 'classify',
            instruction: 'Arrastra cada parte a su categoría.',
            prompt: 'Clasifica las partes según el tipo de célula.',
            categories: [
              { name: 'Célula animal', items: ['Núcleo', 'Mitocondria'] },
              { name: 'Célula vegetal', items: ['Cloroplasto', 'Pared celular'] },
            ],
            xp: 14,
          },
        ],
      },
    ],
  },
  {
    id: 'm2',
    title: 'El sistema solar',
    subject: 'Ciencias Naturales',
    status: 'draft',
    createdAt: '2026-10-14',
    lessons: [
      {
        id: 'l3',
        title: 'Los planetas',
        blocks: [
          {
            id: 'b10',
            kind: 'theory',
            title: 'Nuestro vecindario cósmico',
            body:
              'El sistema solar está formado por el Sol y todo lo que gira a su alrededor: planetas, lunas, asteroides y cometas.\n\nHay ocho planetas y cada uno tiene características únicas.',
            lumiComment: 'El Sol es la estrella que nos da luz y calor.',
          },
          {
            id: 'b11',
            kind: 'activity',
            title: '¿Cuál es el planeta rojo?',
            activityType: 'multiple-choice',
            instruction: 'Elige la respuesta correcta.',
            prompt: '¿Cuál es el planeta conocido como el planeta rojo?',
            options: ['Venus', 'Marte', 'Júpiter', 'Saturno'],
            correctIndex: 1,
            explanation: 'Marte se ve rojo por el óxido de hierro de su superficie.',
            xp: 10,
          },
        ],
      },
    ],
  },
  {
    id: 'm3',
    title: 'Fracciones divertidas',
    subject: 'Matemáticas',
    status: 'draft',
    createdAt: '2026-10-21',
    lessons: [
      {
        id: 'l4',
        title: '¿Qué es una fracción?',
        blocks: [
          {
            id: 'b12',
            kind: 'theory',
            title: 'Partes de un todo',
            body:
              'Una fracción representa una parte de un todo. El número de arriba es el numerador y el de abajo el denominador.\n\nSi una pizza tiene 8 porciones y comes 3, comiste 3/8 de la pizza.',
            lumiComment: 'Las fracciones están en la cocina, en el reloj y hasta en la música.',
          },
          {
            id: 'b13',
            kind: 'activity',
            title: 'Completa la fracción',
            activityType: 'fill-blanks',
            instruction: 'Escribe el número que falta.',
            prompt: 'Si divides una pizza en 4 partes iguales y tomas 1, tomas 1/___.',
            answers: ['4'],
            xp: 8,
          },
        ],
      },
    ],
  },
];

export const seedAssignments: Assignment[] = [
  {
    id: 'a1',
    moduleId: 'm1',
    classroomId: 'c1',
    studentIds: studentIdsFor('c1'),
    dueDate: '20 nov 2026',
    message: '¡Vamos a explorar la célula!',
    notify: true,
    createdAt: '2026-11-05',
  },
  {
    id: 'a2',
    moduleId: 'm1',
    classroomId: 'c2',
    studentIds: studentIdsFor('c2'),
    dueDate: '22 nov 2026',
    message: 'Repasa los organelos antes de la clase.',
    notify: true,
    createdAt: '2026-11-06',
  },
  {
    id: 'a3',
    moduleId: 'm2',
    classroomId: 'c1',
    studentIds: studentIdsFor('c1'),
    dueDate: '25 nov 2026',
    message: 'Primer vistazo al sistema solar.',
    notify: false,
    createdAt: '2026-11-08',
  },
];

export const seedProfile: TeacherProfile = {
  school: 'Colegio San Martín',
  subject: 'Ciencias Naturales',
};
