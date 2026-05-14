from quoting.api.frontend_router import _enrich_exact_article_edits
from quoting.core import Anfrage
from quoting.data import InMemoryStammdatenRepository, StammdatenRecord


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

    enriched = _enrich_exact_article_edits(anfrage, previous, _PipelineStub())  # type: ignore[arg-type]
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

    enriched = _enrich_exact_article_edits(anfrage, previous, _PipelineStub())  # type: ignore[arg-type]

    assert enriched.positionen[0].bezeichnung == "Manuell geändert"
