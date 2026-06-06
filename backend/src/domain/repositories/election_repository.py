from abc import ABC, abstractmethod
from typing import List, Dict, Tuple

class ElectionRepository(ABC):
    @abstractmethod
    def get_by_manager(self, manager_id: str, limit: int, offset: int) -> Tuple[List[Dict], int]:
        pass

    @abstractmethod
    def save(self, manager_id: str, details: Dict) -> None:
        pass
