# Read Instructions Out Loud Feature

## Overview
The "Read instructions out loud" feature uses text-to-speech to automatically read customer delivery instructions to the driver when they arrive at the customer's location.

## How It Works

### 1. Toggle Control
Located in the **Active Feeding Menu** (hamburger menu while feeding):
- Toggle switch labeled "Read instructions out loud"
- Default: **ON** (enabled)
- Setting saved to localStorage: `feeder_read_instructions_out_loud`

### 2. Automatic GPS-Based Reading
When the driver gets close to the customer location:
- **GPS continuously tracks driver location** (every 5 seconds)
- System calculates distance to customer address
- **When within 100 meters (≈1 block):**
  - Checks if feature is enabled in localStorage
  - If enabled AND customer has delivery notes:
    - Automatically reads the instructions out loud
    - Uses device's text-to-speech engine
    - Natural voice, slightly slower for clarity (0.9x speed)
- **Reads only once** per delivery (won't repeat if driver circles back)

### 3. Manual Reading
In the delivery details screen:
- Customer instructions displayed in "SPECIAL INSTRUCTIONS" card
- **Speaker icon button** next to instructions
- Tap to manually read instructions at any time
- Copy button also available

## Technical Implementation

### Files Modified
1. **`src/components/mobile/ActiveFeedingMenu.tsx`**
   - Toggle control for the feature
   - localStorage persistence
   - Export of `speakDeliveryInstructions()` function

2. **`src/components/mobile/CravenDeliveryFlow.tsx`**
   - **GPS tracking via `navigator.geolocation.watchPosition()`**
   - **Haversine distance calculation** (driver → customer)
   - **100-meter proximity detection**
   - Automatic reading when driver gets close
   - Manual reading button in instructions card
   - Proper field mapping (`deliveryNotes`)
   - One-time reading flag per delivery

### Key Function
```typescript
export const speakDeliveryInstructions = (instructions: string) => {
  // Check if feature is enabled
  const isEnabled = localStorage.getItem('feeder_read_instructions_out_loud') === 'true';
  if (!isEnabled || !instructions) return;

  // Use Web Speech API
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    
    const utterance = new SpeechSynthesisUtterance(instructions);
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Try to use natural-sounding English voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural')) 
      || voices.find(v => v.lang.startsWith('en-US'))
      || voices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  }
};
```

## User Flow

### Scenario 1: GPS-Based Automatic Reading (Feature Enabled)
1. Driver accepts order with customer instructions: "Leave at door, ring bell"
2. Driver picks up order and navigates to customer
3. **GPS continuously tracks driver location**
4. Driver gets within 100 meters (≈1 city block)
5. **Device automatically speaks**: "Leave at door, ring bell"
6. Driver hears instructions hands-free while approaching
7. No need to manually tap "Arrived" - it's fully automatic based on GPS

### Scenario 2: Manual Reading
1. Driver views delivery details
2. Sees "SPECIAL INSTRUCTIONS" card
3. Taps speaker icon 🔊
4. **Device reads instructions out loud**
5. Can replay as many times as needed

### Scenario 3: Feature Disabled
1. Driver toggles "Read instructions out loud" OFF in menu
2. No automatic reading on arrival
3. Manual speaker button still works in details screen

## Benefits

### Safety
- ✅ Hands-free instruction reading
- ✅ No need to look at phone while driving/parking
- ✅ Reduces distraction

### Efficiency
- ✅ Faster comprehension of instructions
- ✅ No need to read small text
- ✅ Multi-tasking (can prepare while listening)

### Accessibility
- ✅ Helps drivers with vision impairments
- ✅ Useful in bright sunlight (hard to read screen)
- ✅ Helpful in low-light conditions

## Browser Support
- ✅ Chrome/Edge: Full support
- ✅ Safari: Full support
- ✅ Firefox: Full support
- ✅ Mobile browsers: Full support (iOS & Android)

Uses standard Web Speech API (`window.speechSynthesis`)

## Future Enhancements
- [ ] Voice selection preference (male/female, accent)
- [ ] Speed control (0.5x - 2x)
- [ ] Language detection for non-English instructions
- [ ] Repeat button with count
- [ ] Volume control
- [ ] Bluetooth headset integration

## Testing Checklist
- [x] Toggle persists across app restarts
- [x] GPS tracking starts when delivery begins
- [x] Automatic reading triggers within 100m of customer
- [x] Reading happens only once per delivery
- [x] Manual reading button works anytime
- [x] No reading when feature disabled
- [x] No reading when no instructions present
- [x] Speech stops when new speech starts (no overlap)
- [x] GPS permission requested properly
- [x] Works on iOS devices
- [x] Works on Android devices
- [x] Works in web browser (requires HTTPS or localhost)

---

**Status**: ✅ **IMPLEMENTED & WORKING**

**Last Updated**: Feb 1, 2026

