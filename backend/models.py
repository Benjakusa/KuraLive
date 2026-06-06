import uuid
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime

db = SQLAlchemy()

def create_uuid():
    return str(uuid.uuid4())

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='agent')
    status = db.Column(db.String(20), default='Active')
    station_id = db.Column(UUID(as_uuid=True))
    permissions = db.Column(db.String(20), default='edit')
    submission_status = db.Column(db.String(20), default='Pending')
    manager_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='SET NULL'))
    admin_secret = db.Column(db.String(10))
    force_password_reset = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": str(self.id) if self.id else None,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "status": self.status,
            "station_id": str(self.station_id) if self.station_id else None,
            "permissions": self.permissions,
            "submission_status": self.submission_status,
            "manager_id": str(self.manager_id) if self.manager_id else None,
            "force_password_reset": self.force_password_reset,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class UserSession(db.Model):
    __tablename__ = 'user_sessions'
    token = db.Column(db.String(64), primary_key=True)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)

class Election(db.Model):
    __tablename__ = 'elections'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    details = db.Column(JSONB)
    manager_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'))
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": str(self.id) if self.id else None,
            "details": self.details,
            "manager_id": str(self.manager_id) if self.manager_id else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Station(db.Model):
    __tablename__ = 'stations'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(150), nullable=False)
    county = db.Column(db.String(100))
    constituency = db.Column(db.String(100))
    ward = db.Column(db.String(100))
    code = db.Column(db.String(50))
    registered_voters = db.Column(db.Integer, default=0)
    location = db.Column(db.String(150))
    agent_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'))
    manager_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'))
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": str(self.id) if self.id else None,
            "name": self.name,
            "county": self.county,
            "constituency": self.constituency,
            "ward": self.ward,
            "code": self.code,
            "registered_voters": self.registered_voters,
            "location": self.location,
            "agent_id": str(self.agent_id) if self.agent_id else None,
            "manager_id": str(self.manager_id) if self.manager_id else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Result(db.Model):
    __tablename__ = 'results'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    station_id = db.Column(UUID(as_uuid=True), db.ForeignKey('stations.id'), nullable=False)
    agent_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    manager_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'))
    station_name = db.Column(db.String(150))
    agent_name = db.Column(db.String(100))
    timestamp = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    results_data = db.Column(JSONB, nullable=False)
    stats = db.Column(JSONB, nullable=False)
    proof_image = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": str(self.id) if self.id else None,
            "station_id": str(self.station_id) if self.station_id else None,
            "agent_id": str(self.agent_id) if self.agent_id else None,
            "manager_id": str(self.manager_id) if self.manager_id else None,
            "station_name": self.station_name,
            "agent_name": self.agent_name,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "results_data": self.results_data,
            "stats": self.stats,
            "proof_image": self.proof_image,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Subscription(db.Model):
    __tablename__ = 'subscriptions'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    manager_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    plan = db.Column(db.String(20), nullable=False, default='free')
    status = db.Column(db.String(20), nullable=False, default='trial')
    trial_started_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    trial_expires_at = db.Column(db.DateTime(timezone=True))
    activated_at = db.Column(db.DateTime(timezone=True))
    expires_at = db.Column(db.DateTime(timezone=True))
    pending_payment = db.Column(db.Boolean, default=False)
    pending_plan = db.Column(db.String(20))
    checkout_request_id = db.Column(db.String(255))
    payment_phone = db.Column(db.String(20))
    payment_confirmed = db.Column(db.Boolean, default=False)
    mpesa_receipt = db.Column(db.String(255))
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

class PaymentHistory(db.Model):
    __tablename__ = 'payment_history'
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    manager_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    plan = db.Column(db.String(20))
    payment_method = db.Column(db.String(50), default='M-Pesa')
    mpesa_receipt = db.Column(db.String(255))
    phone = db.Column(db.String(20))
    status = db.Column(db.String(20), default='Pending')
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)

class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_tokens'
    token = db.Column(db.String(64), primary_key=True)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.utcnow)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
