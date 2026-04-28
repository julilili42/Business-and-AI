import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import { createReview } from "./api/reviewApi";
import { AttachmentList } from "./components/AttachementList";
import { DebugDetails } from "./components/DebugDetails";
import { Header } from "./components/Header";
import { MailCard } from "./components/MailCard";
import { PendingReviewCard } from "./components/PendingReviewCard";
import { StatusCard } from "./components/StatusCard";
import { Steps } from "./components/Steps";
import {
  clearPendingReview,
  loadPendingReview,
  savePendingReview,
} from "./pendingReviewStorage";
import { createDraftMail, openUrl } from "./outlook/draftMail";
import { readMailSnapshot } from "./outlook/mailbox";
import type { MailSnapshot, PendingReview } from "./types";
import "./style.css";

declare const Office: any;

type Stage = "read" | "review" | "send";

function deriveStage(snapshot: MailSnapshot | null, pending: PendingReview | null): Stage {
  if (pending) return "send";
  if (snapshot) return "review";
  return "read";
}

function App() {
  const [isOutlook, setIsOutlook] = useState(false);
  const [snapshot, setSnapshot] = useState<MailSnapshot | null>(null);
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(() =>
    loadPendingReview(),
  );
  const [status, setStatus] = useState("Bereit. Add-in wartet auf Outlook.");
  const [loading, setLoading] = useState(false);

  async function loadMail() {
    setLoading(true);
    setStatus("Lade Mail-Inhalt und Anhänge...");
    try {
      const mail = await readMailSnapshot();
      setSnapshot(mail);
      setStatus(
        `Mail geladen — ${mail.attachments.length} ${
          mail.attachments.length === 1 ? "Anhang" : "Anhänge"
        }.`,
      );
    } catch (error) {
      setStatus(`Fehler beim Laden der Mail: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  async function startReview() {
    setLoading(true);
    setStatus("Sende an Review-API — Extraktion kann bis zu einer Minute dauern...");
    try {
      const mail = snapshot || (await readMailSnapshot());
      setSnapshot(mail);
      const result = await createReview(mail);
      const nextPendingReview: PendingReview = {
        review: result,
        mailSubject: mail.subject,
        sender: mail.from,
        createdAt: new Date().toISOString(),
      };
      savePendingReview(nextPendingReview);
      setPendingReview(nextPendingReview);
      setStatus(`Review erstellt: ${result.review_id}. Öffne Review-UI...`);
      openUrl(result.review_url);
    } catch (error) {
      setStatus(`Fehler beim Erstellen des Reviews: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  function openPendingReview() {
    if (!pendingReview) {
      setStatus("Kein aktiver Review vorhanden.");
      return;
    }
    openUrl(pendingReview.review.review_url);
    setStatus(`Review-UI geöffnet (${pendingReview.review.review_id}).`);
  }

  async function createDraftFromPendingReview() {
    if (!pendingReview) {
      setStatus("Kein aktiver Review vorhanden.");
      return;
    }
    setLoading(true);
    setStatus("Öffne Angebotsmail mit aktueller PDF...");
    try {
      await createDraftMail(
        pendingReview.review,
        { subject: pendingReview.mailSubject },
        setStatus,
      );
    } catch (error) {
      setStatus(`Fehler beim Öffnen der Mail: ${String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  function resetPendingReview() {
    clearPendingReview();
    setPendingReview(null);
    setStatus("Aktiver Review zurückgesetzt.");
  }

  useEffect(() => {
    Office.onReady((info: any) => {
      if (info.host !== Office.HostType.Outlook) {
        setIsOutlook(false);
        setStatus("Bitte über das Outlook Add-in-Manifest starten.");
        return;
      }
      setIsOutlook(true);
      loadMail();
    });
  }, []);

  const stage = deriveStage(snapshot, pendingReview);

  return (
    <div className="panel">
      <Header />
      <Steps stage={stage} />

      <PendingReviewCard
        pendingReview={pendingReview}
        loading={loading}
        onOpenReview={openPendingReview}
        onCreateDraftMail={createDraftFromPendingReview}
        onClearPendingReview={resetPendingReview}
      />

      <MailCard
        snapshot={snapshot}
        isOutlook={isOutlook}
        loading={loading}
        onStartReview={startReview}
        onLoadMail={loadMail}
      />

      <StatusCard status={status} loading={loading} />

      <AttachmentList snapshot={snapshot} />

      <DebugDetails snapshot={snapshot} />

      <div className="footer-note">
        ElringKlinger Quoting Pipeline · Local Prototype
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
