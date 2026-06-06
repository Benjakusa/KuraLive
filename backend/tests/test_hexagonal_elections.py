import pytest
from unittest.mock import patch
from src.infrastructure.repositories.postgres_election_repo import PostgresElectionRepository

def test_get_by_manager():
    repo = PostgresElectionRepository()
    
    with patch("src.infrastructure.repositories.postgres_election_repo.query") as mock_query:
        mock_query.side_effect = [
            [{"id": "test", "manager_id": "manager"}], # first query returns rows
            {"count": 1} # second query returns count
        ]
        
        rows, total = repo.get_by_manager("manager", 10, 0)
        
        assert total == 1
        assert len(rows) == 1
        assert rows[0]["id"] == "test"
