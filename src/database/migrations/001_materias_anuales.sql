-- Solo para bases existentes que todavía no tengan esta columna.
-- El comando npm run seed:carrera -- --apply comprueba su existencia antes de aplicarla.
ALTER TABLE materias ADD COLUMN es_anual BOOLEAN NOT NULL DEFAULT FALSE AFTER cuatrimestre;
