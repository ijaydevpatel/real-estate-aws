"use client";

import Card from "@/components/Card";
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import {
  useDeletePropertyMutation,
  useGetAuthUserQuery,
  useGetManagerPropertiesQuery,
} from "@/state/api";
import { Trash2 } from "lucide-react";
import React, { useState } from "react";

const Properties = () => {
  const { data: authUser } = useGetAuthUserQuery();
  const {
    data: managerProperties,
    isLoading,
    error,
  } = useGetManagerPropertiesQuery(authUser?.cognitoInfo?.userId || "", {
    skip: !authUser?.cognitoInfo?.userId,
  });

  const [deleteProperty, { isLoading: isDeleting }] =
    useDeletePropertyMutation();
  const [pendingId, setPendingId] = useState<number | null>(null);

  const handleDelete = async (id: number, name: string) => {
    const confirmed = window.confirm(
      `Delete "${name}"? This also removes its photos, applications and leases. This cannot be undone.`
    );
    if (!confirmed) return;

    setPendingId(id);
    try {
      await deleteProperty(id).unwrap();
    } catch {
      // the mutation already surfaces a toast on failure
    } finally {
      setPendingId(null);
    }
  };

  if (isLoading) return <Loading />;
  if (error) return <div>Error loading manager properties</div>;

  return (
    <div className="dashboard-container">
      <Header
        title="My Properties"
        subtitle="View and manage your property listings"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {managerProperties?.map((property) => (
          <div key={property.id} className="relative">
            <Card
              property={property}
              isFavorite={false}
              onFavoriteToggle={() => {}}
              showFavoriteButton={false}
              propertyLink={`/managers/properties/${property.id}`}
            />
            <button
              type="button"
              onClick={() => handleDelete(property.id, property.name)}
              disabled={isDeleting && pendingId === property.id}
              aria-label={`Delete ${property.name}`}
              title={`Delete ${property.name}`}
              className="absolute top-3 right-3 bg-white/90 hover:bg-red-50 text-red-600 border border-red-200 rounded-full p-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      {(!managerProperties || managerProperties.length === 0) && (
        <p>You don&lsquo;t manage any properties</p>
      )}
    </div>
  );
};

export default Properties;
