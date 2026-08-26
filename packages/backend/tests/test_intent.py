import pytest

from cct.intent.rules import classify


@pytest.mark.parametrize(
    ("prompt", "expected"),
    [
        ("Fix this traceback", "debugging"),
        ("实现一个搜索接口", "coding"),
        ("请审查这段代码", "review"),
        ("What is SQLite?", "question"),
    ],
)
def test_classify_representative_prompts(prompt, expected):
    result = classify(prompt)

    assert result.primary == expected
    assert result.confidence > 0
