"""Small, dependency-free-of-Firestore-service validation tests."""
import re
from app.classrooms import CreateClassroom, JoinClassroom, clean_code, new_join_code
from pydantic import ValidationError


def test_join_code_randomized_and_normalized():
    codes = {new_join_code() for _ in range(100)}
    assert len(codes) == 100
    assert all(re.fullmatch(r"LL-[2-9A-HJ-NP-Z]{12}", c) for c in codes)
    code = next(iter(codes))
    assert clean_code(f" {code.lower()} ") == code


def test_classroom_input_validation():
    item = CreateClassroom(name="Science", grade="6", subject="Natural Science")
    assert item.allowJoinByCode is True
    try:
        CreateClassroom(name="", grade="6", subject="Science")
        assert False, "empty name accepted"
    except ValidationError:
        pass
    assert JoinClassroom(code="LL-23456789ABCD").code.startswith("LL-")
