const express = require("express");
const {
  verificarToken,
  verificarRol,
} = require("../middleware/auth-middleware");
const c = require("../controllers/carrera-controller");
const router = express.Router();
router.get("/", c.obtenerCarrera);
router.get("/documentos/:tipo/archivo", c.obtenerPdf);
router.use(
  verificarToken,
  verificarRol(["Administrador General", "Gestión Académica"]),
);
router.put("/aviso", c.guardarAviso);
router.post("/correlatividades", c.guardarRegla);
router.put("/correlatividades/:id", c.guardarRegla);
router.delete("/correlatividades/:id", c.eliminarRegla);
router.put(
  "/documentos/:tipo",
  express.raw({ type: "application/pdf", limit: "10mb" }),
  c.guardarPdf,
);
router.delete("/documentos/:tipo", c.eliminarPdf);
router.use((err, req, res, next) => {
  if (err.type === "entity.too.large")
    return res
      .status(413)
      .json({ error: "El PDF no puede superar los 10 MB." });
  next(err);
});
module.exports = router;
