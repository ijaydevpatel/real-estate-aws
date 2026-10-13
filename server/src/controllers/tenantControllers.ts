import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { wktToGeoJSON } from "@terraformer/wkt";

const prisma = new PrismaClient();

export const getTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const tenant = await prisma.tenant.findUnique({
      where: { cognitoId },
      include: {
        favorites: true,
      },
    });

    if (tenant) {
      res.json(tenant);
    } else {
      res.status(404).json({ message: "Tenant not found" });
    }
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving tenant: ${error.message}` });
  }
};

export const createTenant = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { cognitoId, name, email, phoneNumber } = req.body;

    const tenant = await prisma.tenant.create({
      data: {
        cognitoId,
        name,
        email,
        phoneNumber,
      },
    });

    res.status(201).json(tenant);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error creating tenant: ${error.message}` });
  }
};

export const updateTenant = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const { name, email, phoneNumber } = req.body;

    const updateTenant = await prisma.tenant.update({
      where: { cognitoId },
      data: {
        name,
        email,
        phoneNumber,
      },
    });

    res.json(updateTenant);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error updating tenant: ${error.message}` });
  }
};

export const getCurrentResidences = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { cognitoId } = req.params;
    const properties = await prisma.property.findMany({
      where: { tenants: { some: { cognitoId } } },
      include: {
        location: true,
      },
    });

    const residencesWithFormattedLocation = await Promise.all(
      properties.map(async (property) => {
        const coordinates: { coordinates: string }[] =
          await prisma.$queryRaw`SELECT ST_asText(coordinates) as coordinates from "Location" where id = ${property.location.id}`;

        const geoJSON: any = wktToGeoJSON(coordinates[0]?.coordinates || "");
        const longitude = geoJSON.coordinates[0];
        const latitude = geoJSON.coordinates[1];

        return {
          ...property,
          location: {
            ...property.location,
            coordinates: {
              longitude,
              latitude,
            },
          },
        };
      })
    );

    res.json(residencesWithFormattedLocation);
  } catch (err: any) {
    res
      .status(500)
      .json({ message: `Error retrieving manager properties: ${err.message}` });
  }
};

export const addFavoriteProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { cognitoId, propertyId } = req.params;
    const tenant = await prisma.tenant.findUnique({
      where: { cognitoId },
      include: { favorites: true },
    });

    if (!tenant) {
      res.status(404).json({ message: "Tenant not found" });
      return;
    }

    const propertyIdNumber = Number(propertyId);
    const existingFavorites = tenant.favorites || [];

    if (!existingFavorites.some((fav) => fav.id === propertyIdNumber)) {
      const updatedTenant = await prisma.tenant.update({
        where: { cognitoId },
        data: {
          favorites: {
            connect: { id: propertyIdNumber },
          },
        },
        include: { favorites: true },
      });
      res.json(updatedTenant);
    } else {
      res.status(409).json({ message: "Property already added as favorite" });
    }
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error adding favorite property: ${error.message}` });
  }
};

export const removeFavoriteProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { cognitoId, propertyId } = req.params;
    const propertyIdNumber = Number(propertyId);

    const updatedTenant = await prisma.tenant.update({
      where: { cognitoId },
      data: {
        favorites: {
          disconnect: { id: propertyIdNumber },
        },
      },
      include: { favorites: true },
    });

    res.json(updatedTenant);
  } catch (err: any) {
    res
      .status(500)
      .json({ message: `Error removing favorite property: ${err.message}` });
  }
};

export const getPaymentMethod = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const cognitoId = req.params.cognitoId as string;
    if (cognitoId !== req.user?.id) {
      res.status(403).json({ message: "Not your payment method" });
      return;
    }

    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { tenantCognitoId: cognitoId },
    });

    // No card on file is a normal state, not an error.
    res.status(200).json(paymentMethod ?? null);
  } catch (error: any) {
    console.error("getPaymentMethod failed:", error);
    res
      .status(500)
      .json({ message: `Error retrieving payment method: ${error.message}` });
  }
};

export const upsertPaymentMethod = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const cognitoId = req.params.cognitoId as string;
    if (cognitoId !== req.user?.id) {
      res.status(403).json({ message: "Not your payment method" });
      return;
    }

    const { cardBrand, last4, expiryMonth, expiryYear, billingEmail } = req.body;

    // Only the last four digits are ever accepted or stored.
    const digits = String(last4 ?? "").replace(/\D/g, "").slice(-4);
    if (digits.length !== 4) {
      res.status(400).json({ message: "Enter the last 4 digits of the card" });
      return;
    }

    const month = Number(expiryMonth);
    const year = Number(expiryYear);
    if (!(month >= 1 && month <= 12)) {
      res.status(400).json({ message: "Expiry month must be between 1 and 12" });
      return;
    }
    if (!(year >= 2024 && year <= 2100)) {
      res.status(400).json({ message: "Enter a four digit expiry year" });
      return;
    }
    if (!cardBrand || !billingEmail) {
      res.status(400).json({ message: "Card brand and billing email are required" });
      return;
    }

    const data = {
      cardBrand: String(cardBrand),
      last4: digits,
      expiryMonth: month,
      expiryYear: year,
      billingEmail: String(billingEmail),
    };

    const paymentMethod = await prisma.paymentMethod.upsert({
      where: { tenantCognitoId: cognitoId },
      update: data,
      create: { ...data, tenantCognitoId: cognitoId },
    });

    res.status(200).json(paymentMethod);
  } catch (error: any) {
    console.error("upsertPaymentMethod failed:", error);
    res
      .status(500)
      .json({ message: `Error saving payment method: ${error.message}` });
  }
};
