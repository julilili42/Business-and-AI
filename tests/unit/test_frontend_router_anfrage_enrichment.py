from types import SimpleNamespace

from quoting.api.container import get_app_container
from quoting.api.routers.stammdaten import CustomArticleRequest, create_custom_article_match
from quoting.api.services.quotation_service import (
    filter_redundant_custom_price_overrides,
    remove_position_price_overrides,
)
from quoting.api.services.review_service import ReviewDataService, enrich_exact_article_edits
from quoting.api.use_cases.mutations import UpdateAnfrageUseCase
from quoting.core import Anfrage
from quoting.data import InMemoryStammdatenRepository, StammdatenRecord
from quoting.matching import MatchResult
from quoting.reviews import Payloads


class _PipelineStub:
    def __init__(self):
        self.stammdaten_repo = InMemoryStammdatenRepository(
            [
                StammdatenRecord(
                    artikel_nr="001GLP108015",
                    bezeichnung="Gleitstück aus Stammdaten",
                    werkstoff="PTFE/Graphit",
                    abmessungen="108 x 15 mm",
                    einheit="Stk",
                )
            ]
        )


def test_exact_article_edit_fills_stammdaten_fields(make_position):
    previous = Anfrage(
        positionen=[make_position(pos_nr=1, artikelnummer="", bezeichnung="")]
    )
    anfrage = Anfrage(
        positionen=[
            make_position(
                pos_nr=1,
                artikelnummer=" 001glp108015 ",
                bezeichnung="",
                werkstoff=None,
                abmessungen=None,
            )
        ]
    )

    enriched = enrich_exact_article_edits(anfrage, previous, _PipelineStub())  # type: ignore[arg-type]
    pos = enriched.positionen[0]

    assert pos.artikelnummer == "001GLP108015"
    assert pos.bezeichnung == "Gleitstück aus Stammdaten"
    assert pos.werkstoff == "PTFE/Graphit"
    assert pos.abmessungen == "108 x 15 mm"


def test_same_article_does_not_overwrite_manual_description(make_position):
    previous = Anfrage(
        positionen=[
            make_position(
                pos_nr=1,
                artikelnummer="001GLP108015",
                bezeichnung="Alte Bezeichnung",
            )
        ]
    )
    anfrage = Anfrage(
        positionen=[
            make_position(
                pos_nr=1,
                artikelnummer="001GLP108015",
                bezeichnung="Manuell geändert",
            )
        ]
    )

    enriched = enrich_exact_article_edits(anfrage, previous, _PipelineStub())  # type: ignore[arg-type]

    assert enriched.positionen[0].bezeichnung == "Manuell geändert"


def test_custom_article_match_persists_review_local_article(
    sqlite_repo,
    make_position,
):
    review_id = "review-1"
    sqlite_repo.create_review(review_id)
    anfrage = Anfrage(
        positionen=[
            make_position(
                pos_nr=1,
                artikelnummer="",
                bezeichnung="Alte Beschreibung",
                menge=2,
                werkstoff=None,
                abmessungen=None,
            )
        ]
    )
    sqlite_repo.save_anfrage_reviewed(review_id, anfrage.model_dump(mode="json"))
    sqlite_repo.save_matches_reviewed(
        review_id,
        [
            {
                "pos_nr": 1,
                "status": "no_match",
                "score": 0.0,
                "matched_artikelnr": None,
                "matched_bezeichnung": None,
                "matched_row": None,
            }
        ],
    )
    sqlite_repo.save_overrides(
        review_id,
        [
            {
                "target": "pos",
                "pos_nr": 1,
                "mode": "unit_price_eur",
                "unit_price_eur": 99,
            },
            {
                "target": "pos",
                "pos_nr": 1,
                "mode": "discount_pct",
                "discount_pct": 5,
            },
            {
                "target": "pos",
                "pos_nr": 2,
                "mode": "unit_price_eur",
                "unit_price_eur": 7,
            },
        ],
    )

    get_app_container().set_pipeline(_PipelineStub())

    response = create_custom_article_match(
        review_id,
        CustomArticleRequest(
            pos_nr=1,
            artikel_nr=" CUST-001 ",
            bezeichnung=" Custom Dichtung ",
            einheit="Stk",
            unit_price_eur=12.345,
            werkstoff=" PTFE ",
            abmessungen=" 10 x 20 ",
        ),
    )

    assert response == {
        "pos_nr": 1,
        "matched_artikelnr": "CUST-001",
        "matched_bezeichnung": "Custom Dichtung",
        "unit_price_eur": 12.35,
    }

    saved_anfrage = sqlite_repo.load_payload(review_id, Payloads.ANFRAGE_REVIEWED)
    saved_position = saved_anfrage["positionen"][0]
    assert saved_position["artikelnummer"] == "CUST-001"
    assert saved_position["bezeichnung"] == "Custom Dichtung"
    assert saved_position["werkstoff"] == "PTFE"
    assert saved_position["abmessungen"] == "10 x 20"

    saved_match = sqlite_repo.load_payload(review_id, Payloads.MATCHES_REVIEWED)[0]
    assert saved_match["status"] == "exact"
    assert saved_match["matched_artikelnr"] == "CUST-001"
    assert saved_match["matched_row"]["custom"] is True
    assert saved_match["matched_row"]["basispreis_eur"] == 12.35

    overrides = sqlite_repo.load_overrides(review_id)
    assert overrides == [
        {
            "target": "pos",
            "pos_nr": 1,
            "mode": "discount_pct",
            "discount_pct": 5,
        },
        {
            "target": "pos",
            "pos_nr": 2,
            "mode": "unit_price_eur",
            "unit_price_eur": 7,
        }
    ]


def test_custom_article_removes_existing_pos_price_overrides():
    updated = remove_position_price_overrides(
        [
            {
                "target": "pos",
                "pos_nr": 1,
                "mode": "total_price_eur",
                "total_price_eur": 99,
            },
            {
                "target": "pos",
                "pos_nr": 2,
                "mode": "unit_price_eur",
                "unit_price_eur": 7,
            },
        ],
        pos_nr=1,
    )

    assert updated == [
        {
            "target": "pos",
            "pos_nr": 2,
            "mode": "unit_price_eur",
            "unit_price_eur": 7,
        },
    ]


def test_redundant_custom_price_override_is_hidden_from_review_detail():
    filtered = filter_redundant_custom_price_overrides(
        [
            {
                "target": "pos",
                "pos_nr": 1,
                "mode": "unit_price_eur",
                "unit_price_eur": 12.35,
            },
            {
                "target": "pos",
                "pos_nr": 1,
                "mode": "discount_pct",
                "discount_pct": 5,
            },
            {
                "target": "pos",
                "pos_nr": 2,
                "mode": "unit_price_eur",
                "unit_price_eur": 7,
            },
        ],
        [
            MatchResult(
                pos_nr=1,
                status="exact",
                score=1.0,
                matched_artikelnr="CUST-001",
                matched_bezeichnung="Custom Dichtung",
                matched_row={
                    "artikel_nr": "CUST-001",
                    "bezeichnung": "Custom Dichtung",
                    "basispreis_eur": 12.35,
                    "custom": True,
                },
            )
        ],
    )

    assert filtered == [
        {
            "target": "pos",
            "pos_nr": 1,
            "mode": "discount_pct",
            "discount_pct": 5,
        },
        {
            "target": "pos",
            "pos_nr": 2,
            "mode": "unit_price_eur",
            "unit_price_eur": 7,
        },
    ]


def test_load_matches_filters_deleted_position_matches(sqlite_repo, make_position):
    review_id = "review-1"
    sqlite_repo.create_review(review_id)
    anfrage = Anfrage(positionen=[make_position(pos_nr=1)])
    sqlite_repo.save_matches_reviewed(
        review_id,
        [
            {
                "pos_nr": 99,
                "status": "exact",
                "score": 1.0,
                "matched_artikelnr": "CUST-OLD",
                "matched_bezeichnung": "Alter Custom-Artikel",
                "matched_row": {"artikel_nr": "CUST-OLD", "custom": True},
            },
            {
                "pos_nr": 1,
                "status": "no_match",
                "score": 0.0,
                "matched_artikelnr": None,
                "matched_bezeichnung": None,
                "matched_row": None,
            },
        ],
    )

    matches = ReviewDataService(sqlite_repo).load_or_recompute_matches(
        review_id,
        anfrage,
        _PipelineStub(),  # type: ignore[arg-type]
    )

    assert [match.pos_nr for match in matches] == [1]
    assert matches[0].matched_artikelnr is None


def _matching_pipeline_stub():
    repo = InMemoryStammdatenRepository(
        [
            StammdatenRecord(
                artikel_nr="GLEIT-1",
                bezeichnung="Gleitring PTFE",
                werkstoff="PTFE",
                abmessungen="50x10",
                einheit="Stk",
                basispreis_eur=10.0,
            )
        ]
    )
    return SimpleNamespace(
        stammdaten_repo=repo,
        stammdaten=repo.as_rows(),
        settings=SimpleNamespace(fuzzy_threshold=85, semantic_threshold=70),
    )


def test_review_matching_uses_user_configured_thresholds(
    sqlite_repo,
    make_position,
    sample_stammdaten,
):
    review_id = "review-user-thresholds"
    sqlite_repo.create_review(review_id)
    anfrage = Anfrage(
        positionen=[make_position(artikelnummer="001GLP108O15")]
    )
    pipeline = SimpleNamespace(
        stammdaten=sample_stammdaten,
        settings=SimpleNamespace(fuzzy_threshold=100, semantic_threshold=100),
    )
    user_settings = SimpleNamespace(
        matching=SimpleNamespace(fuzzy_threshold=85, semantic_threshold=70)
    )

    matches = ReviewDataService(
        sqlite_repo,
        settings_loader=lambda: user_settings,
    ).load_or_recompute_matches(
        review_id,
        anfrage,
        pipeline,  # type: ignore[arg-type]
    )

    assert matches[0].status == "fuzzy"
    assert matches[0].matched_artikelnr == "001GLP108015"


def test_editing_description_rematches_but_keeps_manual_pin(sqlite_repo, make_position):
    """Regression: after a manual pin exists, editing another position's
    match-relevant fields must still re-run automatic matching, while the
    manual pin itself is preserved."""
    review_id = "review-rematch"
    sqlite_repo.create_review(review_id)

    anfrage = Anfrage(
        positionen=[
            make_position(pos_nr=1, artikelnummer="MANUAL-PIN", bezeichnung="Sonderteil"),
            make_position(
                pos_nr=2,
                artikelnummer="",
                bezeichnung="unklarer text",
                werkstoff=None,
                abmessungen=None,
            ),
        ]
    )
    sqlite_repo.save_anfrage_reviewed(review_id, anfrage.model_dump(mode="json"))
    # Pos 1 manually pinned; Pos 2 currently without a hit. Presence of a
    # reviewed payload is exactly the state that used to freeze matching.
    sqlite_repo.save_matches_reviewed(
        review_id,
        [
            {
                "pos_nr": 1,
                "status": "exact",
                "score": 1.0,
                "matched_artikelnr": "MANUAL-PIN",
                "matched_bezeichnung": "Sonderteil",
                "matched_row": {"artikel_nr": "MANUAL-PIN", "custom": True},
                "manual": True,
            },
            {
                "pos_nr": 2,
                "status": "no_match",
                "score": 0.0,
                "matched_artikelnr": None,
                "matched_bezeichnung": None,
                "matched_row": None,
                "manual": False,
            },
        ],
    )

    # The user corrects pos 2 to the actual article's description/material/dims.
    edited = Anfrage(
        positionen=[
            make_position(pos_nr=1, artikelnummer="MANUAL-PIN", bezeichnung="Sonderteil"),
            make_position(
                pos_nr=2,
                artikelnummer="",
                bezeichnung="Gleitring PTFE",
                werkstoff="PTFE",
                abmessungen="50x10",
            ),
        ]
    )

    UpdateAnfrageUseCase(
        repo=sqlite_repo,
        pipeline=_matching_pipeline_stub(),  # type: ignore[arg-type]
        review_data=ReviewDataService(sqlite_repo),
    ).execute(review_id, edited.model_dump(mode="json"))

    saved = {m["pos_nr"]: m for m in sqlite_repo.load_payload(review_id, Payloads.MATCHES_REVIEWED)}

    # Manual pin preserved verbatim.
    assert saved[1]["manual"] is True
    assert saved[1]["matched_artikelnr"] == "MANUAL-PIN"

    # Pos 2 was re-matched against the corrected fields (was no_match before).
    assert saved[2]["status"] != "no_match"
    assert saved[2]["matched_artikelnr"] == "GLEIT-1"
    assert saved[2]["manual"] is False


def test_original_anfrage_loader_ignores_reviewed_edits(sqlite_repo, make_position):
    review_id = "review-1"
    sqlite_repo.create_review(review_id)
    original = Anfrage(positionen=[make_position(pos_nr=1, artikelnummer="ORIGINAL")])
    reviewed = Anfrage(positionen=[make_position(pos_nr=1, artikelnummer="EDITED")])
    sqlite_repo.save_extracted(review_id, original.model_dump(mode="json"))
    sqlite_repo.save_anfrage_reviewed(review_id, reviewed.model_dump(mode="json"))

    loaded = ReviewDataService(sqlite_repo).try_load_original_anfrage(review_id)

    assert loaded is not None
    assert loaded.positionen[0].artikelnummer == "ORIGINAL"
