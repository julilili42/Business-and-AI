import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { OriginalDocumentViewer } from "@/shared/components/viewers/OriginalDocumentViewer";
import { PdfViewer } from "@/shared/components/viewers/PdfViewer";

import type { ReviewDetail } from "@/shared/api/reviews";
import { Pill } from "@/shared/components/ui/pill";

interface ComparePanesProps {
  reviewId: string;
  detail: ReviewDetail;
  isApproved: boolean;
}

/**
 * Side-by-side comparison view (step 3).
 *
 * Two parallel tab strips so the original and the generated angebot
 * stay vertically aligned:
 *
 * - Left  (Original):    Datei | Mail-Text
 * - Right (Angebot):     Entwurf | Final (only when approved)
 *
 * The PDF tabs hit distinct API URLs (`/pdf/draft` vs `/pdf/final`),
 * which sidesteps the long-standing browser data-URL conflation
 * problem from the Streamlit version.
 */
export function ComparePanes({ reviewId, detail, isApproved }: ComparePanesProps) {
  const firstAttachment = detail.mail.attachments[0]?.name;
  const hasAttachment = Boolean(firstAttachment);
  const hasMailBody = Boolean(detail.mail.body.trim());

  // Cache buster lives at the comparison level — when the parent
  // updates `detail` (i.e. after a regenerate or a finalize), both
  // PDF iframes refresh in lockstep.
  const cacheBuster = detail.review_id + "::" + (isApproved ? "approved" : "draft");

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <ComparePane label="Original">
        <Tabs defaultValue={hasAttachment ? "file" : "mail"}>
          <TabsList>
            {hasAttachment && (
              <TabsTrigger value="file">
                {firstAttachment ?? "Datei"}
              </TabsTrigger>
            )}
            {hasMailBody && <TabsTrigger value="mail">Mail-Text</TabsTrigger>}
          </TabsList>

          {hasAttachment && (
            <TabsContent value="file">
              <OriginalDocumentViewer
                reviewId={reviewId}
                mail={detail.mail}
                attachmentName={firstAttachment}
              />
            </TabsContent>
          )}

          {hasMailBody && (
            <TabsContent value="mail">
              <OriginalDocumentViewer
                reviewId={reviewId}
                mail={detail.mail}
                attachmentName={undefined}
              />
            </TabsContent>
          )}
        </Tabs>
      </ComparePane>

      <ComparePane
        label="Angebotsentwurf"
        badge={isApproved ? <Pill tone="success" withDot>freigegeben</Pill> : null}
      >
        <Tabs defaultValue="draft">
          <TabsList>
            <TabsTrigger value="draft">Entwurf</TabsTrigger>
            {isApproved && <TabsTrigger value="final">Finales Angebot</TabsTrigger>}
          </TabsList>

          <TabsContent value="draft">
            <PdfViewer
              reviewId={reviewId}
              kind="draft"
              cacheBuster={cacheBuster + "::draft"}
            />
          </TabsContent>

          {isApproved && (
            <TabsContent value="final">
              <PdfViewer
                reviewId={reviewId}
                kind="final"
                cacheBuster={cacheBuster + "::final"}
              />
            </TabsContent>
          )}
        </Tabs>
      </ComparePane>
    </div>
  );
}

interface ComparePaneProps {
  label: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

function ComparePane({ label, badge, children }: ComparePaneProps) {
  return (
    <section>
      <header className="mb-2 flex items-center gap-2">
        <span className="section-label">{label}</span>
        {badge}
      </header>
      {children}
    </section>
  );
}
