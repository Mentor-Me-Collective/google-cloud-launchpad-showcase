from proofstack.evaluation import classification_metrics


def test_perfect_metrics():
    gold = ["SUPPORTED", "UNSUPPORTED", "SUPPORTED", "UNSUPPORTED"]
    metrics = classification_metrics(gold, gold)

    assert metrics["accuracy"] == 1.0
    assert metrics["macro_f1"] == 1.0
    assert metrics["other_prediction_count"] == 0


def test_unparseable_counts_as_incorrect_and_is_visible():
    gold = ["SUPPORTED", "UNSUPPORTED"]
    pred = ["UNPARSEABLE", "UNSUPPORTED"]

    metrics = classification_metrics(gold, pred)

    assert metrics["accuracy"] == 0.5
    assert metrics["other_prediction_count"] == 1
    assert metrics["confusion_matrix"]["SUPPORTED_as_OTHER"] == 1
    assert metrics["confusion_matrix"]["UNSUPPORTED_as_UNSUPPORTED"] == 1
