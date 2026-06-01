from pydantic import BaseModel, Field
from typing import Optional

class RegisterBody(BaseModel):
    name: str
    email: str
    password: str

class LoginBody(BaseModel):
    email: str
    password: str

class UpdateProfileBody(BaseModel):
    name: str
    monthly_goal: float = 0
    monthly_salary: float = 0

class TransactionBody(BaseModel):
    type: str = Field(..., pattern='^(income|expense)$')
    amount: float = Field(..., gt=0)
    category_id: Optional[int] = None
    description: str = ''
    date: str

class AdviceBody(BaseModel):
    message: str

class ChallengeBody(BaseModel):
    title: str
    target: float = Field(..., gt=0)
    end_date: Optional[str] = None

class DepositBody(BaseModel):
    amount: float = Field(..., gt=0)
