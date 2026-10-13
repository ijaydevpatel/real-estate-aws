import express from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getLeaseAgreementUrl,
  getLeasePayments,
  getLeases,
  uploadLeaseAgreement,
} from "../controllers/leaseControllers";

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.get("/", authMiddleware(["manager", "tenant"]), getLeases);
router.get(
  "/:id/payments",
  authMiddleware(["manager", "tenant"]),
  getLeasePayments
);
router.get(
  "/:id/agreement",
  authMiddleware(["manager", "tenant"]),
  getLeaseAgreementUrl
);
router.post(
  "/:id/agreement",
  authMiddleware(["manager", "tenant"]),
  upload.single("agreement"),
  uploadLeaseAgreement
);

export default router;
