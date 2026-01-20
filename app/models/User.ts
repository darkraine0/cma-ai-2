import mongoose, { Schema, Document } from 'mongoose';

// User roles - extensible for future roles
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

// User permissions for access control
export enum UserPermission {
  VIEWER = 'viewer',
  EDITOR = 'editor',
}

// User status for approval workflow
export enum UserStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface IUser extends Document {
  email: string;
  password: string; // Hashed password
  name?: string;
  role: UserRole;
  permission: UserPermission;
  status: UserStatus;
  emailVerified: boolean; // Email verification status
  emailVerificationToken?: string; // Token for email verification
  emailVerificationExpires?: Date; // Expiration for verification token
  lastLogin?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  resetPasswordCode?: string;
  resetPasswordCodeExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
      index: true,
    },
    permission: {
      type: String,
      enum: Object.values(UserPermission),
      default: UserPermission.VIEWER,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.PENDING,
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    emailVerificationToken: {
      type: String,
      index: true,
    },
    emailVerificationExpires: {
      type: Date,
    },
    lastLogin: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
      index: true,
    },
    resetPasswordExpires: {
      type: Date,
    },
    resetPasswordCode: {
      type: String,
      index: true,
    },
    resetPasswordCodeExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups (email already has unique index)

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
