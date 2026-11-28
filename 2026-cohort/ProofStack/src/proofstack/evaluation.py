LABELS = ("SUPPORTED", "UNSUPPORTED")


def classification_metrics(gold, pred):
    if len(gold) != len(pred):
        raise ValueError("gold and pred lengths differ")

    n = len(gold)
    accuracy = sum(a == b for a, b in zip(gold, pred)) / n if n else 0.0

    per_class = {}
    f1s = []
    precisions = []
    recalls = []

    for label in LABELS:
        tp = sum(g == label and p == label for g, p in zip(gold, pred))
        fp = sum(g != label and p == label for g, p in zip(gold, pred))
        fn = sum(g == label and p != label for g, p in zip(gold, pred))
        precision = tp / (tp + fp) if tp + fp else 0.0
        recall = tp / (tp + fn) if tp + fn else 0.0
        f1 = (
            2 * precision * recall / (precision + recall)
            if precision + recall
            else 0.0
        )

        per_class[label] = {
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "support": sum(g == label for g in gold),
        }
        precisions.append(precision)
        recalls.append(recall)
        f1s.append(f1)

    confusion = {
        "SUPPORTED_as_SUPPORTED": sum(
            g == "SUPPORTED" and p == "SUPPORTED" for g, p in zip(gold, pred)
        ),
        "SUPPORTED_as_UNSUPPORTED": sum(
            g == "SUPPORTED" and p == "UNSUPPORTED" for g, p in zip(gold, pred)
        ),
        "SUPPORTED_as_OTHER": sum(
            g == "SUPPORTED" and p not in LABELS for g, p in zip(gold, pred)
        ),
        "UNSUPPORTED_as_SUPPORTED": sum(
            g == "UNSUPPORTED" and p == "SUPPORTED" for g, p in zip(gold, pred)
        ),
        "UNSUPPORTED_as_UNSUPPORTED": sum(
            g == "UNSUPPORTED" and p == "UNSUPPORTED" for g, p in zip(gold, pred)
        ),
        "UNSUPPORTED_as_OTHER": sum(
            g == "UNSUPPORTED" and p not in LABELS for g, p in zip(gold, pred)
        ),
    }

    return {
        "n": n,
        "accuracy": accuracy,
        "macro_precision": sum(precisions) / 2,
        "macro_recall": sum(recalls) / 2,
        "macro_f1": sum(f1s) / 2,
        "per_class": per_class,
        "confusion_matrix": confusion,
        "other_prediction_count": sum(p not in LABELS for p in pred),
    }
