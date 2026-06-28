import { z } from 'zod';

const phoneE164 = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, 'Enter a valid phone number in international format, e.g. +919876543210');

export const phoneSendOtpSchema = z.object({
  phone: phoneE164,
});

export const phoneVerifyOtpSchema = z.object({
  phone: phoneE164,
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric'),
  fullName: z.string().min(1).max(120).optional(),
});

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[0-9]/, 'Must contain a number');

export const emailRegisterSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password,
  fullName: z.string().min(1, 'Name is required').max(120),
});

export const emailVerifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6).regex(/^\d+$/),
});

export const emailLoginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6).regex(/^\d+$/),
  newPassword: password,
});

export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  searchRadiusKm: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(25)]).optional(),
});
