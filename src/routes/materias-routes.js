const router = require("express").Router();
const {
  verificarToken,
  verificarRol,
} = require("../middleware/auth-middleware");
const c = require("../controllers/carrera-controller");
router.get("/", c.obtenerMaterias);
router.get("/:id", c.obtenerMaterias);
router.use(
  verificarToken,
  verificarRol(["Administrador General", "Gestión Académica"]),
);
router.post("/", c.guardarMateria);
router.put("/:id", c.guardarMateria);
router.patch("/:id/promocional", c.guardarPromocional);
router.put("/:id/profesores", c.guardarProfesores);
router.delete("/:id", c.eliminarMateria);
module.exports = router;
