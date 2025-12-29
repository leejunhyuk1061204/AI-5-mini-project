from pydantic import BaseModel
from typing import List

class MeetingMinutes(BaseModel):
    meeting_type: str
    topics: List[str]
    decisions: List[str]
    pending_items: List[str]
    action_items: List[str]
