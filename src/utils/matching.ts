import {
  Application,
  Brief,
  CampaignBrief,
  CommercialUse,
  CreatorLicensingTerms,
  CreatorProfile,
  FilterState,
  PortfolioLicenseType,
} from '../types';

export interface MatchingWeights {
  niche: number;
  skillsAndDeliverables: number;
  budget: number;
  audienceSize: number;
  engagement: number;
  locationAndLanguage: number;
  verificationAndTrust: number;
  commercialRights: number;
}

export const DEFAULT_MATCHING_WEIGHTS: MatchingWeights = {
  niche: 22,
  skillsAndDeliverables: 20,
  budget: 14,
  audienceSize: 12,
  engagement: 10,
  locationAndLanguage: 10,
  verificationAndTrust: 7,
  commercialRights: 5,
};

export interface MandatoryCriteriaConfig {
  niche?: boolean;
  deliverables?: boolean;
  budget?: boolean;
  audienceSize?: boolean;
  location?: boolean;
  language?: boolean;
  verified?: boolean;
  commercialRights?: boolean;
}

export interface CampaignMatchInput {
  /** Active filter state from CreatorsPage */
  filters?: FilterState;
  /** Optional target Brief to match against */
  brief?: Brief | CampaignBrief | null;
  /** Direct criteria overrides (used by CreatorsPage & tests) */
  niches?: string[];
  deliverables?: string[];
  requiredDeliverables?: string[];
  platforms?: string[];
  regions?: string[];
  countries?: string[];
  cities?: string[];
  languages?: string[];
  maxHourlyRate?: number;
  maxTotalBudget?: number;
  minFollowers?: number;
  maxFollowers?: number;
  /** Minimum engagement rate % preference/requirement */
  minEngagementRate?: number;
  requireVerified?: boolean;
  /** Require commercial licensing clearance */
  requireCommercialRights?: boolean;
  /** Require exclusive licensing */
  requireExclusivity?: 'exclusive' | 'non-exclusive' | 'limited' | boolean;
  /** Which criteria are strictly mandatory vs. weighted preferences */
  mandatory?: MandatoryCriteriaConfig;
  mandatoryCriteria?: Array<
    'niche' | 'deliverables' | 'skills' | 'budget' | 'audience' | 'audienceSize' | 'location' | 'language' | 'verification' | 'verified' | 'commercialRights'
  >;
  mandatoryNiche?: boolean;
  mandatoryDeliverables?: boolean;
  mandatoryBudget?: boolean;
  mandatoryLocation?: boolean;
  mandatoryFollowers?: boolean;
  mandatoryVerified?: boolean;
  mandatoryCommercialRights?: boolean;
  /** Custom weight overrides */
  weights?: Partial<MatchingWeights>;
}

export type CampaignMatchCriteria = CampaignMatchInput;

export interface MatchFactorDetail {
  key: keyof MatchingWeights;
  label: string;
  earnedPoints: number;
  maxPoints: number;
  score: number;
  maxScore: number;
  satisfied: boolean;
  status: 'satisfied' | 'partial' | 'missing';
  isMandatory: boolean;
  reason: string;
}

export interface CommercialCompatibilityResult {
  compatible: boolean;
  conflicts: string[];
  warnings: string[];
  aiContentDetected: boolean;
  aiToolsDisclosed: string[];
  effectiveTerms: CommercialUse;
}

export interface CreatorMatchEvaluation {
  score: number;
  totalScore: number;
  overallScore: number;
  mandatoryMet: boolean;
  meetsAllMandatory: boolean;
  avgEngagement: number;
  factors: MatchFactorDetail[];
  satisfiedReasons: string[];
  satisfiedRequirements: string[];
  missingRequirements: string[];
  mandatoryFailures: string[];
  commercialCompatibility: CommercialCompatibilityResult;
  licensingCompatibility: CommercialCompatibilityResult;
}

export interface ProposalCommercialOverride {
  creatorLicensingTerms?: CreatorLicensingTerms;
  portfolioItemIds?: string[];
  aiDisclosure?: Application['aiDisclosure'];
  proposedLicenseType?: PortfolioLicenseType;
  exclusivityGranted?: boolean;
  includesAiContent?: boolean;
  aiToolsUsed?: string[];
}

export function getCreatorAvgEngagement(creator: CreatorProfile): number {
  if (!creator.platforms || creator.platforms.length === 0) return 0;
  const validRates = creator.platforms
    .map((p) => (typeof p.engagementRate === 'number' && p.engagementRate > 0 ? p.engagementRate : 0))
    .filter((r) => r > 0);
  if (validRates.length === 0) return 0;
  const sum = validRates.reduce((acc, r) => acc + r, 0);
  return Number((sum / validRates.length).toFixed(1));
}

export function detectCreatorAiUsage(creator: CreatorProfile, portfolioItemIds?: string[]): {
  usesAi: boolean;
  tools: string[];
  hasUnrestrictedAiCommercialRights: boolean;
} {
  const aiNiches = creator.niches?.filter((n) => n.toLowerCase().includes('ai ')) ?? [];
  const itemsToInspect =
    portfolioItemIds && portfolioItemIds.length > 0
      ? (creator.portfolioItems ?? []).filter((item) => portfolioItemIds.includes(item.id))
      : creator.portfolioItems ?? [];

  const licensing = creator.defaultLicensing ?? creator.licensingTerms;
  const toolSet = new Set<string>();
  licensing?.aiToolsUsed?.forEach((t) => toolSet.add(t));
  licensing?.primaryAiTools?.forEach((t) => toolSet.add(t));
  licensing?.disclosedAiTools?.forEach((t) => toolSet.add(t));
  itemsToInspect.forEach((item) => {
    item.tools?.forEach((t) => toolSet.add(t));
  });

  const usesAi =
    aiNiches.length > 0 ||
    Boolean(licensing?.aiAssisted) ||
    Boolean(licensing?.aiAssistedWorkflow) ||
    Boolean(licensing?.usesAiTools) ||
    itemsToInspect.some((item) => Boolean(item.aiGenerated) || (item.tools && item.tools.length > 0));

  // Never assume AI-generated content automatically has unrestricted commercial rights:
  // It must have explicit commercialLicense === true AND licenseType !== 'editorial_only'
  const commercialClearedItems = itemsToInspect.filter(
    (item) => item.commercialLicense === true && item.licenseType !== 'editorial_only',
  );
  const hasUnrestrictedAiCommercialRights = usesAi
    ? itemsToInspect.length > 0 && commercialClearedItems.length === itemsToInspect.length
    : itemsToInspect.some((item) => item.commercialLicense === true);

  return {
    usesAi,
    tools: Array.from(toolSet),
    hasUnrestrictedAiCommercialRights,
  };
}

function isCreatorProfile(val: unknown): val is CreatorProfile {
  return Boolean(val && typeof val === 'object' && 'niches' in val && 'platforms' in val && 'hourlyRate' in val);
}

function extractCommercialFromBriefOrUse(
  briefOrUse: CommercialUse | Brief | CampaignBrief | undefined,
  creator: CreatorProfile,
): CommercialUse {
  if (!briefOrUse) {
    return {
      allowed: true,
      exclusivity: 'non-exclusive',
      licenseDuration: '6 months',
      territory: 'Global',
      platforms: creator.platforms?.map((p) => p.platform) ?? [],
    };
  }
  if ('allowed' in briefOrUse && 'exclusivity' in briefOrUse) {
    return {
      ...briefOrUse,
      allowAiContent:
        briefOrUse.allowAiContent ?? briefOrUse.allowAiGeneratedContent ?? true,
    };
  }
  const b = briefOrUse as Brief | CampaignBrief;
  if (b.commercialUse) {
    return {
      ...b.commercialUse,
      allowAiContent:
        b.commercialUse.allowAiContent ??
        b.commercialUse.allowAiGeneratedContent ??
        b.licensingRequirements?.allowAiGeneratedContent ??
        true,
      requireAiDisclosure:
        b.commercialUse.requireAiDisclosure ??
        b.licensingRequirements?.requireAiToolDisclosure ??
        true,
    };
  }
  return {
    allowed: true,
    exclusivity: b.licensingRequirements?.exclusivityRequired ? 'exclusive' : 'non-exclusive',
    licenseDuration: b.licensingRequirements?.usageDuration ?? '12 months',
    territory: b.licensingRequirements?.territories?.[0] ?? 'Global',
    platforms: b.platform ?? b.platforms ?? [],
    allowAiContent: b.licensingRequirements?.allowAiGeneratedContent ?? true,
    requireAiDisclosure: b.licensingRequirements?.requireAiToolDisclosure ?? true,
  };
}

export function checkCommercialCompatibility(
  firstArg: CommercialUse | Brief | CampaignBrief | CreatorProfile | undefined,
  secondArg: CreatorProfile | Brief | CampaignBrief | CommercialUse | undefined,
  thirdArg?:
    | Pick<Application, 'creatorLicensingTerms' | 'portfolioItemIds' | 'aiDisclosure'>
    | CreatorLicensingTerms
    | ProposalCommercialOverride,
): CommercialCompatibilityResult {
  let creator: CreatorProfile;
  let requiredCommercial: CommercialUse;

  if (isCreatorProfile(firstArg)) {
    creator = firstArg;
    requiredCommercial = extractCommercialFromBriefOrUse(
      secondArg as Brief | CampaignBrief | CommercialUse | undefined,
      creator,
    );
  } else {
    creator = secondArg as CreatorProfile;
    requiredCommercial = extractCommercialFromBriefOrUse(
      firstArg as CommercialUse | Brief | CampaignBrief | undefined,
      creator,
    );
  }

  const conflicts: string[] = [];
  const warnings: string[] = [];

  // Normalize thirdArg into override & creatorTerms
  let portfolioItemIds: string[] | undefined;
  let creatorTerms: CreatorLicensingTerms | undefined =
    creator.defaultLicensing ?? creator.licensingTerms;
  let proposedOverride: ProposalCommercialOverride | undefined;

  if (thirdArg && typeof thirdArg === 'object') {
    if (
      'proposedLicenseType' in thirdArg ||
      'exclusivityGranted' in thirdArg ||
      'includesAiContent' in thirdArg ||
      'creatorLicensingTerms' in thirdArg ||
      'portfolioItemIds' in thirdArg
    ) {
      proposedOverride = thirdArg as ProposalCommercialOverride;
      portfolioItemIds = proposedOverride.portfolioItemIds;
      if (proposedOverride.creatorLicensingTerms) {
        creatorTerms = proposedOverride.creatorLicensingTerms;
      } else if (
        proposedOverride.proposedLicenseType !== undefined ||
        proposedOverride.exclusivityGranted !== undefined ||
        proposedOverride.includesAiContent !== undefined
      ) {
        creatorTerms = {
          ...creatorTerms,
          defaultLicenseType: proposedOverride.proposedLicenseType,
          commercialAllowed: proposedOverride.proposedLicenseType !== 'editorial_only',
          exclusivity: proposedOverride.exclusivityGranted ? 'exclusive' : 'non-exclusive',
          allowsExclusivity: proposedOverride.exclusivityGranted,
          exclusivityAvailable: proposedOverride.exclusivityGranted,
          usesAiTools: proposedOverride.includesAiContent,
          aiAssisted: proposedOverride.includesAiContent,
          aiToolsUsed: proposedOverride.aiToolsUsed,
        };
      }
    } else {
      creatorTerms = thirdArg as CreatorLicensingTerms;
    }
  }

  const aiInfo = detectCreatorAiUsage(creator, portfolioItemIds);
  const usesAiEffective =
    aiInfo.usesAi ||
    Boolean(creatorTerms?.usesAiTools) ||
    Boolean(creatorTerms?.aiAssisted) ||
    Boolean(creatorTerms?.aiAssistedWorkflow) ||
    Boolean(proposedOverride?.includesAiContent);

  const toolsEffective = Array.from(
    new Set([
      ...aiInfo.tools,
      ...(creatorTerms?.aiToolsUsed ?? []),
      ...(creatorTerms?.primaryAiTools ?? []),
      ...(creatorTerms?.disclosedAiTools ?? []),
      ...(proposedOverride?.aiToolsUsed ?? []),
    ]),
  );

  const selectedItems =
    portfolioItemIds && portfolioItemIds.length > 0
      ? (creator.portfolioItems ?? []).filter((item) => portfolioItemIds.includes(item.id))
      : creator.portfolioItems ?? [];

  const hasCommercialPortfolio = selectedItems.some(
    (item) => item.commercialLicense === true && item.licenseType !== 'editorial_only',
  );
  const hasEditorialOnlySelected = selectedItems.some(
    (item) => item.commercialLicense === false || item.licenseType === 'editorial_only',
  );

  const creatorAllowsCommercial =
    creatorTerms?.commercialAllowed ??
    creatorTerms?.commercialUseAllowed ??
    (creatorTerms?.defaultLicenseType
      ? creatorTerms.defaultLicenseType !== 'editorial_only'
      : undefined);

  const creatorAllowsExclusive =
    creatorTerms?.exclusivity === 'exclusive' ||
    creatorTerms?.allowsExclusivity === true ||
    creatorTerms?.exclusivityAvailable === true ||
    creatorTerms?.defaultLicenseType === 'commercial_exclusive';

  const creatorDeniesExclusive =
    creatorTerms !== undefined &&
    (creatorTerms.exclusivity === 'non-exclusive' ||
      creatorTerms.exclusivity === 'limited' ||
      creatorTerms.allowsExclusivity === false ||
      creatorTerms.exclusivityAvailable === false ||
      creatorTerms.defaultLicenseType === 'editorial_only' ||
      creatorTerms.defaultLicenseType === 'commercial_non_exclusive');

  if (requiredCommercial.allowed) {
    if (creatorAllowsCommercial === false) {
      conflicts.push(
        'Creator or portfolio licensing terms are marked Editorial-Only and do not permit commercial ad usage.',
      );
    } else if (!creatorTerms && selectedItems.length === 0) {
      warnings.push('Creator has no commercial portfolio items or explicit licensing policy on file.');
    } else if (hasEditorialOnlySelected && creatorAllowsCommercial !== true) {
      conflicts.push('One or more attached portfolio items are marked Editorial / Non-Commercial only.');
    } else if (!hasCommercialPortfolio && creatorAllowsCommercial !== true) {
      conflicts.push('Creator has not granted commercial usage clearance for their work.');
    }
  }

  if (requiredCommercial.exclusivity === 'exclusive') {
    if (creatorDeniesExclusive && !creatorAllowsExclusive) {
      conflicts.push(
        'Campaign requires Exclusive commercial rights, but creator/proposal terms do not grant exclusivity.',
      );
    }
    const nonExclusiveItems = selectedItems.filter(
      (item) => item.licenseType === 'commercial_non_exclusive' || item.licenseType === 'editorial_only',
    );
    if (nonExclusiveItems.length > 0 && !creatorTerms) {
      warnings.push('Selected portfolio items are licensed as non-exclusive; confirm exclusive buyout terms.');
    }
  }

  if (requiredCommercial.allowAiContent === false && usesAiEffective) {
    conflicts.push('Campaign prohibits AI-generated content, but creator utilizes AI tools/workflows.');
  }

  if (usesAiEffective) {
    warnings.push(
      'AI content does not automatically carry unrestricted commercial copyright; confirm underlying tool terms and rights.',
    );
    if (!aiInfo.hasUnrestrictedAiCommercialRights && creatorAllowsCommercial !== true) {
      conflicts.push(
        'AI-assisted content requires explicit commercial rights verification; unrestricted rights cannot be assumed.',
      );
    }
    if (
      requiredCommercial.requireAiDisclosure &&
      !proposedOverride?.aiDisclosure &&
      !creatorTerms?.aiDisclosureNotes &&
      toolsEffective.length === 0
    ) {
      warnings.push('Campaign requires AI tool/workflow disclosure prior to contract signoff.');
    }
  }

  if (creatorTerms?.platforms && creatorTerms.platforms.length > 0 && requiredCommercial.platforms.length > 0) {
    const missingPlatforms = requiredCommercial.platforms.filter(
      (plat) => !creatorTerms!.platforms!.some((cp) => cp.toLowerCase() === plat.toLowerCase()),
    );
    if (missingPlatforms.length > 0) {
      conflicts.push(
        `Campaign requires licensing on ${missingPlatforms.join(', ')}, which is outside creator's permitted platforms.`,
      );
    }
  }

  const effectiveTerms: CommercialUse = {
    allowed: creatorAllowsCommercial !== undefined ? creatorAllowsCommercial : requiredCommercial.allowed && hasCommercialPortfolio,
    exclusivity: creatorAllowsExclusive ? 'exclusive' : 'non-exclusive',
    licenseDuration:
      creatorTerms?.permittedDuration ||
      creatorTerms?.maxLicenseDuration ||
      creatorTerms?.defaultUsageDuration ||
      requiredCommercial.licenseDuration,
    territory:
      creatorTerms?.territory ||
      creatorTerms?.territories?.[0] ||
      requiredCommercial.territory,
    platforms:
      creatorTerms?.platforms && creatorTerms.platforms.length > 0
        ? creatorTerms.platforms
        : requiredCommercial.platforms,
    allowAiContent: usesAiEffective,
    requireAiDisclosure: usesAiEffective,
  };

  return {
    compatible: conflicts.length === 0,
    conflicts,
    warnings,
    aiContentDetected: usesAiEffective,
    aiToolsDisclosed: toolsEffective,
    effectiveTerms,
  };
}

function isBriefObject(val: unknown): val is Brief | CampaignBrief {
  return Boolean(
    val &&
      typeof val === 'object' &&
      'title' in val &&
      'budget' in val &&
      !('filters' in val) &&
      !('mandatoryNiche' in val),
  );
}

export function evaluateCreatorForCampaign(
  creator: CreatorProfile,
  rawInput: CampaignMatchInput | Brief | CampaignBrief = {},
): CreatorMatchEvaluation {
  const input: CampaignMatchInput = isBriefObject(rawInput) ? { brief: rawInput } : rawInput;

  const weights: MatchingWeights = {
    ...DEFAULT_MATCHING_WEIGHTS,
    ...(input.weights ?? {}),
  };

  const criteriaList = input.mandatoryCriteria ?? [];
  const mandatory: MandatoryCriteriaConfig = {
    niche: input.mandatory?.niche ?? input.mandatoryNiche ?? criteriaList.includes('niche'),
    deliverables:
      input.mandatory?.deliverables ??
      input.mandatoryDeliverables ??
      (criteriaList.includes('deliverables') || criteriaList.includes('skills')),
    budget: input.mandatory?.budget ?? input.mandatoryBudget ?? criteriaList.includes('budget'),
    audienceSize:
      input.mandatory?.audienceSize ??
      input.mandatoryFollowers ??
      (criteriaList.includes('audience') || criteriaList.includes('audienceSize')),
    location: input.mandatory?.location ?? input.mandatoryLocation ?? criteriaList.includes('location'),
    language: input.mandatory?.language ?? criteriaList.includes('language'),
    verified:
      input.mandatory?.verified ??
      input.mandatoryVerified ??
      (criteriaList.includes('verification') || criteriaList.includes('verified')),
    commercialRights:
      input.mandatory?.commercialRights ??
      input.mandatoryCommercialRights ??
      criteriaList.includes('commercialRights'),
  };

  const filters = input.filters;
  const brief = input.brief;

  const factors: MatchFactorDetail[] = [];
  const satisfiedReasons: string[] = [];
  const missingRequirements: string[] = [];
  const mandatoryFailures: string[] = [];

  // ─── 1. Content Niche Alignment ────────────────────────────────────────────
  const targetNiches: string[] =
    input.niches && input.niches.length > 0
      ? input.niches
      : brief?.targetNiches && brief.targetNiches.length > 0
      ? brief.targetNiches
      : brief?.niches && brief.niches.length > 0
      ? brief.niches
      : filters?.niches && filters.niches.length > 0
      ? filters.niches
      : [];

  const creatorNiches = creator.niches ?? [];
  let nichePoints = 0;
  let nicheSatisfied = false;
  let nicheReason = '';

  if (targetNiches.length > 0) {
    const matchedNiches = targetNiches.filter((n) =>
      creatorNiches.some((cn) => cn.toLowerCase() === n.toLowerCase()),
    );
    if (matchedNiches.length > 0) {
      const ratio = matchedNiches.length / targetNiches.length;
      nichePoints = Math.round(weights.niche * (0.65 + 0.35 * ratio));
      nicheSatisfied = true;
      nicheReason = `Matches niche: ${matchedNiches.join(', ')}`;
      satisfiedReasons.push(nicheReason);
    } else {
      nichePoints = 0;
      nicheSatisfied = false;
      nicheReason = `Missing required niche (${targetNiches.join(', ')})`;
      missingRequirements.push(nicheReason);
      if (mandatory.niche) mandatoryFailures.push(nicheReason);
    }
  } else {
    // No specific niche filter set: score based on actual profile completeness (do not award full points if empty)
    if (creatorNiches.length > 0) {
      nichePoints = Math.round(weights.niche * 0.75);
      nicheSatisfied = true;
      nicheReason = `Specializes in ${creatorNiches.slice(0, 2).join(', ')}`;
      satisfiedReasons.push(nicheReason);
    } else {
      nichePoints = 0;
      nicheSatisfied = false;
      nicheReason = 'Creator profile has no listed content niches';
      missingRequirements.push(nicheReason);
    }
  }

  factors.push({
    key: 'niche',
    label: 'Content Niche',
    earnedPoints: nichePoints,
    maxPoints: weights.niche,
    score: nichePoints,
    maxScore: weights.niche,
    satisfied: nicheSatisfied,
    status: nicheSatisfied ? 'satisfied' : nichePoints > 0 ? 'partial' : 'missing',
    isMandatory: Boolean(mandatory.niche),
    reason: nicheReason,
  });

  // ─── 2. Skills & Deliverables Satisfaction ─────────────────────────────────
  const targetRequirements: string[] = [
    ...(input.deliverables ?? []),
    ...(input.requiredDeliverables ?? []),
    ...(brief?.requiredSkills ?? []),
    ...(brief?.skillsRequired ?? []),
    ...(brief?.contentType ?? []),
    ...(brief?.deliverables ?? []),
  ];
  const uniqueRequirements = Array.from(new Set(targetRequirements.map((r) => r.trim()).filter(Boolean)));

  const creatorCapabilities = [
    ...(creator.contentTypes ?? []),
    ...(creator.skills ?? []),
    ...(creator.specializations ?? []),
    ...(creator.portfolioItems?.flatMap((p) => [p.type, ...(p.tools ?? []), ...(p.tags ?? [])]) ?? []),
  ].map((s) => s.toLowerCase());

  let skillsPoints = 0;
  let skillsSatisfied = false;
  let skillsReason = '';

  if (uniqueRequirements.length > 0) {
    const matchedReqs = uniqueRequirements.filter((req) =>
      creatorCapabilities.some((cap) => cap.includes(req.toLowerCase()) || req.toLowerCase().includes(cap)),
    );
    const missingReqs = uniqueRequirements.filter((req) => !matchedReqs.includes(req));

    if (matchedReqs.length > 0) {
      const ratio = matchedReqs.length / uniqueRequirements.length;
      skillsPoints = Math.round(weights.skillsAndDeliverables * ratio);
      skillsSatisfied = ratio >= 0.5;
      skillsReason = `Satisfies ${matchedReqs.length}/${uniqueRequirements.length} deliverables/skills (${matchedReqs.slice(0, 2).join(', ')})`;
      satisfiedReasons.push(skillsReason);
    } else {
      skillsPoints = 0;
      skillsSatisfied = false;
      skillsReason = `Missing deliverables/skills: ${missingReqs.slice(0, 3).join(', ')}`;
    }

    if (missingReqs.length > 0) {
      const missMsg = `Missing skill/deliverable: ${missingReqs.slice(0, 3).join(', ')}`;
      missingRequirements.push(missMsg);
      if (mandatory.deliverables) mandatoryFailures.push(missMsg);
    }
  } else {
    // Score strictly on documented skills & portfolio evidence (missing info gets 0)
    const hasSkills = (creator.skills?.length ?? 0) > 0;
    const hasContentTypes = (creator.contentTypes?.length ?? 0) > 0;
    const hasPortfolio = (creator.portfolioItems?.length ?? 0) > 0;
    const completeness = (hasSkills ? 0.4 : 0) + (hasContentTypes ? 0.3 : 0) + (hasPortfolio ? 0.3 : 0);
    skillsPoints = Math.round(weights.skillsAndDeliverables * completeness * 0.8);
    skillsSatisfied = completeness >= 0.7;
    if (skillsSatisfied) {
      skillsReason = `Offers ${(creator.contentTypes ?? []).slice(0, 2).join(', ')}`;
      satisfiedReasons.push(skillsReason);
    } else {
      skillsReason = 'Incomplete deliverable or portfolio history on profile';
      missingRequirements.push(skillsReason);
    }
  }

  factors.push({
    key: 'skillsAndDeliverables',
    label: 'Skills & Deliverables',
    earnedPoints: skillsPoints,
    maxPoints: weights.skillsAndDeliverables,
    score: skillsPoints,
    maxScore: weights.skillsAndDeliverables,
    satisfied: skillsSatisfied,
    status: skillsSatisfied ? 'satisfied' : skillsPoints > 0 ? 'partial' : 'missing',
    isMandatory: Boolean(mandatory.deliverables),
    reason: skillsReason,
  });

  // ─── 3. Budget Fit ─────────────────────────────────────────────────────────
  let budgetPoints = 0;
  let budgetSatisfied = false;
  let budgetReason = '';

  const maxHourlyBudget =
    input.maxHourlyRate !== undefined
      ? input.maxHourlyRate
      : brief?.budget?.type === 'hourly'
      ? brief.budget.max
      : brief?.budget
      ? Math.max(50, Math.round(brief.budget.max / 20))
      : input.maxTotalBudget
      ? Math.max(50, Math.round(input.maxTotalBudget / 20))
      : filters?.maxRate && filters.maxRate < 10000
      ? filters.maxRate
      : null;

  if (typeof creator.hourlyRate !== 'number' || creator.hourlyRate <= 0) {
    budgetPoints = 0;
    budgetSatisfied = false;
    budgetReason = 'Creator hourly rate is not specified';
    missingRequirements.push(budgetReason);
  } else if (maxHourlyBudget !== null) {
    if (creator.hourlyRate <= maxHourlyBudget) {
      const headroom = Math.min(1, Math.max(0, (maxHourlyBudget - creator.hourlyRate) / maxHourlyBudget));
      budgetPoints = Math.round(weights.budget * (0.8 + 0.2 * headroom));
      budgetSatisfied = true;
      budgetReason = `Within budget ($${creator.hourlyRate}/hr ≤ $${maxHourlyBudget}/hr)`;
      satisfiedReasons.push(budgetReason);
    } else {
      const overageRatio = (creator.hourlyRate - maxHourlyBudget) / maxHourlyBudget;
      budgetPoints = overageRatio <= 0.25 ? Math.round(weights.budget * 0.3) : 0;
      budgetSatisfied = false;
      budgetReason = `Rate $${creator.hourlyRate}/hr exceeds budget cap ($${maxHourlyBudget}/hr)`;
      missingRequirements.push(budgetReason);
      if (mandatory.budget) mandatoryFailures.push(budgetReason);
    }
  } else {
    budgetPoints = Math.round(weights.budget * 0.75);
    budgetSatisfied = true;
    budgetReason = `Listed rate: $${creator.hourlyRate}/hr`;
  }

  factors.push({
    key: 'budget',
    label: 'Budget Fit',
    earnedPoints: budgetPoints,
    maxPoints: weights.budget,
    score: budgetPoints,
    maxScore: weights.budget,
    satisfied: budgetSatisfied,
    status: budgetSatisfied ? 'satisfied' : budgetPoints > 0 ? 'partial' : 'missing',
    isMandatory: Boolean(mandatory.budget),
    reason: budgetReason,
  });

  // ─── 4. Audience Size & Platform Reach ─────────────────────────────────────
  const minFollowers =
    input.minFollowers ?? brief?.minFollowersRequired ?? brief?.minFollowers ?? filters?.minFollowers ?? 0;
  const maxFollowers =
    input.maxFollowers ??
    (filters?.maxFollowers && filters.maxFollowers < 50000000 ? filters.maxFollowers : null);
  const targetPlatforms =
    input.platforms && input.platforms.length > 0
      ? input.platforms
      : brief?.platform && brief.platform.length > 0
      ? brief.platform
      : brief?.platforms && brief.platforms.length > 0
      ? brief.platforms
      : filters?.platforms && filters.platforms.length > 0
      ? filters.platforms
      : [];

  let audiencePoints = 0;
  let audienceSatisfied = false;
  let audienceReason = '';

  const totalFollowers = creator.totalFollowers ?? 0;
  const hasPlatforms = (creator.platforms?.length ?? 0) > 0 && totalFollowers > 0;
  const platformMatched =
    targetPlatforms.length === 0 ||
    targetPlatforms.some((tp) =>
      creator.platforms?.some((cp) => cp.platform.toLowerCase() === tp.toLowerCase()),
    );

  if (!hasPlatforms) {
    audiencePoints = 0;
    audienceSatisfied = false;
    audienceReason = 'No connected platform follower metrics';
    missingRequirements.push(audienceReason);
    if (mandatory.audienceSize) mandatoryFailures.push(audienceReason);
  } else {
    const meetsMin = totalFollowers >= minFollowers;
    const meetsMax = maxFollowers === null || totalFollowers <= maxFollowers;

    if (meetsMin && meetsMax && platformMatched) {
      audiencePoints = weights.audienceSize;
      audienceSatisfied = true;
      audienceReason = `Audience reach (${totalFollowers.toLocaleString()}) fits target range`;
      satisfiedReasons.push(audienceReason);
    } else {
      audiencePoints = 0;
      audienceSatisfied = false;
      const issues: string[] = [];
      if (!meetsMin) issues.push(`below min ${minFollowers.toLocaleString()} followers`);
      if (!meetsMax && maxFollowers) issues.push(`above max ${maxFollowers.toLocaleString()} followers`);
      if (!platformMatched) issues.push(`not active on ${targetPlatforms.join('/')}`);
      audienceReason = `Audience mismatch: ${issues.join(', ')}`;
      missingRequirements.push(audienceReason);
      if (mandatory.audienceSize) mandatoryFailures.push(audienceReason);
    }
  }

  factors.push({
    key: 'audienceSize',
    label: 'Audience Size & Platforms',
    earnedPoints: audiencePoints,
    maxPoints: weights.audienceSize,
    score: audiencePoints,
    maxScore: weights.audienceSize,
    satisfied: audienceSatisfied,
    status: audienceSatisfied ? 'satisfied' : audiencePoints > 0 ? 'partial' : 'missing',
    isMandatory: Boolean(mandatory.audienceSize),
    reason: audienceReason,
  });

  // ─── 5. Engagement Rate Quality ────────────────────────────────────────────
  const avgEngagement = getCreatorAvgEngagement(creator);
  const minEng = input.minEngagementRate ?? 0;
  let engagementPoints = 0;
  let engagementSatisfied = false;
  let engagementReason = '';

  if (avgEngagement <= 0) {
    engagementPoints = 0;
    engagementSatisfied = false;
    engagementReason = 'Engagement rate data missing';
    missingRequirements.push(engagementReason);
  } else if (minEng > 0 && avgEngagement < minEng) {
    engagementPoints = Math.round(weights.engagement * (avgEngagement / minEng) * 0.4);
    engagementSatisfied = false;
    engagementReason = `Avg engagement ${avgEngagement}% is below ${minEng}% target`;
    missingRequirements.push(engagementReason);
  } else {
    // Scale proportionally between 2% and 8%+ engagement
    const normalized = Math.min(1, Math.max(0.3, avgEngagement / 7.5));
    engagementPoints = Math.round(weights.engagement * normalized);
    engagementSatisfied = true;
    engagementReason = `${avgEngagement}% avg platform engagement`;
    satisfiedReasons.push(engagementReason);
  }

  factors.push({
    key: 'engagement',
    label: 'Engagement Quality',
    earnedPoints: engagementPoints,
    maxPoints: weights.engagement,
    score: engagementPoints,
    maxScore: weights.engagement,
    satisfied: engagementSatisfied,
    status: engagementSatisfied ? 'satisfied' : engagementPoints > 0 ? 'partial' : 'missing',
    isMandatory: false,
    reason: engagementReason,
  });

  // ─── 6. Location, Region & Language Alignment ──────────────────────────────
  const targetRegions =
    input.regions && input.regions.length > 0 ? input.regions : filters?.regions ?? [];
  const targetCountries =
    input.countries && input.countries.length > 0
      ? input.countries
      : brief?.targetCountries && brief.targetCountries.length > 0
      ? brief.targetCountries
      : filters?.countries ?? [];
  const targetCities =
    input.cities && input.cities.length > 0
      ? input.cities
      : brief?.targetRegions && brief.targetRegions.length > 0
      ? brief.targetRegions
      : brief?.targetLocations && brief.targetLocations.length > 0
      ? brief.targetLocations
      : filters?.cities ?? [];
  const targetLanguages =
    input.languages && input.languages.length > 0
      ? input.languages
      : brief?.requiredLanguages && brief.requiredLanguages.length > 0
      ? brief.requiredLanguages
      : filters?.languages ?? [];

  let locLangPoints = 0;
  let locLangSatisfied = false;
  let locLangReason = '';

  const hasLocationConstraint =
    targetRegions.length > 0 || targetCountries.length > 0 || targetCities.length > 0;
  const hasLanguageConstraint = targetLanguages.length > 0;

  if (!creator.location?.country && !creator.location?.city) {
    locLangPoints = 0;
    locLangSatisfied = false;
    locLangReason = 'Location information missing from profile';
    missingRequirements.push(locLangReason);
    if (mandatory.location) mandatoryFailures.push(locLangReason);
  } else if (hasLocationConstraint || hasLanguageConstraint) {
    const creatorLocText = [
      creator.location?.city,
      creator.location?.state,
      creator.location?.country,
      creator.location?.region,
      creator.locationDisplay,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const regionOk =
      targetRegions.length === 0 ||
      targetRegions.some((r) => creatorLocText.includes(r.toLowerCase())) ||
      targetRegions.some((r) => r.toLowerCase() === 'global');
    const countryOk =
      targetCountries.length === 0 ||
      targetCountries.some((c) => creatorLocText.includes(c.toLowerCase()));
    const cityOk =
      targetCities.length === 0 ||
      targetCities.some(
        (city) =>
          creatorLocText.includes(city.toLowerCase()) ||
          city.toLowerCase().includes(creator.location?.country?.toLowerCase() || '__none__') ||
          city.toLowerCase() === 'global' ||
          creator.location?.region?.toLowerCase() === city.toLowerCase(),
      );
    const langOk =
      targetLanguages.length === 0 ||
      targetLanguages.some((lang) =>
        creator.languages?.some((cl) => cl.toLowerCase() === lang.toLowerCase()),
      );

    const locPassed = regionOk && countryOk && cityOk;
    if (locPassed && langOk) {
      locLangPoints = weights.locationAndLanguage;
      locLangSatisfied = true;
      locLangReason = `Matches location (${creator.locationDisplay})${
        hasLanguageConstraint ? ` & language (${creator.languages?.slice(0, 2).join(', ')})` : ''
      }`;
      satisfiedReasons.push(locLangReason);
    } else {
      locLangPoints = locPassed || langOk ? Math.round(weights.locationAndLanguage * 0.4) : 0;
      locLangSatisfied = false;
      const locMiss: string[] = [];
      if (!locPassed) locMiss.push(`Location (${creator.locationDisplay}) outside target region`);
      if (!langOk) locMiss.push(`Missing language (${targetLanguages.join(', ')})`);
      locLangReason = locMiss.join(' & ');
      missingRequirements.push(locLangReason);
      if (!locPassed && mandatory.location) mandatoryFailures.push(locLangReason);
      if (!langOk && mandatory.language) mandatoryFailures.push(locLangReason);
    }
  } else {
    const hasLangs = (creator.languages?.length ?? 0) > 0;
    locLangPoints = Math.round(weights.locationAndLanguage * (hasLangs ? 0.8 : 0.4));
    locLangSatisfied = true;
    locLangReason = `Based in ${creator.locationDisplay}`;
  }

  factors.push({
    key: 'locationAndLanguage',
    label: 'Location & Language',
    earnedPoints: locLangPoints,
    maxPoints: weights.locationAndLanguage,
    score: locLangPoints,
    maxScore: weights.locationAndLanguage,
    satisfied: locLangSatisfied,
    status: locLangSatisfied ? 'satisfied' : locLangPoints > 0 ? 'partial' : 'missing',
    isMandatory: Boolean(mandatory.location || mandatory.language),
    reason: locLangReason,
  });

  // ─── 7. Verification & Trust Signals ───────────────────────────────────────
  const verifiedBadges = (creator.verifications ?? []).filter(
    (v) => v.verified === true && v.status !== 'pending' && v.status !== 'rejected',
  );
  const requireVerified = Boolean(
    input.requireVerified || brief?.requireVerifiedCreator || filters?.verified || mandatory.verified,
  );

  let trustPoints = 0;
  let trustSatisfied = false;
  let trustReason = '';

  if (verifiedBadges.length > 0) {
    const badgeRatio = Math.min(1, verifiedBadges.length / 2);
    const ratingFactor = creator.rating && creator.reviewCount > 0 ? Math.min(1, creator.rating / 5) : 0.5;
    trustPoints = Math.round(weights.verificationAndTrust * (0.6 * badgeRatio + 0.4 * ratingFactor));
    trustSatisfied = true;
    trustReason = `${verifiedBadges.length} verified trust signal${verifiedBadges.length > 1 ? 's' : ''}`;
    satisfiedReasons.push(trustReason);
  } else {
    // Missing verification never increases score
    trustPoints = 0;
    trustSatisfied = false;
    trustReason = 'Unverified creator profile (self-reported metrics)';
    if (requireVerified) {
      missingRequirements.push('Missing required creator verification badge');
      if (mandatory.verified) mandatoryFailures.push('Missing required creator verification badge');
    }
  }

  factors.push({
    key: 'verificationAndTrust',
    label: 'Verification & Trust',
    earnedPoints: trustPoints,
    maxPoints: weights.verificationAndTrust,
    score: trustPoints,
    maxScore: weights.verificationAndTrust,
    satisfied: trustSatisfied,
    status: trustSatisfied ? 'satisfied' : trustPoints > 0 ? 'partial' : 'missing',
    isMandatory: Boolean(mandatory.verified),
    reason: trustReason,
  });

  // ─── 8. Commercial Licensing Compatibility ─────────────────────────────────
  const exclusivityMode: 'exclusive' | 'non-exclusive' | 'limited' =
    input.requireExclusivity === true || input.requireExclusivity === 'exclusive'
      ? 'exclusive'
      : input.requireExclusivity === 'limited'
      ? 'limited'
      : 'non-exclusive';

  const targetCommercial: CommercialUse | Brief | CampaignBrief | undefined = brief
    ? brief
    : input.requireCommercialRights || input.requireExclusivity
    ? {
        allowed: true,
        exclusivity: exclusivityMode,
        licenseDuration: '6 months',
        territory: 'Global',
        platforms: targetPlatforms,
      }
    : undefined;

  const commercialCompatibility = checkCommercialCompatibility(targetCommercial, creator);
  let commPoints = 0;
  let commSatisfied = false;
  let commReason = '';

  if (commercialCompatibility.compatible) {
    const hasCommercialItems = creator.portfolioItems?.some((item) => item.commercialLicense) ?? false;
    const licensing = creator.defaultLicensing ?? creator.licensingTerms;
    if (
      hasCommercialItems ||
      licensing?.commercialAllowed ||
      licensing?.commercialUseAllowed ||
      licensing?.defaultLicenseType === 'commercial_exclusive' ||
      licensing?.defaultLicenseType === 'commercial_non_exclusive'
    ) {
      commPoints = weights.commercialRights;
      commSatisfied = true;
      commReason = 'Commercial licensing cleared';
      satisfiedReasons.push(commReason);
    } else {
      commPoints = 0;
      commSatisfied = false;
      commReason = 'No commercial license history documented';
      if (input.requireCommercialRights) missingRequirements.push(commReason);
    }
  } else {
    commPoints = 0;
    commSatisfied = false;
    commReason = commercialCompatibility.conflicts[0] ?? 'Commercial licensing conflict';
    missingRequirements.push(commReason);
    if (mandatory.commercialRights || input.requireCommercialRights) {
      mandatoryFailures.push(commReason);
    }
  }

  factors.push({
    key: 'commercialRights',
    label: 'Commercial Rights',
    earnedPoints: commPoints,
    maxPoints: weights.commercialRights,
    score: commPoints,
    maxScore: weights.commercialRights,
    satisfied: commSatisfied,
    status: commSatisfied ? 'satisfied' : commPoints > 0 ? 'partial' : 'missing',
    isMandatory: Boolean(mandatory.commercialRights),
    reason: commReason,
  });

  const totalMax = Object.values(weights).reduce((a, b) => a + b, 0);
  const totalEarned = factors.reduce((sum, f) => sum + f.earnedPoints, 0);
  const rawScore = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
  const clampedScore = Math.min(100, Math.max(0, rawScore));
  const allMandatoryMet = mandatoryFailures.length === 0;

  return {
    score: clampedScore,
    totalScore: clampedScore,
    overallScore: clampedScore,
    mandatoryMet: allMandatoryMet,
    meetsAllMandatory: allMandatoryMet,
    avgEngagement,
    factors,
    satisfiedReasons,
    satisfiedRequirements: satisfiedReasons,
    missingRequirements,
    mandatoryFailures,
    commercialCompatibility,
    licensingCompatibility: commercialCompatibility,
  };
}
