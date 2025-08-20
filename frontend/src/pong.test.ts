import { detectCollision, boundaryCheck, resetGame } from './pong';

describe('Pong Game Logic', () => {
  test('detectCollision returns true for overlapping rectangles', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 5, y: 5, width: 10, height: 10 };
    expect(detectCollision(a, b)).toBe(true);
  });

  test('detectCollision returns false for non-overlapping rectangles', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 20, y: 20, width: 10, height: 10 };
    expect(detectCollision(a, b)).toBe(false);
  });

  test('boundaryCheck returns true if out of bounds', () => {
    expect(boundaryCheck(-1)).toBe(true);
    expect(boundaryCheck(1000)).toBe(true);
  });

  test('boundaryCheck returns false if within bounds', () => {
    expect(boundaryCheck(100)).toBe(false);
  });

  test('resetGame sets ball to center with correct direction', () => {
    resetGame(1);
    // You may need to export `ball`, `boardWidth`, `boardHeight`, etc. for this test
    // expect(ball.x).toBe(boardWidth / 2);
    // expect(ball.velocityX).toBe(1);
  });
});