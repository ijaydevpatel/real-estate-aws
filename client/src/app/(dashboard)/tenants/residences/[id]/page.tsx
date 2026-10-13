"use client";

import Loading from "@/components/Loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useGetAuthUserQuery,
  useGetLeasesQuery,
  useGetPaymentsQuery,
  useGetPropertyQuery,
  useDownloadReceiptMutation,
  useDownloadAllReceiptsMutation,
} from "@/state/api";
import { Lease, Payment, Property } from "@/types/prismaTypes";
import {
  ArrowDownToLineIcon,
  Check,
  Download,
  FileText,
  MapPin,
  User,
} from "lucide-react";
import { useParams } from "next/navigation";
import React, { useState } from "react";
import LeaseAgreementActions from "@/components/LeaseAgreementActions";
import PaymentMethodCard from "@/components/PaymentMethodCard";
import { saveBlob } from "@/lib/download";
import Image from "next/image";


const ResidenceCard = ({
  property,
  currentLease,
}: {
  property: Property;
  currentLease: Lease;
}) => {
  const [showManager, setShowManager] = useState(false);
  const manager = (
    property as unknown as {
      manager?: { name: string; email: string; phoneNumber: string };
    }
  ).manager;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden p-6 flex-1 flex flex-col justify-between">
      {/* Header */}
      <div className="flex gap-5">
        <div className="w-64 h-32 relative rounded-xl overflow-hidden bg-slate-200">
          <Image
            src={property.photoUrls?.[0] || "/placeholder.jpg"}
            alt={property.name}
            fill
            className="object-cover"
          />
        </div>

        <div className="flex flex-col justify-between">
          <div>
            <div className="bg-green-500 w-fit text-white px-4 py-1 rounded-full text-sm font-semibold">
              Active Leases
            </div>

            <h2 className="text-2xl font-bold my-2">{property.name}</h2>
            <div className="flex items-center mb-2">
              <MapPin className="w-5 h-5 mr-1" />
              <span>
                {property.location.city}, {property.location.country}
              </span>
            </div>
          </div>
          <div className="text-xl font-bold">
            ${currentLease.rent}{" "}
            <span className="text-gray-500 text-sm font-normal">/ month</span>
          </div>
        </div>
      </div>
      {/* Dates */}
      <div>
        <hr className="my-4" />
        <div className="flex justify-between items-center">
          <div className="xl:flex">
            <div className="text-gray-500 mr-2">Start Date: </div>
            <div className="font-semibold">
              {new Date(currentLease.startDate).toLocaleDateString()}
            </div>
          </div>
          <div className="border-[0.5px] border-primary-300 h-4" />
          <div className="xl:flex">
            <div className="text-gray-500 mr-2">End Date: </div>
            <div className="font-semibold">
              {new Date(currentLease.endDate).toLocaleDateString()}
            </div>
          </div>
          <div className="border-[0.5px] border-primary-300 h-4" />
          <div className="xl:flex">
            <div className="text-gray-500 mr-2">Next Payment: </div>
            <div className="font-semibold">
              {new Date(currentLease.endDate).toLocaleDateString()}
            </div>
          </div>
        </div>
        <hr className="my-4" />
      </div>
      {/* Buttons */}
      <div className="flex justify-end gap-2 w-full">
        <button
          onClick={() => setShowManager((v) => !v)}
          className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50"
        >
          <User className="w-5 h-5 mr-2" />
          Manager
        </button>
        <LeaseAgreementActions
          leaseId={currentLease.id}
          propertyId={property.id}
          canUpload
        />
      </div>

      {showManager && (
        <div className="mt-4 border-t pt-4 text-sm">
          {manager ? (
            <>
              <p className="font-semibold mb-1">{manager.name}</p>
              <p className="text-gray-600">{manager.email}</p>
              <p className="text-gray-600">
                {manager.phoneNumber || "No phone on file"}
              </p>
            </>
          ) : (
            <p className="text-gray-500">Manager details unavailable.</p>
          )}
        </div>
      )}
    </div>
  );
};

const BillingHistory = ({
  payments,
  leaseId,
}: {
  payments: Payment[];
  leaseId: number;
}) => {
  const [downloadReceipt, { isLoading: isDownloadingOne }] =
    useDownloadReceiptMutation();
  const [downloadAll, { isLoading: isDownloadingAll }] =
    useDownloadAllReceiptsMutation();

  const handleOne = async (paymentId: number) => {
    try {
      const blob = await downloadReceipt({ leaseId, paymentId }).unwrap();
      saveBlob(blob, `receipt-${paymentId}.pdf`);
    } catch {
      // the mutation surfaces its own toast
    }
  };

  const handleAll = async () => {
    try {
      const blob = await downloadAll(leaseId).unwrap();
      saveBlob(blob, `receipts-lease-${leaseId}.zip`);
    } catch {
      // the mutation surfaces its own toast
    }
  };

  return (
    <div className="mt-8 bg-white rounded-xl shadow-md overflow-hidden p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold mb-1">Billing History</h2>
          <p className="text-sm text-gray-500">
            Download your previous plan receipts and usage details.
          </p>
        </div>
        <div>
          <button
            onClick={handleAll}
            disabled={isDownloadingAll || payments.length === 0}
            className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5 mr-2" />
            <span>{isDownloadingAll ? "Preparing..." : "Download All"}</span>
          </button>
        </div>
      </div>
      <hr className="mt-4 mb-1" />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Billing Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id} className="h-16">
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Invoice #{payment.id} -{" "}
                    {new Date(payment.paymentDate).toLocaleString("default", {
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold border ${
                      payment.paymentStatus === "Paid"
                        ? "bg-green-100 text-green-800 border-green-300"
                        : "bg-yellow-100 text-yellow-800 border-yellow-300"
                    }`}
                  >
                    {payment.paymentStatus === "Paid" ? (
                      <Check className="w-4 h-4 inline-block mr-1" />
                    ) : null}
                    {payment.paymentStatus}
                  </span>
                </TableCell>
                <TableCell>
                  {new Date(payment.paymentDate).toLocaleDateString()}
                </TableCell>
                <TableCell>${payment.amountPaid.toFixed(2)}</TableCell>
                <TableCell>
                  <button
                    onClick={() => handleOne(payment.id)}
                    disabled={isDownloadingOne}
                    className="border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center font-semibold hover:bg-primary-700 hover:text-primary-50 disabled:opacity-50"
                  >
                    <ArrowDownToLineIcon className="w-4 h-4 mr-1" />
                    Download
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const Residence = () => {
  const { id } = useParams();
  const { data: authUser } = useGetAuthUserQuery();
  const {
    data: property,
    isLoading: propertyLoading,
    error: propertyError,
  } = useGetPropertyQuery(Number(id));

  const { data: leases, isLoading: leasesLoading } = useGetLeasesQuery(
    parseInt(authUser?.cognitoInfo?.userId || "0"),
    { skip: !authUser?.cognitoInfo?.userId }
  );
  // The lease for THIS property, not whichever lease happens to be first.
  const currentLease = leases?.find(
    (lease) => lease.propertyId === Number(id)
  );

  const { data: payments, isLoading: paymentsLoading } = useGetPaymentsQuery(
    currentLease?.id || 0,
    { skip: !currentLease?.id }
  );

  if (propertyLoading || leasesLoading || paymentsLoading) return <Loading />;
  if (!property || propertyError) return <div>Error loading property</div>;

  return (
    <div className="dashboard-container">
      <div className="w-full mx-auto">
        <div className="md:flex gap-10">
          {currentLease && (
            <ResidenceCard property={property} currentLease={currentLease} />
          )}
          <PaymentMethodCard
            cognitoId={authUser?.cognitoInfo?.userId || ""}
          />
        </div>
        {currentLease ? (
          <BillingHistory
            payments={payments || []}
            leaseId={currentLease.id}
          />
        ) : (
          <p className="mt-8 text-gray-500">
            You do not have a lease on this property.
          </p>
        )}
      </div>
    </div>
  );
};

export default Residence;
