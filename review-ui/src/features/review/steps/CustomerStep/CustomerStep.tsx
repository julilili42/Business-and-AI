import { useOutletContext, useParams } from "react-router-dom";

import { OriginalDocumentViewer } from "@/shared/components/viewers/OriginalDocumentViewer";

import type { ReviewDetailContext } from "../../ReviewDetailPage";
import { ChangedFieldsIndicator } from "../../components/ChangedFieldsIndicator";
import { StepNavigation } from "../../components/StepNavigation";
import { CustomerForm } from "./CustomerForm";

export function CustomerStep() {
  const { reviewId } = useParams<{ reviewId: string }>();
  const { detail } = useOutletContext<ReviewDetailContext>();

  if (!reviewId) return null;

  const firstAttachment = detail.mail.attachments[0]?.name;

  return (
    <>
      <ChangedFieldsIndicator />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <OriginalDocumentViewer
            reviewId={reviewId}
            mail={detail.mail}
            attachmentName={firstAttachment}
            className="lg:sticky lg:top-6"
          />
        </div>

        <div className="order-1 lg:order-2">
          <CustomerForm reviewId={reviewId} anfrage={detail.anfrage} />
        </div>
      </div>

      <StepNavigation current="customer" forwardLabel="Kundendaten bestätigen" />
    </>
  );
}
