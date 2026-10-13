import express from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getLeaseAgreementUrl,
  getLeasePayments,
  getLeases,
  uploadLeaseAgreement,
  downloadPaymentReceipt,
  downloadAllReceipts,
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

router.get(
  "/:id/receipts",
  authMiddleware(["manager", "tenant"]),
  downloadAllReceipts
);
router.get(
  "/:id/payments/:paymentId/receipt",
  authMiddleware(["manager", "tenant"]),
  downloadPaymentReceipt
);

export default router;
