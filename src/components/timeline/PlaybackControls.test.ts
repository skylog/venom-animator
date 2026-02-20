// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import PlaybackControls from './PlaybackControls.svelte';
import { playbackState } from '$lib/state/playback.svelte';

describe('PlaybackControls', () => {
  beforeEach(() => {
    playbackState.stop();
    playbackState.loop = false;
    playbackState.setDuration(1000);
    // Мокаем requestAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      return 0;
    });
  });

  it('рендерится с кнопками', () => {
    render(PlaybackControls);
    expect(screen.getByTitle('Stop')).toBeTruthy();
    expect(screen.getByTitle('Play')).toBeTruthy();
    expect(screen.getByTitle('Loop')).toBeTruthy();
  });

  it('показывает время 0.000 / 1.000', () => {
    render(PlaybackControls);
    expect(screen.getByText('0.000')).toBeTruthy();
    expect(screen.getByText('1.000')).toBeTruthy();
  });

  it('клик Play переключает на Pause', async () => {
    render(PlaybackControls);
    const playBtn = screen.getByTitle('Play');
    await fireEvent.click(playBtn);

    expect(playbackState.playing).toBe(true);
    // Кнопка должна теперь показывать Pause
    expect(screen.getByTitle('Pause')).toBeTruthy();
  });

  it('клик Stop сбрасывает время', async () => {
    playbackState.seek(500);
    render(PlaybackControls);
    await fireEvent.click(screen.getByTitle('Stop'));

    expect(playbackState.currentTime).toBe(0);
    expect(playbackState.playing).toBe(false);
  });

  it('клик Loop активирует loop', async () => {
    render(PlaybackControls);
    const loopBtn = screen.getByTitle('Loop');
    await fireEvent.click(loopBtn);
    expect(playbackState.loop).toBe(true);
  });

  it('двойной клик Loop деактивирует', async () => {
    render(PlaybackControls);
    const loopBtn = screen.getByTitle('Loop');
    await fireEvent.click(loopBtn);
    expect(playbackState.loop).toBe(true);
    await fireEvent.click(loopBtn);
    expect(playbackState.loop).toBe(false);
  });
});
