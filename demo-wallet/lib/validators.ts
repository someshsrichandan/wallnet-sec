export const validateEmail = (email: string) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone: string) => {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  return /^\+?\d{10,15}$/.test(cleaned);
};

export const validatePassword = (password: string) => {
  return password.length >= 6;
};
