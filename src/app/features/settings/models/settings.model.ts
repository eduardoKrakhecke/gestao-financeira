
export interface UserProfileUpdate {
  name: string;
  email: string;
  avatar: string | null;
}

export interface PasswordUpdate {
  currentPassword: string;
  newPassword: string;
}

export interface UserPreferences {
  currency: 'BRL';
  dateFormat: 'dd/MM/yyyy' | 'MM/dd/yyyy';
  language: 'pt-BR';
}
