/**
 * Display defaults for the 365 CraveMore referral prize section.
 * Eligibility + qualifying counts still come only from the backend.
 */
export const NEW_CUSTOMER_365_PROMO = {
  promotionKey: 'new_customer_365_cravemore_referral_promotion',
  title: 'Refer Friends. Earn 365 Days of Free Delivery.',
  prizeLabel: 'Prize: 365 days of CraveMore',
  prizeDetail: '$0 eligible delivery fees for one full year — no paid renewal unless you choose it later.',
  howToTitle: 'How you earn it',
  steps: [
    'Share your Crave’n invite link or referral code with friends who are new to Crave’n.',
    'Each friend signs up with your link and places a qualifying first order.',
    'When that order completes, it counts as one qualifying referral toward your prize.',
    'Hit the required number of qualifying referrals to unlock 365 days of CraveMore free delivery.',
  ] as const,
  existingRewardsNote:
    'Your normal referral credits still apply on every qualifying invite. The year of free delivery is an extra prize on top.',
  ineligibleNote:
    'Enrollment for this prize is for eligible new Crave’n customers during the promotional period. You can still share your link and earn standard referral rewards below.',
  unavailableNote:
    'We’re connecting to the prize tracker. You can still share your invite link below — progress updates once the offer is live for your account.',
  defaultRequiredCount: 5,
} as const;
