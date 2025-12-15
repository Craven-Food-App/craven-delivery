/**
 * Promotion Eligibility Gates
 * Implements the state machine and eligibility checks for intern → acting exec → exec promotions
 */

import { supabase } from '@/integrations/supabase/client';

export const PROMOTION_THRESHOLD_RATING = 80; // Minimum rating to be eligible for promotion

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  missingRequirements: string[];
}

/**
 * Check if an intern is eligible for promotion to Acting Executive
 */
export async function checkActingExecEligibility(engagementId: string): Promise<EligibilityResult> {
  const reasons: string[] = [];
  const missingRequirements: string[] = [];

  try {
    // Fetch engagement
    const { data: engagement, error: engError } = await supabase
      .from('promotion_engagements')
      .select('*')
      .eq('id', engagementId)
      .single();

    if (engError || !engagement) {
      return {
        eligible: false,
        reasons: ['Engagement not found'],
        missingRequirements: ['Valid engagement record'],
      };
    }

    // Check if reviews are blocking promotion
    if (engagement.is_review_blocked) {
      missingRequirements.push('Overdue performance reviews must be completed before promotion');
    }

    // Check for overdue blocking reviews
    const { data: overdueReviews } = await supabase
      .from('promotion_review_schedules')
      .select('id, review_type')
      .eq('engagement_id', engagementId)
      .eq('status', 'OVERDUE')
      .eq('is_blocking', true);

    if (overdueReviews && overdueReviews.length > 0) {
      missingRequirements.push(
        `${overdueReviews.length} overdue blocking review(s) must be completed: ${overdueReviews.map(r => r.review_type).join(', ')}`
      );
    }

    // Check current stage
    if (engagement.current_stage !== 'INTERN_ACTIVE') {
      missingRequirements.push(`Current stage must be INTERN_ACTIVE (currently: ${engagement.current_stage})`);
    } else {
      reasons.push('✓ Currently in INTERN_ACTIVE stage');
    }

    // Fetch latest performance review
    const { data: reviews, error: reviewsError } = await supabase
      .from('promotion_performance_reviews')
      .select('*')
      .eq('engagement_id', engagementId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (reviewsError || !reviews || reviews.length === 0) {
      missingRequirements.push('No performance review found');
    } else {
      const latestReview = reviews[0];
      
      // Check rating threshold
      if (latestReview.rating >= PROMOTION_THRESHOLD_RATING) {
        reasons.push(`✓ Performance rating ${latestReview.rating}/100 meets threshold (${PROMOTION_THRESHOLD_RATING})`);
      } else {
        missingRequirements.push(
          `Performance rating ${latestReview.rating}/100 is below threshold (${PROMOTION_THRESHOLD_RATING})`
        );
      }

      // Check recommendation
      if (latestReview.recommendation === 'PROMOTE_ACTING') {
        reasons.push('✓ Performance review recommends promotion to Acting Executive');
      } else if (latestReview.recommendation) {
        missingRequirements.push(`Performance review recommendation: ${latestReview.recommendation} (required: PROMOTE_ACTING)`);
      }

      // Check deliverables
      if (latestReview.deliverables_complete) {
        reasons.push('✓ All required deliverables completed');
      } else {
        missingRequirements.push('Deliverables checklist not completed');
      }
    }

    const eligible = missingRequirements.length === 0;

    return {
      eligible,
      reasons: eligible ? reasons : [...reasons, ...missingRequirements],
      missingRequirements,
    };
  } catch (error) {
    console.error('Error checking eligibility:', error);
    return {
      eligible: false,
      reasons: ['Error checking eligibility'],
      missingRequirements: ['System error'],
    };
  }
}

/**
 * Check if an acting executive is eligible for permanent executive promotion
 */
export async function checkPermanentExecEligibility(engagementId: string): Promise<EligibilityResult> {
  const reasons: string[] = [];
  const missingRequirements: string[] = [];

  try {
    // Fetch engagement
    const { data: engagement, error: engError } = await supabase
      .from('promotion_engagements')
      .select('*')
      .eq('id', engagementId)
      .single();

    if (engError || !engagement) {
      return {
        eligible: false,
        reasons: ['Engagement not found'],
        missingRequirements: ['Valid engagement record'],
      };
    }

    // Check current stage
    if (engagement.current_stage !== 'ACTING_ACTIVE') {
      missingRequirements.push(`Current stage must be ACTING_ACTIVE (currently: ${engagement.current_stage})`);
    } else {
      reasons.push('✓ Currently in ACTING_ACTIVE stage');
    }

    // Check if acting term has been completed
    if (engagement.end_date) {
      const endDate = new Date(engagement.end_date);
      const today = new Date();
      if (endDate <= today) {
        reasons.push('✓ Acting term has been completed');
      } else {
        missingRequirements.push(`Acting term not yet completed (ends: ${endDate.toLocaleDateString()})`);
      }
    } else {
      missingRequirements.push('No end date set for acting term');
    }

    // Check performance reviews during acting term
    const { data: reviews, error: reviewsError } = await supabase
      .from('promotion_performance_reviews')
      .select('*')
      .eq('engagement_id', engagementId)
      .gte('created_at', engagement.start_date)
      .order('created_at', { ascending: false });

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
    } else if (reviews && reviews.length > 0) {
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      if (avgRating >= PROMOTION_THRESHOLD_RATING) {
        reasons.push(`✓ Average performance rating during acting term: ${avgRating.toFixed(1)}/100`);
      } else {
        missingRequirements.push(`Average performance rating ${avgRating.toFixed(1)}/100 is below threshold`);
      }

      // Check if all reviews recommend promotion
      const allRecommendPromotion = reviews.every(r => r.recommendation === 'PROMOTE_ACTING' || r.recommendation === 'EXTEND');
      if (allRecommendPromotion) {
        reasons.push('✓ All performance reviews recommend promotion or extension');
      } else {
        missingRequirements.push('Not all performance reviews recommend promotion');
      }
    } else {
      missingRequirements.push('No performance reviews found during acting term');
    }

    const eligible = missingRequirements.length === 0;

    return {
      eligible,
      reasons: eligible ? reasons : [...reasons, ...missingRequirements],
      missingRequirements,
    };
  } catch (error) {
    console.error('Error checking eligibility:', error);
    return {
      eligible: false,
      reasons: ['Error checking eligibility'],
      missingRequirements: ['System error'],
    };
  }
}

/**
 * Check for title collision (enforce "Deputy / Head of ... / Chief of Staff" naming if needed)
 */
export async function checkTitleCollision(newTitle: string, excludeEngagementId?: string): Promise<boolean> {
  try {
    const query = supabase
      .from('promotion_engagements')
      .select('current_title')
      .eq('current_title', newTitle)
      .in('current_stage', ['ACTING_ACTIVE', 'EXEC_ACTIVE']);

    if (excludeEngagementId) {
      query.neq('id', excludeEngagementId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking title collision:', error);
      return false; // Assume no collision on error
    }

    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('Error checking title collision:', error);
    return false;
  }
}

/**
 * Suggest non-colliding title variations
 */
export function suggestTitleVariations(baseTitle: string): string[] {
  const variations = [
    `Acting ${baseTitle}`,
    `Deputy ${baseTitle}`,
    `Head of ${baseTitle}`,
    `${baseTitle} (Acting)`,
  ];
  return variations;
}

/**
 * Check if user can view compensation package based on visibility controls
 */
export async function canViewCompensation(
  compPackageId: string,
  viewerUserId: string
): Promise<boolean> {
  try {
    const { data: comp, error } = await supabase
      .from('promotion_comp_packages')
      .select(`
        visibility_level,
        engagement:promotion_engagements!inner(
          person_id,
          employees!inner(user_id)
        )
      `)
      .eq('id', compPackageId)
      .single();

    if (error || !comp) return false;

    const visibility = comp.visibility_level || 'CEO_CFO';
    const personUserId = comp.engagement?.employees?.user_id;

    // Individual can always view their own
    if (personUserId === viewerUserId) return true;

    // Check if viewer is CEO/CFO
    const { data: execUser } = await supabase
      .from('exec_users')
      .select('role')
      .eq('user_id', viewerUserId)
      .single();

    if (execUser?.role === 'ceo' || execUser?.role === 'cfo') {
      return visibility !== 'INDIVIDUAL_ONLY';
    }

    // Only CEO can view PRIVATE packages
    return visibility === 'PRIVATE' && execUser?.role === 'ceo';
  } catch (error) {
    console.error('Error checking compensation visibility:', error);
    return false;
  }
}

