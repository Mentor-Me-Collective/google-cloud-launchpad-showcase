from proofstack.schema import Question, Label

def test_question_schema():
    q = Question(question_id="Q01", question="Test?", claim="Claim")
    assert q.question_id == "Q01"

def test_labels():
    assert Label.SUPPORTED.value == "SUPPORTED"
    assert Label.UNSUPPORTED.value == "UNSUPPORTED"
