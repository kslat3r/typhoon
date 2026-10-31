import { describe, expect, it } from 'vitest';
import speedFromWatts from '@/lib/client/helpers/speed-from-watts';
import {
  advanceDisplayWindow,
  DISPLAY_WINDOW_SECONDS,
  emptyDisplayWindow,
  ignoreDisplaySample,
  recordDisplaySample,
} from '@/lib/client/helpers/display-window';
import type { BikeSample } from '@/lib/client/models/types';

function sample(watts: number, rpm: number | null, receivedAt: number): BikeSample {
  return { watts, rpm, receivedAt };
}

describe('display window', () => {
  it('holds the window open until five seconds of samples have elapsed', () => {
    // Arrange
    let window = recordDisplaySample(emptyDisplayWindow(), sample(120, 80, 1));

    // Act
    const early = advanceDisplayWindow(window, DISPLAY_WINDOW_SECONDS - 0.25);

    // Assert
    expect(early.published).toBeNull();
    expect(early.state.elapsedSeconds).toBeCloseTo(4.75);
    expect(early.state.watts).toEqual([120]);
    window = early.state;

    // Act
    const closed = advanceDisplayWindow(window, 0.25);

    // Assert
    expect(closed.published).toEqual({
      watts: 120,
      rpm: 80,
      mph: speedFromWatts(120),
    });
    expect(closed.state.elapsedSeconds).toBe(0);
    expect(closed.state.watts).toEqual([]);
  });

  it('averages every sample received in the window once, including a reported zero', () => {
    // Arrange
    const readings: BikeSample[] = [
      sample(100, 80, 1),
      sample(200, 100, 2),
      sample(0, 0, 3),
      sample(200, null, 2),
    ];
    let window = emptyDisplayWindow();
    for (const reading of readings) {
      window = recordDisplaySample(window, reading);
    }

    // Act
    const closed = advanceDisplayWindow(window, 5);

    // Assert
    expect(closed.published).toEqual({
      watts: 100,
      rpm: 60,
      mph: (speedFromWatts(100) + speedFromWatts(200) + speedFromWatts(0)) / 3,
    });
  });

  it('keeps the previous reading when a window contains no samples', () => {
    // Arrange
    const window = recordDisplaySample(emptyDisplayWindow(), null);

    // Act
    const closed = advanceDisplayWindow(window, 5);

    // Assert
    expect(closed.published).toBe('hold');
    expect(closed.state.watts).toEqual([]);
    expect(closed.state.rpms).toEqual([]);
  });

  it('starts the next window empty and carries leftover time', () => {
    // Arrange
    let window = recordDisplaySample(emptyDisplayWindow(), sample(150, 90, 4));

    // Act
    const first = advanceDisplayWindow(window, 7.25);
    window = recordDisplaySample(first.state, sample(50, 70, 5));
    const second = advanceDisplayWindow(window, 2.75);

    // Assert
    expect(first.published).toMatchObject({ watts: 150 });
    expect(first.state.elapsedSeconds).toBeCloseTo(2.25);
    expect(second.published).toEqual({
      watts: 50,
      rpm: 70,
      mph: speedFromWatts(50),
    });
  });

  it('publishes one average when several windows elapse at once', () => {
    // Arrange
    const window = recordDisplaySample(emptyDisplayWindow(), sample(40, 60, 8));

    // Act
    const closed = advanceDisplayWindow(window, 12);

    // Assert
    expect(closed.published).toMatchObject({ watts: 40, rpm: 60 });
    expect(closed.state.elapsedSeconds).toBe(2);
    expect(closed.state.watts).toEqual([]);
  });

  it('can ignore a sample without treating it as zero', () => {
    // Arrange
    let window = recordDisplaySample(emptyDisplayWindow(), sample(180, 90, 1));
    window = ignoreDisplaySample(window, 2);
    window = recordDisplaySample(window, sample(0, 0, 2));

    // Act
    const closed = advanceDisplayWindow(window, 5);

    // Assert
    expect(closed.published).toMatchObject({ watts: 180, rpm: 90 });
  });
});
