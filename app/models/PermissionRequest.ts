import mongoose, { Schema, Document } from 'mongoose';

export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface IPermissionRequest extends Document {
  userId: mongoose.Types.ObjectId;
  currentPermission: string;
  requestedPermission: string;
  status: RequestStatus;
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionRequestSchema = new Schema<IPermissionRequest>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    currentPermission: {
      type: String,
      required: true,
    },
    requestedPermission: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(RequestStatus),
      default: RequestStatus.PENDING,
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
PermissionRequestSchema.index({ userId: 1, status: 1 });

export default mongoose.models.PermissionRequest || 
  mongoose.model<IPermissionRequest>('PermissionRequest', PermissionRequestSchema);
