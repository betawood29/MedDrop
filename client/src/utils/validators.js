// Client-side validators for forms

export const isValidPhone = (phone) => /^\d{10}$/.test(phone);

export const isValidOtp = (otp) => /^\d{6}$/.test(otp);

export const isValidName = (name) => name && name.trim().length >= 2;
