from utils.helpers import (
    normalize_phone,
    sanitize_filename,
    safe_json_loads,
    generate_session_hash,
    fill_template,
    hash_password,
    verify_password,
    generate_uuid,
    generate_token,
    generate_secure_token,
)


class TestNormalizePhone:
    def test_keeps_e164(self):
        assert normalize_phone("+254712345678") == "+254712345678"

    def test_strips_leading_0(self):
        assert normalize_phone("0712345678") == "+254712345678"

    def test_strips_leading_254(self):
        assert normalize_phone("254712345678") == "+254712345678"

    def test_adds_254_for_short(self):
        assert normalize_phone("712345678") == "+254712345678"

    def test_strips_whitespace_and_dashes(self):
        assert normalize_phone("+254 712 345-678") == "+254712345678"

    def test_rejects_invalid(self):
        assert normalize_phone("abc") is None

    def test_rejects_empty(self):
        assert normalize_phone("") is None

    def test_rejects_too_short(self):
        assert normalize_phone("123") is None


class TestSanitizeFilename:
    def test_returns_lowercase(self):
        result = sanitize_filename("Test.File.TXT")
        assert result.endswith(".txt")
        assert result == result.lower()

    def test_removes_path_traversal(self):
        result = sanitize_filename("../../../etc/passwd.png")
        assert "/" not in result
        assert ".." not in result
        assert result.endswith(".png")


class TestSafeJsonLoads:
    def test_parses_valid_json(self):
        assert safe_json_loads('{"a": 1}') == {"a": 1}

    def test_returns_dict_as_is(self):
        assert safe_json_loads({"a": 1}) == {"a": 1}

    def test_returns_list_as_is(self):
        assert safe_json_loads([1, 2]) == [1, 2]

    def test_returns_default_for_none(self):
        assert safe_json_loads(None) is None

    def test_returns_default_for_invalid(self):
        assert safe_json_loads("not json", []) == []


class TestFillTemplate:
    def test_replaces_name(self):
        assert fill_template("Hello {{name}}", name="Alice") == "Hello Alice"

    def test_replaces_all_vars(self):
        result = fill_template(
            "{{name}} at {{station}} in {{county}}",
            name="Bob",
            station="S01",
            county="Nairobi",
        )
        assert result == "Bob at S01 in Nairobi"

    def test_uses_defaults_when_missing(self):
        result = fill_template("Hi {{name}} at {{station}}")
        assert "Voter" in result
        assert "your polling station" in result


class TestPassword:
    def test_hash_and_verify(self):
        h = hash_password("MyP@ss123")
        assert verify_password("MyP@ss123", h)
        assert not verify_password("WrongP@ss1", h)

    def test_different_hashes_for_same_password(self):
        h1 = hash_password("MyP@ss123")
        h2 = hash_password("MyP@ss123")
        assert h1 != h2


class TestGenerators:
    def test_generate_uuid(self):
        u = generate_uuid()
        assert len(u) == 36
        assert u.count("-") == 4

    def test_generate_token(self):
        t = generate_token()
        assert len(t) == 64
        assert all(c in "0123456789abcdef" for c in t)

    def test_generate_secure_token(self):
        t = generate_secure_token()
        assert len(t) > 20


class TestGenerateSessionHash:
    def test_returns_sha256_hash(self):
        class FakeRequest:
            headers = {"X-Forwarded-For": "192.168.1.1", "User-Agent": "TestAgent/1.0"}
            remote_addr = "192.168.1.1"

        result = generate_session_hash(FakeRequest())
        assert len(result) == 64
        assert all(c in "0123456789abcdef" for c in result)

    def test_different_ips_different_hashes(self):
        class Req1:
            headers = {"X-Forwarded-For": "1.1.1.1"}
            remote_addr = "1.1.1.1"

        class Req2:
            headers = {"X-Forwarded-For": "2.2.2.2"}
            remote_addr = "2.2.2.2"

        assert generate_session_hash(Req1()) != generate_session_hash(Req2())

    def test_same_input_same_hash(self):
        class Req:
            headers = {"X-Forwarded-For": "10.0.0.1", "User-Agent": "SameAgent"}
            remote_addr = "10.0.0.1"

        assert generate_session_hash(Req()) == generate_session_hash(Req())
