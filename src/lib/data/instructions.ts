export type GameMode = { icon: string; name: string; desc: string; players: string };
export type GameRule = { title: string; body: string };
export type SpeedInfo = { emoji: string; name: string; desc: string };
export type ProTip = { icon: string; title: string; body: string };

export const gameModes: GameMode[] = [
	{ icon: '🤝', name: 'Local Match', desc: 'Play with a friend on the same keyboard.', players: '2 players' },
	{ icon: '🤖', name: 'Vs AI', desc: 'Practice against a computer opponent.', players: '1 player' },
	{ icon: '🌐', name: 'Online Match', desc: 'Compete against other players online.', players: '2 players' },
	{ icon: '🏟️', name: 'Tournament', desc: 'Bracket-style competition with multiple rounds.', players: '4+ players' },
];

export const gameRules: GameRule[] = [
	{ title: 'Score to win:', body: 'Each match is played to the target score.' },
	{ title: 'First to target:', body: 'The first player to hit the target score wins.' },
	{ title: 'Ball speed:', body: 'The ball gradually speeds up during rallies.' },
	{ title: 'Angle control:', body: 'Where the ball hits your paddle changes its return angle.' },
	{ title: 'Online pacing:', body: 'Online matches run continuously and cannot be paused.' },
];

export const speedPresets: SpeedInfo[] = [
	{ emoji: '🐢', name: 'Chill', desc: 'Slower pace, good for learning controls.' },
	{ emoji: '🏓', name: 'Normal', desc: 'Balanced speed for standard matches.' },
	{ emoji: '🔥', name: 'Fast', desc: 'High-speed play for experienced players.' },
];

export const proTips: ProTip[] = [
	{ icon: '🎯', title: 'Use paddle edges', body: 'Hit near paddle edges to create sharper angles.' },
	{ icon: '🧠', title: 'Anticipate rebounds', body: 'Read the opponent and move early to intercept.' },
	{ icon: '🏃', title: 'Recover to center', body: 'Reset your position between exchanges.' },
	{ icon: '💪', title: 'Practice regularly', body: 'Consistency improves timing and control.' },
];
