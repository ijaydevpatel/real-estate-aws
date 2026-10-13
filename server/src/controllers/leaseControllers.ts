import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const prisma = new PrismaClient();

const s3Client = new S3Client({ region: process.env.AWS_REGION });

// Returns the lease plus who is allowed to touch its agreement.
const loadLeaseForUser = async (leaseId: number) =>
  prisma.lease.findUnique({
    where: { id: leaseId },
    select: {
      id: true,
      agreementUrl: true,
      tenantCognitoId: true,
      property: { select: { managerCognitoId: true } },
    },
  });

export const getLeases = async (req: Request, res: Response): Promise<void> => {
  try {
    const leases = await prisma.lease.findMany({
      include: {
        tenant: true,
        property: true,
      },
    });
    res.json(leases);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving leases: ${error.message}` });
  }
};

export const getLeasePayments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const payments = await prisma.payment.findMany({
      where: { leaseId: Number(id) },
    });
    res.json(payments);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving lease payments: ${error.message}` });
  }
};

export const getPropertyLeases = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const leases = await prisma.lease.findMany({
      where: { propertyId: Number(id) },
      include: {
        tenant: true,
      },
    });
    res.json(leases);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error retrieving property leases: ${error.message}` });
  }
};

export const uploadLeaseAgreement = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const leaseId = Number(req.params.id);
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      res.status(400).json({ message: "No agreement file was uploaded" });
      return;
    }

    const lease = await loadLeaseForUser(leaseId);
    if (!lease) {
      res.status(404).json({ message: "Lease not found" });
      return;
    }
    if (lease.property.managerCognitoId !== req.user?.id) {
      res
        .status(403)
        .json({ message: "You do not manage the property for this lease" });
      return;
    }

    const key = `agreements/${leaseId}-${Date.now()}-${file.originalname}`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    const updated = await prisma.lease.update({
      where: { id: leaseId },
      data: { agreementUrl: key },
      select: { id: true, agreementUrl: true },
    });

    res.status(200).json(updated);
  } catch (error: any) {
    console.error("uploadLeaseAgreement failed:", error);
    res
      .status(500)
      .json({ message: `Error uploading agreement: ${error.message}` });
  }
};

export const getLeaseAgreementUrl = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const leaseId = Number(req.params.id);
    const lease = await loadLeaseForUser(leaseId);

    if (!lease) {
      res.status(404).json({ message: "Lease not found" });
      return;
    }

    const isManager = lease.property.managerCognitoId === req.user?.id;
    const isTenant = lease.tenantCognitoId === req.user?.id;
    if (!isManager && !isTenant) {
      res.status(403).json({ message: "Not your lease" });
      return;
    }

    if (!lease.agreementUrl) {
      res
        .status(404)
        .json({ message: "No agreement has been uploaded for this lease" });
      return;
    }

    // Short lived link so the object itself stays private in S3.
    const downloadUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: lease.agreementUrl,
      }),
      { expiresIn: 300 }
    );

    res.status(200).json({ downloadUrl });
  } catch (error: any) {
    console.error("getLeaseAgreementUrl failed:", error);
    res
      .status(500)
      .json({ message: `Error fetching agreement: ${error.message}` });
  }
};
