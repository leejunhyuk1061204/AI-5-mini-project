from pydantic import BaseModel
from typing import List

class MeetingMinutes(BaseModel):
    description: str
    core_summary: List[str]
    meeting_type: str
    topics: List[str]
    decisions: List[str]
    pending_items: List[str]
    action_items: List[str]
