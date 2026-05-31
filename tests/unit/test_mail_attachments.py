from __future__ import annotations

from fastapi.testclient import TestClient


def test_mail_attachment_upload_list_download_delete(sqlite_repo):
    from quoting.api.review_api import app

    review_id = "review_mail_attachments"
    sqlite_repo.create_review(review_id)
    client = TestClient(app)

    upload = client.post(
        f"/api/reviews/{review_id}/mail-attachments",
        files={"file": ("Zeichnung A.pdf", b"%PDF drawing", "application/pdf")},
    )
    assert upload.status_code == 200
    payload = upload.json()
    assert payload["name"] == "Zeichnung A.pdf"
    assert payload["contentType"] == "application/pdf"
    assert payload["size"] == len(b"%PDF drawing")
    assert payload["url"].endswith("/mail-attachments/Zeichnung%20A.pdf")

    listed = client.get(f"/api/reviews/{review_id}/mail-attachments")
    assert listed.status_code == 200
    assert listed.json() == [payload]

    downloaded = client.get(payload["url"])
    assert downloaded.status_code == 200
    assert downloaded.content == b"%PDF drawing"

    deleted = client.delete(f"/api/reviews/{review_id}/mail-attachments/Zeichnung%20A.pdf")
    assert deleted.status_code == 204
    assert sqlite_repo.current_document(
        review_id,
        kind="mail_attachment",
        filename="Zeichnung A.pdf",
    ) is None

    listed_after_delete = client.get(f"/api/reviews/{review_id}/mail-attachments")
    assert listed_after_delete.status_code == 200
    assert listed_after_delete.json() == []
