// Resolución MEGC 1202/07, páginas 60–61.
// Criterio acordado: APROBADA exige aprobación de materia; CURSADA agrupa
// cursada aprobada, cursada o en curso y en curso. No se evalúan legajos.
const reglas = [
  {
    materia: "Elaboración a base de vegetales, cereales y huevos",
    cursadas: [
      "Introducción a la gastronomía",
      "Seguridad e higiene en la gastronomía",
      "Taller de primeros Auxilios",
    ],
    aprobadas: [],
  },
  {
    materia: "Elaboración a base de carnes",
    cursadas: [],
    aprobadas: ["Elaboración a base de vegetales, cereales y huevos"],
  },
  {
    materia: "Elaboración de pizzas y pastas",
    cursadas: ["Elaboraciones de panadería"],
    aprobadas: [],
  },
  { materia: "Repostería", cursadas: ["Pastelería básica"], aprobadas: [] },
  {
    materia: "Laboratorio de tecnología de los alimentos",
    cursadas: ["Elementos de química"],
    aprobadas: [],
  },
  {
    materia: "Elaboración de buffet",
    cursadas: [],
    aprobadas: [
      "Elaboración a base de vegetales, cereales y huevos",
      "Elaboración a base de carnes",
    ],
  },
  {
    materia: "Comercialización",
    cursadas: ["Introducción general a la microempresa"],
    aprobadas: ["Principios de economía"],
  },
  {
    materia: "Cocina nacional e internacional",
    cursadas: [
      "Elaboración a base de vegetales, cereales y huevos",
      "Elaboración a base de carnes",
    ],
    aprobadas: [],
  },
  {
    materia: "Compras y gestión de stock",
    cursadas: ["Elementos de administración y contabilidad"],
    aprobadas: [],
  },
  {
    materia: "Organización de eventos gastronómicos",
    cursadas: ["Compras y gestión de stock", "Servicios de catering"],
    aprobadas: [],
  },
  {
    materia: "Práctica Profesional N°1: observación organizacional",
    cursadas: [
      "Taller de comunicación escrita",
      "Introducción a la gastronomía",
    ],
    aprobadas: [],
  },
  {
    materia: "Práctica profesional N°2: organización de la producción",
    cursadas: [
      "Elaboración de buffet",
      "Elementos de administración y contabilidad",
    ],
    aprobadas: [
      "Práctica Profesional N°1: observación organizacional",
      "Elaboración a base de vegetales, cereales y huevos",
      "Elaboración a base de carnes",
    ],
  },
  {
    materia:
      "Práctica profesional N°3: diseño de emprendimientos gastronómicos",
    cursadas: ["Compras y gestión de stock"],
    aprobadas: [
      "Comercialización",
      "Herramientas de investigación",
      "Práctica Profesional N°1: observación organizacional",
      "Práctica profesional N°2: organización de la producción",
    ],
  },
];
const nota =
  "Criterio simplificado: Cursada agrupa cursada aprobada y requisitos en curso; Aprobada exige la materia aprobada. La resolución contempla además hasta un 25% en curso simultáneo para Práctica Profesional N°3. Esa condición se conserva como referencia, sin evaluación automática.";
module.exports = { reglas, nota };
