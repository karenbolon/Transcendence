// modules/home/index.ts
//index.ts registers routes and sets up listeners

import type { Module, MountCtx } from '../../types';
import { renderHome } from './views';


const Home: Module = {
	id: 'home',
	title: 'Home',
	route: '#/home',
	mount({ container }: MountCtx) {
		renderHome(container);},
		// Call the exported function from view.ts to render the welcome page logic
	unmount() {},
};

export default Home;