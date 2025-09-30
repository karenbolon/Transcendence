// auth module
//index.ts registers routes and sets up listeners

import type { Module, MountCtx } from '../../types';
import { authEmail } from './views';

const Auth: Module = {
	id: 'auth',
	title: 'Auth',
	route: '#/auth',
	mount({ container }: MountCtx) {
		authEmail(container);
		// Call the exported function from view.ts to render the auth logic
		// Example: authEmail(container);
	},
	unmount() {
		// Optional: cleanup logic
	},
};

export default Auth;