export type FormErrors = {
	username?: string;
	email?: string;
	password?: string;
	confirmPassword?: string;
};

// Register page response shape
export type RegisterFormResult = {
	errorKey?: string;
	errors?: FormErrors;
} | null;

// Login page response shape
export type LoginFormResult = {
	errorKey?: string;
	username?: string; // Preserved so the field stays filled after error
} | null;
