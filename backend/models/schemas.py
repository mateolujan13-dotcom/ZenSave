from pydantic import BaseModel, Field
from typing import Optional

class RegistroBody(BaseModel):
    nombre: str
    email: str
    contrasena: str

class InicioSesionBody(BaseModel):
    email: str
    contrasena: str

class ActualizarPerfilBody(BaseModel):
    nombre: str
    meta_mensual: float = 0
    salario_mensual: float = 0

class TransaccionBody(BaseModel):
    tipo: str = Field(..., pattern='^(income|expense)$')
    monto: float = Field(..., gt=0)
    categoria_id: Optional[int] = None
    descripcion: str = ''
    fecha: str

class ConsejoBody(BaseModel):
    mensaje: str

class RetoBody(BaseModel):
    titulo: str
    objetivo: float = Field(..., gt=0)
    fecha_fin: Optional[str] = None

class DepositoBody(BaseModel):
    monto: float = Field(..., gt=0)
