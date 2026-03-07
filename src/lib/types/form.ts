export type FormErrors = {
	username?: string;
	email?: string;
	password?: string;
	confirmPassword?: string;
};

// Register page response shape
export type RegisterFormResult = {
	error?: string;
	errors?: FormErrors;
};

// Login page response shape
export type LoginFormResult = {
	error?: string;
	username?: string; // Preserved so the field stays filled after error
};