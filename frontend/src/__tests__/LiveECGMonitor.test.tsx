import { render } from '@testing-library/react';
import LiveECGMonitor from '@/components/operations/LiveECGMonitor';

describe('LiveECGMonitor worker fallback', () => {
  it('uses the main-thread fallback without attempting a worker when Worker is unavailable', () => {
    vi.stubGlobal('Worker', undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      render(<LiveECGMonitor hr={72} status="Stable" />);

      expect(warn).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize OffscreenCanvas worker'),
        expect.anything(),
      );
    } finally {
      vi.unstubAllGlobals();
      warn.mockRestore();
    }
  });
});
