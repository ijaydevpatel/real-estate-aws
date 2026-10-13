import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import archiver from "archiver";
import { buildReceiptPdf, ReceiptData } from "../lib/receipts";

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
    const isManager = lease.property.managerCognitoId === req.user?.id;
    const isTenant = lease.tenantCognitoId === req.user?.id;
    if (!isManager && !isTenant) {
      res.status(403).json({ message: "Not your lease" });
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

// Pulls everything a receipt needs for one lease, newest payment first.
const loadReceiptRows = async (leaseId: number) =>
  prisma.payment.findMany({
    where: { leaseId },
    orderBy: { dueDate: "desc" },
    include: {
      lease: {
        select: {
          tenantCognitoId: true,
          tenant: { select: { name: true, email: true } },
          property: {
            select: {
              managerCognitoId: true,
              name: true,
              location: {
                select: { address: true, city: true, country: true },
              },
            },
          },
        },
      },
    },
  });

type ReceiptRow = Awaited<ReturnType<typeof loadReceiptRows>>[number];

const toReceiptData = (p: ReceiptRow): ReceiptData => ({
  paymentId: p.id,
  amountDue: p.amountDue,
  amountPaid: p.amountPaid,
  dueDate: p.dueDate,
  paymentDate: p.paymentDate,
  paymentStatus: String(p.paymentStatus),
  propertyName: p.lease.property.name,
  propertyAddress: [
    p.lease.property.location.address,
    p.lease.property.location.city,
    p.lease.property.location.country,
  ]
    .filter(Boolean)
    .join(", "),
  tenantName: p.lease.tenant.name,
  tenantEmail: p.lease.tenant.email,
});

const maySeeLease = (row: ReceiptRow, userId?: string) =>
  row.lease.tenantCognitoId === userId ||
  row.lease.property.managerCognitoId === userId;

export const downloadPaymentReceipt = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const leaseId = Number(req.params.id);
    const paymentId = Number(req.params.paymentId);

    const rows = await loadReceiptRows(leaseId);
    const row = rows.find((r) => r.id === paymentId);

    if (!row) {
      res.status(404).json({ message: "Payment not found" });
      return;
    }
    if (!maySeeLease(row, req.user?.id)) {
      res.status(403).json({ message: "Not your lease" });
      return;
    }

    const pdf = await buildReceiptPdf(toReceiptData(row));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="receipt-${paymentId}.pdf"`
    );
    res.send(pdf);
  } catch (error: any) {
    console.error("downloadPaymentReceipt failed:", error);
    res
      .status(500)
      .json({ message: `Error building receipt: ${error.message}` });
  }
};

export const downloadAllReceipts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const leaseId = Number(req.params.id);
    const rows = await loadReceiptRows(leaseId);

    if (rows.length === 0) {
      res.status(404).json({ message: "No payments to download" });
      return;
    }
    if (!maySeeLease(rows[0], req.user?.id)) {
      res.status(403).json({ message: "Not your lease" });
      return;
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="receipts-lease-${leaseId}.zip"`
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => {
      console.error("archive failed:", err);
      res.destroy(err);
    });
    archive.pipe(res);

    for (const row of rows) {
      const pdf = await buildReceiptPdf(toReceiptData(row));
      archive.append(pdf, { name: `receipt-${row.id}.pdf` });
    }

    await archive.finalize();
  } catch (error: any) {
    console.error("downloadAllReceipts failed:", error);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ message: `Error building receipts: ${error.message}` });
    }
  }
};
