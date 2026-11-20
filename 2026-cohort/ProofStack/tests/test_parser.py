from proofstack.parser import parse_model_output


def test_json_supported():
    result = parse_model_output(
        '{"label":"SUPPORTED","rationale":"x","cited_excerpt":"y"}'
    )
    assert result.label == "SUPPORTED"
    assert result.parse_status == "json"


def test_embedded_json_supported():
    result = parse_model_output(
        'Here is the result: {"label":"SUPPORTED","rationale":"x"} done'
    )
    assert result.label == "SUPPORTED"
    assert result.parse_status == "json_embedded"


def test_single_quoted_embedded_json_is_tolerated():
    result = parse_model_output(
        "Result: {'label':'UNSUPPORTED','rationale':'policy only'}"
    )
    assert result.label == "UNSUPPORTED"
    assert result.parse_status == "json_embedded"


def test_bare_label_is_tolerated_when_unambiguous():
    result = parse_model_output("UNSUPPORTED")
    assert result.label == "UNSUPPORTED"
    assert result.parse_status == "label_regex"


def test_ambiguous_is_unparseable():
    result = parse_model_output("SUPPORTED or UNSUPPORTED")
    assert result.label == "UNPARSEABLE"


def test_label_on_own_line_is_tolerated():
    result = parse_model_output("Label: UNSUPPORTED\nThe export lists two accounts without MFA.")
    assert result.label == "UNSUPPORTED"
    assert result.parse_status == "label_regex"


def test_label_word_inside_prose_is_unparseable():
    # Negation: reading the label word out of this sentence would invert its meaning.
    result = parse_model_output("The evidence does not show the claim is SUPPORTED.")
    assert result.label == "UNPARSEABLE"


def test_conflicting_label_lines_are_unparseable():
    assert parse_model_output("SUPPORTED\nUNSUPPORTED").label == "UNPARSEABLE"


def test_invalid_json_label_does_not_fall_back_to_prose():
    result = parse_model_output(
        '{"label":"APPROVED","rationale":"the claim is UNSUPPORTED by logs"}'
    )
    assert result.label == "UNPARSEABLE"
    assert result.parse_status == "invalid_label"


def test_invalid_embedded_json_label_does_not_fall_back_to_prose():
    result = parse_model_output('Result: {"label":"COMPLIANT"} so it is SUPPORTED')
    assert result.label == "UNPARSEABLE"
    assert result.parse_status == "invalid_label"


def test_empty_is_unparseable():
    result = parse_model_output("")
    assert result.label == "UNPARSEABLE"
    assert result.parse_status == "empty"
