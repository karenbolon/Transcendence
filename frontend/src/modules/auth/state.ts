//auth/state.ts

export const authState = {
	accessToken: null as string | null, // used only in JWT mode
	justRefreshed: false,
};