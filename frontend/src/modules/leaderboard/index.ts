//leaderboard module
//index.ts registers routes and sets up listeners

import type { Module, MountCtx} from '../../types';
import { renderLeaderboard } from './views';  //or whatever name you call the function

const Leaderboard: Module = {
	id: 'leaderboard',
	title: 'Leaderboard',
	route: '#/leaderboard',
	mount({ container }: MountCtx) {
		renderLeaderboard(container);
		// Call the exported function from view.ts to render the leaderboard logic
	},
	unmount() {
		// Optional: cleanup logic
	},
}

export default Leaderboard;
