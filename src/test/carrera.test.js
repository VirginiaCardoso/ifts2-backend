const { randomUUID } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const mysql = require("mysql2/promise");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nombreDb = `ifts_carrera_test_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
process.env.DB_NAME = nombreDb;
const app = require("../index");
const { promisePool: db } = require("../config/db");
const pdf = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF",
);

describe("Carrera en base temporal aislada", () => {
  let servidor, admin, gestion, profesor1, profesor2;
  const materias = [];
  const auth = (token = admin) => ({ Authorization: `Bearer ${token}` });
  const nueva = (nombre = "Materia de prueba") => ({
    nombre,
    anio_carrera: 1,
    cuatrimestre: 1,
    es_promocional: false,
    profesores_ids: [],
  });
  async function crear(body = nueva(), token = admin) {
    const res = await request(app)
      .post("/api/materias")
      .set(auth(token))
      .send(body);
    expect(res.status).toBe(201);
    return res.body.materiaId;
  }
  beforeAll(async () => {
    servidor = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true,
    });
    const esquema = (
      await fs.readFile(
        path.resolve(__dirname, "../database/ifts2-db.sql"),
        "utf8",
      )
    ).replaceAll("sistema_academico", nombreDb);
    await servidor.query(esquema);
    const hash = await bcrypt.hash("PruebaCarrera123", 4);
    await db.query(
      "INSERT INTO usuarios (nombre_completo, nivel_de_acceso, correo, password_hash) VALUES ?",
      [
        [
          [
            "Admin prueba",
            "Administrador General",
            "admin@prueba.invalid",
            hash,
          ],
          [
            "Gestión prueba",
            "Gestión Académica",
            "gestion@prueba.invalid",
            hash,
          ],
        ],
      ],
    );
    const login = async (correo) => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ correo, password: "PruebaCarrera123" });
      expect(res.status).toBe(200);
      return res.body.token;
    };
    admin = await login("admin@prueba.invalid");
    gestion = await login("gestion@prueba.invalid");
    const [p1] = await db.query(
      "INSERT INTO profesores (nombre_completo) VALUES ('Docente titular')",
    );
    profesor1 = p1.insertId;
    const [p2] = await db.query(
      "INSERT INTO profesores (nombre_completo) VALUES ('Docente ayudante')",
    );
    profesor2 = p2.insertId;
    for (const nombre of ["Base", "Intermedia", "Avanzada"])
      materias.push(await crear(nueva(nombre)));
  });
  afterAll(async () => {
    try {
      const [rows] = await db.query(
        "SELECT valor_texto FROM configuracion_institucional WHERE clave LIKE 'carrera.pdf.%'",
      );
      for (const row of rows) {
        const { archivo } = JSON.parse(row.valor_texto);
        if (/^[a-f0-9-]{36}\.pdf$/.test(archivo))
          await fs
            .unlink(path.resolve(__dirname, "../../uploads/carrera", archivo))
            .catch(() => {});
      }
    } finally {
      await db.end();
      if (servidor) {
        if (!/^ifts_carrera_test_[a-f0-9]{12}$/.test(nombreDb))
          throw new Error("Nombre de base temporal inseguro");
        await servidor.query(`DROP DATABASE IF EXISTS \`${nombreDb}\``);
        await servidor.end();
      }
    }
  });
  test.each(["admin", "gestion"])(
    "CRUD de materias con %s y lectura compatible con otros módulos",
    async (rol) => {
      const token = rol === "admin" ? admin : gestion;
      const id = await crear(
        { ...nueva("  Materia nueva  "), profesores_ids: [profesor1] },
        token,
      );
      let res = await request(app).get(`/api/materias/${id}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        nombre: "Materia nueva",
        anio_carrera: "1",
        cuatrimestre: 1,
        es_promocional: false,
        profesores_ids: [profesor1],
      });
      expect(
        (await request(app).get("/api/materias")).body.some((m) => m.id === id),
      ).toBe(true);
      expect(
        (
          await request(app)
            .put(`/api/materias/${id}`)
            .set(auth(token))
            .send({
              ...nueva("Actualizada"),
              anio_carrera: 2,
              cuatrimestre: 2,
              profesores_ids: [profesor1],
            })
        ).status,
      ).toBe(200);
      expect(
        (
          await request(app)
            .patch(`/api/materias/${id}/promocional`)
            .set(auth(token))
            .send({ es_promocional: true })
        ).status,
      ).toBe(200);
      const bloqueo = await request(app)
        .delete(`/api/materias/${id}`)
        .set(auth(token));
      expect(bloqueo.status).toBe(409);
      expect(bloqueo.body.asociaciones.docentes).toBe(1);
      expect(
        (
          await request(app)
            .put(`/api/materias/${id}/profesores`)
            .set(auth(token))
            .send({ profesores_ids: [] })
        ).status,
      ).toBe(200);
      const [rows] = await db.query(
        "SELECT nombre, es_promocional, anio_carrera, cuatrimestre FROM materias WHERE id = ?",
        [id],
      );
      expect(rows[0]).toMatchObject({
        nombre: "Actualizada",
        es_promocional: 1,
        anio_carrera: "2",
        cuatrimestre: 2,
      });
      expect(
        (await request(app).delete(`/api/materias/${id}`).set(auth(token)))
          .status,
      ).toBe(200);
      expect((await request(app).get(`/api/materias/${id}`)).status).toBe(404);
    },
  );
  test("preserva el rol ayudante y revierte modificaciones con docentes inexistentes", async () => {
    const id = materias[0];
    await db.query(
      "INSERT INTO profesor_materia (profesor_id, materia_id, rol) VALUES (?, ?, 'ayudante')",
      [profesor2, id],
    );
    expect(
      (
        await request(app)
          .put(`/api/materias/${id}/profesores`)
          .set(auth())
          .send({ profesores_ids: [profesor1, profesor2] })
      ).status,
    ).toBe(200);
    const [roles] = await db.query(
      "SELECT rol FROM profesor_materia WHERE profesor_id = ? AND materia_id = ?",
      [profesor2, id],
    );
    expect(roles[0].rol).toBe("ayudante");
    expect(
      (
        await request(app)
          .put(`/api/materias/${id}`)
          .set(auth())
          .send({ ...nueva("No guardar"), profesores_ids: [2147483647] })
      ).status,
    ).toBe(400);
    expect((await request(app).get(`/api/materias/${id}`)).body.nombre).toBe(
      "Base",
    );
    await request(app)
      .put(`/api/materias/${id}/profesores`)
      .set(auth())
      .send({ profesores_ids: [] });
  });
  test("crea, edita y elimina reglas sin cambiar su materia, sin duplicados ni ciclos", async () => {
    const [a, b, d] = materias;
    expect(
      (
        await request(app)
          .post("/api/carrera/correlatividades")
          .set(auth(gestion))
          .send({ materia_id: b, cursadas: [a], aprobadas: [] })
      ).status,
    ).toBe(201);
    expect(
      (
        await request(app)
          .put(`/api/carrera/correlatividades/${b}`)
          .set(auth())
          .send({ materia_id: b, cursadas: [], aprobadas: [d] })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post("/api/carrera/correlatividades")
          .set(auth())
          .send({ materia_id: d, cursadas: [b], aprobadas: [] })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .put(`/api/carrera/correlatividades/${b}`)
          .set(auth())
          .send({ materia_id: d, cursadas: [a], aprobadas: [] })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post("/api/carrera/correlatividades")
          .set(auth())
          .send({ materia_id: b, cursadas: [a], aprobadas: [] })
      ).status,
    ).toBe(409);
    const snapshot = (await request(app).get("/api/carrera")).body;
    expect(snapshot.correlatividades).toEqual([
      expect.objectContaining({
        materia_id: b,
        cursadas: [],
        aprobadas: [{ id: d, nombre: "Avanzada" }],
      }),
    ]);
    const bloqueo = await request(app).delete(`/api/materias/${d}`).set(auth());
    expect(bloqueo.status).toBe(409);
    expect(bloqueo.body.asociaciones.correlatividades).toBe(1);
    expect(
      (
        await request(app)
          .delete(`/api/carrera/correlatividades/${b}`)
          .set(auth())
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .delete(`/api/carrera/correlatividades/${b}`)
          .set(auth())
      ).status,
    ).toBe(404);
    expect((await request(app).get(`/api/materias/${b}`)).status).toBe(200);
  });
  test("bloquea eliminar por horarios y mesas sin borrar sus registros", async () => {
    const id = materias[1];
    const [h] = await db.query(
      "INSERT INTO horarios_cursada (dia_semana, hora_inicio, hora_fin, cuatrimestre, anio, materia_id) VALUES ('Lunes', '18:00', '20:00', 1, 2027, ?)",
      [id],
    );
    const [m] = await db.query(
      "INSERT INTO mesas_examenes (materia_id, periodo, fecha, hora, anio_vigencia) VALUES (?, 'Marzo', '2027-03-03', '18:00', 2027)",
      [id],
    );
    const res = await request(app).delete(`/api/materias/${id}`).set(auth());
    expect(res.status).toBe(409);
    expect(res.body.asociaciones).toMatchObject({ mesas: 1, horarios: 1 });
    const [rows] = await db.query(
      "SELECT id FROM horarios_cursada WHERE id = ?",
      [h.insertId],
    );
    expect(rows).toHaveLength(1);
    await db.query("DELETE FROM horarios_cursada WHERE id = ?", [h.insertId]);
    await db.query("DELETE FROM mesas_examenes WHERE id = ?", [m.insertId]);
  });
  test("valida materias y reglas sin dejar registros parciales", async () => {
    for (const body of [
      {},
      { ...nueva(), nombre: "" },
      { ...nueva(), nombre: "a".repeat(256) },
      { ...nueva(), anio_carrera: 4 },
      { ...nueva(), cuatrimestre: 3 },
      { ...nueva(), es_promocional: 1 },
      { ...nueva(), profesores_ids: [profesor1, profesor1] },
    ])
      expect(
        (await request(app).post("/api/materias").set(auth()).send(body))
          .status,
      ).toBe(400);
    for (const body of [
      { materia_id: materias[0], cursadas: [], aprobadas: [] },
      { materia_id: materias[0], cursadas: [materias[0]], aprobadas: [] },
      {
        materia_id: materias[0],
        cursadas: [materias[1]],
        aprobadas: [materias[1]],
      },
      { materia_id: materias[0], cursadas: [2147483647], aprobadas: [] },
    ])
      expect(
        (
          await request(app)
            .post("/api/carrera/correlatividades")
            .set(auth())
            .send(body)
        ).status,
      ).toBe(400);
    expect(
      (
        await request(app)
          .patch(`/api/materias/${materias[0]}/promocional`)
          .set(auth())
          .send({ es_promocional: "true" })
      ).status,
    ).toBe(400);
    expect((await request(app).get("/api/materias/abc")).status).toBe(400);
  });
  test("el aviso y los tres PDF se guardan, consultan, reemplazan y eliminan", async () => {
    expect(
      (
        await request(app)
          .put("/api/carrera/aviso")
          .set(auth(gestion))
          .send({ aviso: "Cambio no autorizado" })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .put("/api/carrera/aviso")
          .set(auth(admin))
          .send({ aviso: "Ciclo 2027: Inscripciones abiertas" })
      ).status,
    ).toBe(200);
    expect((await request(app).get("/api/carrera")).body.aviso).toBe(
      "Ciclo 2027: Inscripciones abiertas",
    );
    for (const tipo of ["resolucion", "promocionables", "correlatividades"]) {
      const url = `/api/carrera/documentos/${tipo}`;
      expect(
        (
          await request(app)
            .put(url)
            .set(auth(gestion))
            .set("Content-Type", "application/pdf")
            .set("X-File-Name", "prueba.pdf")
            .send(pdf)
        ).status,
      ).toBe(200);
      const descarga = await request(app).get(`${url}/archivo`);
      expect(descarga.status).toBe(200);
      expect(descarga.headers["content-type"]).toContain("application/pdf");
      expect(descarga.body.equals(pdf)).toBe(true);
      expect(descarga.headers["content-disposition"]).toMatch(/^inline;/);
      const archivoDescargado = await request(app).get(
        `${url}/archivo?descargar=1`,
      );
      expect(archivoDescargado.status).toBe(200);
      expect(archivoDescargado.headers["content-disposition"]).toMatch(
        /^attachment;/,
      );
      expect(archivoDescargado.headers["content-disposition"]).toContain(
        "prueba.pdf",
      );
      expect(archivoDescargado.body.equals(pdf)).toBe(true);
      expect(
        (
          await request(app)
            .put(url)
            .set(auth(gestion))
            .set("Content-Type", "application/pdf")
            .set("X-File-Name", "reemplazo.pdf")
            .send(pdf)
        ).status,
      ).toBe(200);
      expect(
        (await request(app).get("/api/carrera")).body.documentos[tipo].nombre,
      ).toBe("reemplazo.pdf");
      expect((await request(app).delete(url).set(auth(gestion))).status).toBe(200);
      expect((await request(app).get(`${url}/archivo`)).status).toBe(404);
    }
    expect(
      (
        await request(app)
          .put("/api/carrera/documentos/resolucion")
          .set(auth())
          .set("Content-Type", "application/pdf")
          .send(Buffer.from("No es PDF"))
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .put("/api/carrera/documentos/resolucion")
          .set(auth())
          .set("Content-Type", "application/pdf")
          .set("X-File-Name", "archivo.exe")
          .send(pdf)
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .put("/api/carrera/documentos/resolucion")
          .set(auth())
          .set("Content-Type", "application/pdf")
          .send(Buffer.alloc(10 * 1024 * 1024 + 1))
      ).status,
    ).toBe(413);
    expect(
      (await request(app).get("/api/carrera/documentos/otro/archivo")).status,
    ).toBe(400);
  });
  test("rechaza todas las escrituras sin token o con rol no autorizado", async () => {
    const sinRol = jwt.sign(
      { id: 1, nivel_de_acceso: "Otro" },
      process.env.JWT_SECRET,
      { expiresIn: "1m" },
    );
    const rutas = [
      ["post", "/api/materias"],
      ["put", `/api/materias/${materias[0]}`],
      ["delete", `/api/materias/${materias[0]}`],
      ["patch", `/api/materias/${materias[0]}/promocional`],
      ["put", `/api/materias/${materias[0]}/profesores`],
      ["post", "/api/carrera/correlatividades"],
      ["put", `/api/carrera/correlatividades/${materias[0]}`],
      ["delete", `/api/carrera/correlatividades/${materias[0]}`],
      ["put", "/api/carrera/aviso"],
      ["put", "/api/carrera/documentos/resolucion"],
      ["delete", "/api/carrera/documentos/resolucion"],
    ];
    for (const [token, status] of [
      [null, 401],
      [sinRol, 403],
    ])
      for (const [metodo, ruta] of rutas) {
        const req = request(app)[metodo](ruta);
        if (token) req.set(auth(token));
        expect((await req.send(nueva())).status).toBe(status);
      }
  });
  test("revierte una edición de regla cuando falla el insert", async () => {
    const [a, b, d] = materias;
    await request(app)
      .post("/api/carrera/correlatividades")
      .set(auth())
      .send({ materia_id: b, cursadas: [a], aprobadas: [] });
    const conn = await db.getConnection();
    const original = conn.query.bind(conn);
    const querySpy = jest
      .spyOn(conn, "query")
      .mockImplementation((sql, args) =>
        sql.startsWith("INSERT INTO correlatividades")
          ? Promise.reject(new Error("Falla simulada"))
          : original(sql, args),
      );
    const connectionSpy = jest
      .spyOn(db, "getConnection")
      .mockResolvedValueOnce(conn);
    const logSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(
        (
          await request(app)
            .put(`/api/carrera/correlatividades/${b}`)
            .set(auth())
            .send({ materia_id: b, cursadas: [], aprobadas: [d] })
        ).status,
      ).toBe(500);
    } finally {
      querySpy.mockRestore();
      connectionSpy.mockRestore();
      logSpy.mockRestore();
    }
    const [rows] = await db.query(
      "SELECT materia_requisito_id, tipo_requisito FROM correlatividades WHERE materia_id = ?",
      [b],
    );
    expect(rows).toEqual([
      { materia_requisito_id: a, tipo_requisito: "CURSADA" },
    ]);
  });
  test("admite materias anuales y rechaza combinaciones inconsistentes", async () => {
    const body = {
      ...nueva("Anual de prueba"),
      es_anual: true,
      cuatrimestre: null,
    };
    const id = await crear(body);
    const lectura = await request(app).get(`/api/materias/${id}`);
    expect(lectura.body).toMatchObject({ es_anual: true, cuatrimestre: null });
    for (const cambios of [
      { es_anual: true, cuatrimestre: 1 },
      { es_anual: false, cuatrimestre: null },
      { es_anual: "true", cuatrimestre: null },
    ]) {
      expect(
        (
          await request(app)
            .post("/api/materias")
            .set(auth())
            .send({ ...nueva(), ...cambios })
        ).status,
      ).toBe(400);
    }
    expect(
      (
        await request(app)
          .put(`/api/materias/${id}`)
          .set(auth())
          .send({ ...nueva("Cuatrimestral"), es_anual: false, cuatrimestre: 2 })
      ).status,
    ).toBe(200);
    expect(
      (await request(app).delete(`/api/materias/${id}`).set(auth())).status,
    ).toBe(200);
  });
  test("el seed migra una base previa, preserva relaciones y puede repetirse sin duplicar", async () => {
    const { cargar, planificar } = require("../database/seed-carrera");
    const { materias: oficiales } = require("../database/carrera-data");
    expect(oficiales).toHaveLength(37);
    expect(oficiales.filter((m) => m.es_promocional)).toHaveLength(14);
    expect(oficiales.filter((m) => m.es_anual)).toHaveLength(2);
    const id = await crear({
      ...nueva("Seguridad e Higiene en la Gastronomía"),
      es_promocional: true,
      profesores_ids: [profesor1],
    });
    await db.query("ALTER TABLE materias DROP COLUMN es_anual");
    const conn = await db.getConnection();
    try {
      const preview = await cargar(conn);
      expect(preview.requiere_migracion).toBe(true);
      expect(preview.acciones.filter((a) => a.accion === "crear")).toHaveLength(
        36,
      );
      const [antes] = await conn.query("SELECT COUNT(*) AS n FROM materias");
      await cargar(conn, { aplicar: true });
      const [despues] = await conn.query("SELECT COUNT(*) AS n FROM materias");
      expect(despues[0].n - antes[0].n).toBe(36);
      const segundo = await cargar(conn, { aplicar: true });
      expect(segundo.acciones.every((a) => a.accion === "conservar")).toBe(
        true,
      );
      const [repetido] = await conn.query("SELECT COUNT(*) AS n FROM materias");
      expect(repetido[0].n).toBe(despues[0].n);
      const [existente] = await conn.query(
        "SELECT id, es_anual, es_promocional, cuatrimestre FROM materias WHERE id = ?",
        [id],
      );
      expect(existente[0]).toMatchObject({
        id,
        es_anual: 1,
        es_promocional: 0,
        cuatrimestre: null,
      });
      const [vinculos] = await conn.query(
        "SELECT profesor_id FROM profesor_materia WHERE materia_id = ?",
        [id],
      );
      expect(vinculos).toEqual([{ profesor_id: profesor1 }]);
      const [reglas] = await conn.query(
        "SELECT COUNT(*) AS n FROM correlatividades",
      );
      expect(reglas[0].n).toBe(1);
      expect(() =>
        planificar([
          { nombre: oficiales[0].nombre },
          { nombre: oficiales[0].nombre.toUpperCase() },
        ]),
      ).toThrow(/más de una/);
    } finally {
      conn.release();
    }
  });
  test("carga las 13 reglas simplificadas sin duplicarlas ni sobrescribir reglas diferentes", async () => {
    const {
      cargarCorrelatividades,
    } = require("../database/seed-correlatividades");
    const conn = await db.getConnection();
    try {
      const preview = await cargarCorrelatividades(conn);
      expect(preview.acciones).toHaveLength(13);
      expect(preview.acciones.every((a) => a.accion === "crear")).toBe(true);
      const [antes] = await conn.query(
        "SELECT COUNT(*) AS n FROM correlatividades",
      );
      await cargarCorrelatividades(conn, { aplicar: true });
      const [despues] = await conn.query(
        "SELECT COUNT(*) AS n FROM correlatividades",
      );
      expect(despues[0].n - antes[0].n).toBe(28);
      const repetida = await cargarCorrelatividades(conn, { aplicar: true });
      expect(repetida.acciones.every((a) => a.accion === "conservar")).toBe(
        true,
      );
      const carrera = (await request(app).get("/api/carrera")).body;
      expect(carrera.nota_correlatividades).toContain("25%");
      const carnes = carrera.correlatividades.find(
        (r) => r.materia_nombre === "Elaboración a base de carnes",
      );
      expect(carnes.cursadas).toHaveLength(0);
      expect(carnes.aprobadas).toHaveLength(1);
      const reposteria = carrera.correlatividades.find(
        (r) => r.materia_nombre === "Repostería",
      );
      expect(reposteria.cursadas[0].nombre).toBe("Pastelería básica");
      expect(reposteria.aprobadas).toHaveLength(0);
      const primera = carrera.correlatividades.find((r) =>
        r.materia_nombre.includes("N°1"),
      );
      expect(
        primera.cursadas.some(
          (m) => m.nombre === "Taller de comunicación escrita",
        ),
      ).toBe(true);
      await conn.query(
        "UPDATE correlatividades SET tipo_requisito = 'CURSADA' WHERE materia_id = ?",
        [carnes.materia_id],
      );
      await expect(
        cargarCorrelatividades(conn, { aplicar: true }),
      ).rejects.toThrow(/ya tiene una regla diferente/);
      const [requisitos] = await conn.query(
        "SELECT tipo_requisito FROM correlatividades WHERE materia_id = ?",
        [carnes.materia_id],
      );
      expect(requisitos[0].tipo_requisito).toBe("CURSADA");
      const [final] = await conn.query(
        "SELECT COUNT(*) AS n FROM correlatividades",
      );
      expect(final[0].n).toBe(despues[0].n);
    } finally {
      conn.release();
    }
  });
});
