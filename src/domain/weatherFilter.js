/**
 * Domain: filtering rules for destinations.
 * Keep behavior identical: null/undefined desiredCondition means no filtering.
 */
export const filterDestinationsByCondition = (destinations, desiredCondition = null) => {
  if (!desiredCondition) return destinations;
  
  // Case-insensitive filtering
  const normalizedCondition = desiredCondition.toLowerCase();
  return destinations.filter((d) => d.condition?.toLowerCase() === normalizedCondition);
};



