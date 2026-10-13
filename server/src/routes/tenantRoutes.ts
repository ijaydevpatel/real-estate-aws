import express from "express";
import {
  getTenant,
  createTenant,
  updateTenant,
  getCurrentResidences,
  addFavoriteProperty,
  removeFavoriteProperty,
  getPaymentMethod,
  upsertPaymentMethod,
} from "../controllers/tenantControllers";

const router = express.Router();

router.get("/:cognitoId", getTenant);
router.put("/:cognitoId", updateTenant);
router.post("/", createTenant);
router.get("/:cognitoId/current-residences", getCurrentResidences);
router.post("/:cognitoId/favorites/:propertyId", addFavoriteProperty);
router.delete("/:cognitoId/favorites/:propertyId", removeFavoriteProperty);
router.get("/:cognitoId/payment-method", getPaymentMethod);
router.put("/:cognitoId/payment-method", upsertPaymentMethod);

export default router;
