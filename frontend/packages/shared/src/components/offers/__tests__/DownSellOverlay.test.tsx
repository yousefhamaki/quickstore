import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { DownSellOverlay } from '../DownSellOverlay';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        clear: () => {
            store = {};
        }
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('DownSellOverlay Exit-Intent', () => {
    let onExitIntentMock: jest.Mock;

    beforeEach(() => {
        onExitIntentMock = jest.fn();
        window.localStorage.clear();
        jest.clearAllMocks();

        // Reset popstate and mouse events attached to window
        document.documentElement.innerHTML = '';
    });

    it('should trigger on desktop when mouse leaves top of viewport (clientY < 20)', () => {
        render(<DownSellOverlay onExitIntent={onExitIntentMock} disabled={false} />);

        // Mouse leave but NOT at the top (clientY = 50) - should NOT trigger
        fireEvent.mouseLeave(document, { clientY: 50 });
        expect(onExitIntentMock).not.toHaveBeenCalled();

        // Mouse leave AT the top (clientY = 10) - should trigger
        fireEvent.mouseLeave(document, { clientY: 10 });
        expect(onExitIntentMock).toHaveBeenCalledTimes(1);

        // Verify localStorage recorded the trigger to prevent spamming
        expect(window.localStorage.getItem('qs_exit_intent_triggered')).toBe('true');

        // Subsequent triggers should be ignored
        fireEvent.mouseLeave(document, { clientY: 5 });
        expect(onExitIntentMock).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should trigger on mobile popstate (back button intercept)', () => {
        // Mock history.pushState
        const pushStateMock = jest.spyOn(window.history, 'pushState');
        
        render(<DownSellOverlay onExitIntent={onExitIntentMock} disabled={false} />);

        // The component pushes a dummy state on mount
        expect(pushStateMock).toHaveBeenCalled();

        // Simulate user pressing back button
        act(() => {
            window.dispatchEvent(new Event('popstate'));
        });

        expect(onExitIntentMock).toHaveBeenCalledTimes(1);
        expect(window.localStorage.getItem('qs_exit_intent_triggered')).toBe('true');

        // Pressing back again shouldn't trigger multiple times
        act(() => {
            window.dispatchEvent(new Event('popstate'));
        });
        expect(onExitIntentMock).toHaveBeenCalledTimes(1);
    });

    it('should NOT trigger any events if disabled=true', () => {
        render(<DownSellOverlay onExitIntent={onExitIntentMock} disabled={true} />);

        fireEvent.mouseLeave(document, { clientY: 10 });
        act(() => {
            window.dispatchEvent(new Event('popstate'));
        });

        expect(onExitIntentMock).not.toHaveBeenCalled();
        expect(window.localStorage.getItem('qs_exit_intent_triggered')).toBeNull();
    });
});
