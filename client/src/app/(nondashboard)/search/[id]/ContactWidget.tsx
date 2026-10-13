import { Button } from "@/components/ui/button";
import { useGetAuthUserQuery, useGetPropertyQuery } from "@/state/api";
import { Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

const ContactWidget = ({ onOpenModal, propertyId }: ContactWidgetProps) => {
  const { data: authUser } = useGetAuthUserQuery();
  const { data: property } = useGetPropertyQuery(propertyId);
  const router = useRouter();

  const handleButtonClick = () => {
    if (authUser) {
      onOpenModal();
    } else {
      router.push("/signin");
    }
  };

  // contactPhone and languages were added to Property after the committed
  // Prisma types were generated, so read them defensively until the generated
  // types are refreshed.
  const contact = property as
    | { contactPhone?: string | null; languages?: string[] }
    | undefined;
  const contactPhone = contact?.contactPhone;
  const languages = contact?.languages?.length
    ? contact.languages.join(", ")
    : null;

  return (
    <div className="bg-white border border-primary-200 rounded-2xl p-7 h-fit min-w-[300px]">
      {/* Contact Property */}
      <div className="flex items-center gap-5 mb-4 border border-primary-200 p-4 rounded-xl">
        <div className="flex items-center p-4 bg-primary-900 rounded-full">
          <Phone className="text-primary-50" size={15} />
        </div>
        <div>
          <p>Contact This Property</p>
          {contactPhone ? (
            <a
              href={`tel:${contactPhone}`}
              className="text-lg font-bold text-primary-800 hover:underline"
            >
              {contactPhone}
            </a>
          ) : (
            <div className="text-lg font-bold text-primary-800">
              Apply to get in touch
            </div>
          )}
        </div>
      </div>
      <Button
        className="w-full bg-primary-700 text-white hover:bg-primary-600"
        onClick={handleButtonClick}
      >
        {authUser ? "Submit Application" : "Sign In to Apply"}
      </Button>

      {languages && (
        <>
          <hr className="my-4" />
          <div className="text-sm">
            <div className="text-primary-600">Languages: {languages}</div>
          </div>
        </>
      )}
    </div>
  );
};

export default ContactWidget;
