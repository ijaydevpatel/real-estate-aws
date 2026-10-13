"use client";

import {
  useGetPaymentMethodQuery,
  useUpdatePaymentMethodMutation,
} from "@/state/api";
import { CreditCard, Edit, Mail } from "lucide-react";
import React, { useEffect, useState } from "react";

const CARD_BRANDS = ["Visa", "Mastercard", "Amex", "Discover", "Other"];

const emptyForm = {
  cardBrand: "Visa",
  last4: "",
  expiryMonth: "",
  expiryYear: "",
  billingEmail: "",
};

const PaymentMethodCard = ({ cognitoId }: { cognitoId: string }) => {
  const { data: method, isLoading } = useGetPaymentMethodQuery(cognitoId, {
    skip: !cognitoId,
  });
  const [save, { isLoading: isSaving }] = useUpdatePaymentMethodMutation();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (method) {
      setForm({
        cardBrand: method.cardBrand,
        last4: method.last4,
        expiryMonth: String(method.expiryMonth),
        expiryYear: String(method.expiryYear),
        billingEmail: method.billingEmail,
      });
    }
  }, [method]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save({
        cognitoId,
        cardBrand: form.cardBrand,
        last4: form.last4,
        expiryMonth: Number(form.expiryMonth),
        expiryYear: Number(form.expiryYear),
        billingEmail: form.billingEmail,
      }).unwrap();
      setEditing(false);
    } catch {
      // the mutation surfaces its own toast
    }
  };

  const field =
    "border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring focus:ring-primary-200";

  return (
    <div className="mt-10 md:mt-0 flex-1 bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold mb-1">Payment method</h2>
      <p className="mb-4 text-sm text-gray-500">
        Change how you pay for your rent.
      </p>

      <div className="border rounded-lg p-6">
        {isLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : editing || !method ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="text-sm">
                <span className="block mb-1 font-medium">Card brand</span>
                <select
                  className={field}
                  value={form.cardBrand}
                  onChange={(e) =>
                    setForm({ ...form, cardBrand: e.target.value })
                  }
                >
                  {CARD_BRANDS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <span className="block mb-1 font-medium">Last 4 digits</span>
                <input
                  className={field}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="4242"
                  value={form.last4}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      last4: e.target.value.replace(/\D/g, "").slice(0, 4),
                    })
                  }
                  required
                />
              </label>

              <label className="text-sm">
                <span className="block mb-1 font-medium">Expiry month</span>
                <input
                  className={field}
                  inputMode="numeric"
                  placeholder="06"
                  value={form.expiryMonth}
                  onChange={(e) =>
                    setForm({ ...form, expiryMonth: e.target.value })
                  }
                  required
                />
              </label>

              <label className="text-sm">
                <span className="block mb-1 font-medium">Expiry year</span>
                <input
                  className={field}
                  inputMode="numeric"
                  placeholder="2028"
                  value={form.expiryYear}
                  onChange={(e) =>
                    setForm({ ...form, expiryYear: e.target.value })
                  }
                  required
                />
              </label>
            </div>

            <label className="text-sm block">
              <span className="block mb-1 font-medium">Billing email</span>
              <input
                className={field}
                type="email"
                placeholder="you@example.com"
                value={form.billingEmail}
                onChange={(e) =>
                  setForm({ ...form, billingEmail: e.target.value })
                }
                required
              />
            </label>

            <p className="text-xs text-gray-500">
              Only the last four digits are stored. Never enter a full card
              number here.
            </p>

            <div className="flex justify-end gap-2">
              {method && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="bg-primary-700 text-white py-2 px-4 rounded-md hover:bg-primary-600 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save card"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex gap-10">
              <div className="w-36 h-20 bg-blue-600 flex items-center justify-center rounded-md">
                <span className="text-white text-xl font-bold uppercase">
                  {method.cardBrand}
                </span>
              </div>
              <div className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start gap-5">
                    <h3 className="text-lg font-semibold">
                      {method.cardBrand} ending in {method.last4}
                    </h3>
                    <span className="text-sm font-medium border border-primary-700 text-primary-700 px-3 py-1 rounded-full">
                      Default
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 flex items-center">
                    <CreditCard className="w-4 h-4 mr-1" />
                    <span>
                      Expiry • {String(method.expiryMonth).padStart(2, "0")}/
                      {method.expiryYear}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-500 flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  <span>{method.billingEmail}</span>
                </div>
              </div>
            </div>

            <hr className="my-4" />
            <div className="flex justify-end">
              <button
                onClick={() => setEditing(true)}
                className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50"
              >
                <Edit className="w-5 h-5 mr-2" />
                <span>Edit</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentMethodCard;
