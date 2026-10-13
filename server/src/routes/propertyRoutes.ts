import express from "express";
import {
  getProperties,
  getProperty,
  createProperty,
  deleteProperty,
} from "../controllers/propertyControllers";
import multer from "multer";
import { authMiddleware } from "../middleware/authMiddleware";
import { getPropertyLeases } from "../controllers/leaseControllers";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

router.get("/", getProperties);
router.get("/:id", getProperty);
router.get(
  "/:id/leases",
  authMiddleware(["manager", "tenant"]),
  getPropertyLeases
);
router.post(
  "/",
  authMiddleware(["manager"]),
  upload.array("photos"),
  createProperty
);
router.delete("/:id", authMiddleware(["manager"]), deleteProperty);

export default router;
