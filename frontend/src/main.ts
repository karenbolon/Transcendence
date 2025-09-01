import './styles.css';
import { startGame } from './modules/pong/view';

document.addEventListener('DOMContentLoaded', () => {
	const canvas = document.getElementById('board') as HTMLCanvasElement | null;
	if (!canvas) {
		throw new Error('#board canvas not found');
	}
	startGame(canvas);
});


/*
this function sets the canvas' internal resulution to match the size of the screen
detected by Tailwind
*/
function fitCanvasToScreen(canvas: HTMLCanvasElement, aspect = 4 / 3) {
	const screenW = canvas.clientWidth; //from Tailwind
	const screenH = screenW / aspect;
	const dpr = window.devicePixelRatio || 1;
	canvas.width = Math.round(screenW * dpr);
	canvas.height = Math.round(screenH * dpr);
}

const canvas = document.getElementById('board') as HTMLCanvasElement;
fitCanvasToScreen(canvas);
window.addEventListener('resize', () => fitCanvasToScreen(canvas));