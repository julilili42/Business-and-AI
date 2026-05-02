import { Maximize2 } from "lucide-react";
import { useNavigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";

import { Button } from "@/shared/components/ui/button";

import { useApproval } from "../../hooks/useApproval";
import type { ReviewDetailContext } from "../../ReviewDetailPage";
import { StepNavigation } from "../../components/StepNavigation";
import { ApprovalPanel } from "./ApprovalPanel";
import { ComparePanes } from "./ComparePanes";
import { FocusToolbar } from "./FocusToolbar";
import { isApproved } from "@/shared/schemas/approval";

export function ApprovalStep() {
  const { reviewId } = useParams<{ reviewId: string }>();
  const { detail, focusMode } = useOutletContext<ReviewDetailContext>();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const approval = useApproval(reviewId);

  if (!reviewId) return null;

  const approved = isApproved(approval.data);
  const firstAttachment = detail.mail.attachments[0]?.name;

  const enterFocus = () => {
    const next = new URLSearchParams(params);
    next.set("focus", "1");
    navigate({ search: next.toString() });
  };

  if (focusMode) {
    return (
      <div className="mx-auto max-w-screen-2xl px-6 py-4">
        <FocusToolbar reviewId={reviewId} fileName={firstAttachment} />
        <ComparePanes
          reviewId={reviewId}
          detail={detail}
          isApproved={approved}
        />
        <div className="mt-6">
          <ApprovalPanel reviewId={reviewId} approval={approval.data} />
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="section-label mb-1">Vergleich</h2>
          <p className="text-xs text-muted-foreground">
            Bei Fehlern → zurück zu Schritt 1 (Positionen) oder Schritt 2 (Kunde).
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={enterFocus}>
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
          Vollbild
        </Button>
      </header>

      <ComparePanes
        reviewId={reviewId}
        detail={detail}
        isApproved={approved}
      />

      <div className="mt-8">
        <h2 className="section-label mb-3">Freigabe</h2>
        <ApprovalPanel reviewId={reviewId} approval={approval.data} />
      </div>

      <StepNavigation
        current="approval"
        onFinish={() => navigate("/")}
        finishLabel="Fertig — zurück zur Übersicht"
      />
    </>
  );
}
