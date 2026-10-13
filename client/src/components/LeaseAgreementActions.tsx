"use client";

import {
  useGetAgreementTemplateUrlMutation,
  useGetLeaseAgreementUrlMutation,
  useUploadLeaseAgreementMutation,
} from "@/state/api";
import { Download, FileText, Upload } from "lucide-react";
import React, { useRef } from "react";

const buttonClass =
  "bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50 disabled:opacity-50 disabled:cursor-not-allowed";

type Props = {
  leaseId?: number | null;
  /** Tenants sign the agreement, so only they get the upload control. */
  canUpload?: boolean;
  /** Supply to offer the blank template the manager attached to the listing. */
  propertyId?: number | null;
  compact?: boolean;
};

const LeaseAgreementActions = ({
  leaseId,
  canUpload,
  propertyId,
  compact,
}: Props) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [getUrl, { isLoading: isFetching }] = useGetLeaseAgreementUrlMutation();
  const [upload, { isLoading: isUploading }] = useUploadLeaseAgreementMutation();
  const [getTemplate, { isLoading: isFetchingTemplate }] =
    useGetAgreementTemplateUrlMutation();

  if (!leaseId) return null;

  const handleDownload = async () => {
    try {
      const { downloadUrl } = await getUrl(leaseId).unwrap();
      // Presigned link, valid for a few minutes.
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch {
      // the mutation surfaces its own toast
    }
  };

  const handleTemplate = async () => {
    if (!propertyId) return;
    try {
      const { downloadUrl } = await getTemplate(propertyId).unwrap();
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch {
      // the mutation surfaces its own toast
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await upload({ leaseId, file }).unwrap();
    } catch {
      // the mutation surfaces its own toast
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const iconSize = compact ? "w-4 h-4 mr-1" : "w-5 h-5 mr-2";

  return (
    <div className="flex gap-2 flex-wrap">
      {propertyId && (
        <button
          type="button"
          onClick={handleTemplate}
          disabled={isFetchingTemplate}
          className={buttonClass}
          title="The blank agreement supplied by the manager"
        >
          <FileText className={iconSize} />
          {isFetchingTemplate ? "Opening..." : "Blank Agreement"}
        </button>
      )}
      <button
        type="button"
        onClick={handleDownload}
        disabled={isFetching}
        className={buttonClass}
      >
        <Download className={iconSize} />
        {isFetching ? "Preparing..." : "Download Agreement"}
      </button>

      {canUpload && (
        <>
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,.doc,.docx"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={isUploading}
            className={buttonClass}
            title="Upload a signed agreement for this lease"
          >
            <Upload className={iconSize} />
            {isUploading ? "Uploading..." : "Upload Signed"}
          </button>
        </>
      )}
    </div>
  );
};

export default LeaseAgreementActions;
