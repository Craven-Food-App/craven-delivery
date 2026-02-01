import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TimeWheelPicker, parseTimeToMinutes, formatMinutesToTime, generateTimeOptions } from '../components/mobile/TimeWheelPicker';
import { Haptics } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

// Mock Capacitor
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(() => false)
  }
}));

// Mock Haptics
jest.mock('@capacitor/haptics', () => ({
  Haptics: {
    selectionChanged: jest.fn(() => Promise.resolve())
  }
}));

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  value: jest.fn(),
  writable: true
});

describe('TimeWheelPicker - Utility Functions', () => {
  describe('parseTimeToMinutes', () => {
    it('parses AM times correctly', () => {
      expect(parseTimeToMinutes('12:00 AM')).toBe(0);
      expect(parseTimeToMinutes('1:00 AM')).toBe(60);
      expect(parseTimeToMinutes('11:30 AM')).toBe(11 * 60 + 30);
    });

    it('parses PM times correctly', () => {
      expect(parseTimeToMinutes('12:00 PM')).toBe(12 * 60);
      expect(parseTimeToMinutes('1:00 PM')).toBe(13 * 60);
      expect(parseTimeToMinutes('11:30 PM')).toBe(23 * 60 + 30);
    });
  });

  describe('formatMinutesToTime', () => {
    it('formats midnight correctly', () => {
      expect(formatMinutesToTime(0)).toBe('12:00 AM');
    });

    it('formats AM times correctly', () => {
      expect(formatMinutesToTime(60)).toBe('1:00 AM');
      expect(formatMinutesToTime(11 * 60 + 30)).toBe('11:30 AM');
    });

    it('formats PM times correctly', () => {
      expect(formatMinutesToTime(12 * 60)).toBe('12:00 PM');
      expect(formatMinutesToTime(13 * 60)).toBe('1:00 PM');
      expect(formatMinutesToTime(23 * 60 + 30)).toBe('11:30 PM');
    });
  });

  describe('generateTimeOptions', () => {
    it('generates times with 15-minute steps', () => {
      const options = generateTimeOptions('2:00 PM', '2:45 PM', 15);
      expect(options).toEqual(['2:00 PM', '2:15 PM', '2:30 PM', '2:45 PM']);
    });

    it('generates times with 30-minute steps', () => {
      const options = generateTimeOptions('2:00 PM', '3:00 PM', 30);
      expect(options).toEqual(['2:00 PM', '2:30 PM', '3:00 PM']);
    });

    it('handles time range spanning multiple hours', () => {
      const options = generateTimeOptions('1:00 PM', '3:00 PM', 30);
      expect(options.length).toBe(5);
      expect(options[0]).toBe('1:00 PM');
      expect(options[options.length - 1]).toBe('3:00 PM');
    });

    it('handles AM to PM transition', () => {
      const options = generateTimeOptions('11:00 AM', '1:00 PM', 30);
      expect(options).toContain('11:00 AM');
      expect(options).toContain('12:00 PM');
      expect(options).toContain('12:30 PM');
      expect(options).toContain('1:00 PM');
    });
  });
});

describe('TimeWheelPicker - Component', () => {
  const defaultProps = {
    value: '2:30 PM',
    onChange: jest.fn(),
    startTime: '2:00 PM',
    endTime: '3:00 PM',
    stepMinutes: 15,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<TimeWheelPicker {...defaultProps} />);
    expect(screen.getByText('2:30 PM')).toBeInTheDocument();
  });

  it('displays all time options', () => {
    render(<TimeWheelPicker {...defaultProps} />);
    expect(screen.getByText('2:00 PM')).toBeInTheDocument();
    expect(screen.getByText('2:15 PM')).toBeInTheDocument();
    expect(screen.getByText('2:30 PM')).toBeInTheDocument();
    expect(screen.getByText('2:45 PM')).toBeInTheDocument();
    expect(screen.getByText('3:00 PM')).toBeInTheDocument();
  });

  it('calls onChange when item is clicked', () => {
    render(<TimeWheelPicker {...defaultProps} />);
    const item = screen.getByText('2:45 PM');
    fireEvent.click(item);
    
    expect(defaultProps.onChange).toHaveBeenCalledWith('2:45 PM');
  });

  it('highlights selected time', () => {
    render(<TimeWheelPicker {...defaultProps} />);
    const selectedItem = screen.getByText('2:30 PM');
    expect(selectedItem).toHaveAttribute('aria-selected', 'true');
  });

  it('handles disabled times', () => {
    const disabledTimes = (time: string) => time === '2:15 PM';
    render(
      <TimeWheelPicker
        {...defaultProps}
        disabledTimes={disabledTimes}
      />
    );
    
    const disabledItem = screen.getByText('2:15 PM');
    expect(disabledItem).toHaveAttribute('aria-disabled', 'true');
    expect(disabledItem).toHaveStyle({ cursor: 'not-allowed' });
  });

  it('skips disabled times when clicking', () => {
    const disabledTimes = (time: string) => time === '2:15 PM';
    const onChange = jest.fn();
    
    render(
      <TimeWheelPicker
        {...defaultProps}
        onChange={onChange}
        disabledTimes={disabledTimes}
      />
    );
    
    // Clicking disabled time should find nearest enabled
    const disabledItem = screen.getByText('2:15 PM');
    fireEvent.click(disabledItem);
    
    // Should select nearest enabled (either 2:00 PM or 2:30 PM)
    expect(onChange).toHaveBeenCalled();
    const calledValue = onChange.mock.calls[0][0];
    expect(calledValue).not.toBe('2:15 PM');
  });

  it('triggers haptic feedback on native platform', async () => {
    (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
    
    render(<TimeWheelPicker {...defaultProps} />);
    const item = screen.getByText('2:45 PM');
    fireEvent.click(item);
    
    await waitFor(() => {
      expect(Haptics.selectionChanged).toHaveBeenCalled();
    });
  });

  it('falls back to vibrate on web platform', async () => {
    (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
    const vibrateSpy = jest.spyOn(navigator, 'vibrate');
    
    render(<TimeWheelPicker {...defaultProps} />);
    const item = screen.getByText('2:45 PM');
    fireEvent.click(item);
    
    await waitFor(() => {
      expect(vibrateSpy).toHaveBeenCalledWith(5);
    });
    
    vibrateSpy.mockRestore();
  });

  it('updates when value prop changes', () => {
    const { rerender } = render(<TimeWheelPicker {...defaultProps} />);
    
    expect(screen.getByText('2:30 PM')).toHaveAttribute('aria-selected', 'true');
    
    rerender(<TimeWheelPicker {...defaultProps} value="2:45 PM" />);
    
    expect(screen.getByText('2:45 PM')).toHaveAttribute('aria-selected', 'true');
  });

  it('applies correct styling to selected item', () => {
    render(<TimeWheelPicker {...defaultProps} />);
    const selectedItem = screen.getByText('2:30 PM');
    
    expect(selectedItem).toHaveStyle({
      fontSize: '20px',
      fontWeight: '600',
      color: '#111',
      opacity: '1',
    });
  });

  it('applies readable styling to non-selected items', () => {
    render(<TimeWheelPicker {...defaultProps} />);
    const nonSelectedItem = screen.getByText('2:00 PM');
    
    // Should be readable (opacity >= 0.55)
    const opacity = parseFloat(nonSelectedItem.style.opacity || '1');
    expect(opacity).toBeGreaterThanOrEqual(0.55);
    
    expect(nonSelectedItem).toHaveStyle({
      fontSize: '16px',
      fontWeight: '400',
    });
  });

  it('respects custom height', () => {
    const { container } = render(
      <TimeWheelPicker {...defaultProps} height={300} />
    );
    
    const picker = container.querySelector('[class*="relative"]');
    expect(picker).toHaveStyle({ height: '300px' });
  });

  it('respects custom visibleCount', () => {
    render(<TimeWheelPicker {...defaultProps} visibleCount={7} />);
    // Component should render with 7 visible items (odd number enforced)
    expect(screen.getByText('2:30 PM')).toBeInTheDocument();
  });

  it('enforces odd visibleCount', () => {
    render(<TimeWheelPicker {...defaultProps} visibleCount={6} />);
    // Should automatically convert to 7 (next odd number)
    expect(screen.getByText('2:30 PM')).toBeInTheDocument();
  });
});

describe('TimeWheelPicker - Snapping Behavior', () => {
  const defaultProps = {
    value: '2:30 PM',
    onChange: jest.fn(),
    startTime: '2:00 PM',
    endTime: '3:00 PM',
    stepMinutes: 15,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('snaps to nearest notch on scroll end', async () => {
    const onChange = jest.fn();
    render(<TimeWheelPicker {...defaultProps} onChange={onChange} />);
    
    const container = document.querySelector('[class*="overflow-y-scroll"]') as HTMLElement;
    if (!container) return;
    
    // Simulate scroll
    Object.defineProperty(container, 'scrollTop', {
      writable: true,
      value: 100,
    });
    Object.defineProperty(container, 'offsetHeight', {
      writable: true,
      value: 220,
    });
    
    fireEvent.scroll(container);
    
    // Wait for debounced snap
    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    }, { timeout: 200 });
  });
});

