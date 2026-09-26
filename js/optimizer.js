// ═══════════════════════════════════════════
// OPTIMIZER.JS — AI-like optimization engine
// ═══════════════════════════════════════════

const AUDIENCE_PROFILES = {
  millennials:       { age: '18-34', interests: ['fashion','lifestyle','tech'], peakHour: 20, ctr: 3.8 },
  'gen-z':           { age: '13-24', interests: ['gaming','social','music'],   peakHour: 22, ctr: 4.2 },
  'tech-enthusiasts':{ age: '25-45', interests: ['gadgets','software','ai'],   peakHour: 19, ctr: 3.1 },
  families:          { age: '28-45', interests: ['family','home','education'],  peakHour: 18, ctr: 2.7 },
  professionals:     { age: '30-55', interests: ['business','finance','career'],peakHour: 7,  ctr: 2.4 },
  seniors:           { age: '50-70', interests: ['health','travel','finance'],  peakHour: 10, ctr: 1.9 }
};

const KEYWORD_BANK = {
  fashion:    ['trendy','style guide','outfit ideas','fashion sale','seasonal deals','new collection'],
  tech:       ['best gadgets','product review','tech deals','innovation','smart device','must-have'],
  health:     ['wellness tips','healthy living','fitness goals','nutrition guide','self-care'],
  finance:    ['save money','invest smart','financial freedom','best rates','secure future'],
  gaming:     ['epic games','level up','pro tips','best gaming gear','esports','new release'],
  general:    ['limited offer','exclusive deal','shop now','save big','top rated','best seller']
};

function generateOptimizationSuggestions(campaign) {
  const audience = AUDIENCE_PROFILES[campaign.audience] || AUDIENCE_PROFILES.millennials;
  const ctr = ((campaign.clicks / (campaign.impressions || 1)) * 100).toFixed(2);
  const spent = campaign.spent;
  const budget = campaign.budget;
  const spendRatio = spent / (budget || 1);

  const suggestions = [];

  // Keyword suggestions
  const relevantKws = getRelevantKeywords(campaign);
  suggestions.push({
    type: 'keywords',
    icon: '🔑',
    title: 'High-Impact Keywords',
    score: 'high',
    scoreLabel: '94% Match',
    desc: `Based on your "${campaign.audience}" audience, these keywords can boost CTR by up to 35%:`,
    items: relevantKws.slice(0, 5),
    action: 'Apply Keywords'
  });

  // Time scheduling
  const peakHour = audience.peakHour;
  const peakEnd  = (peakHour + 3) % 24;
  suggestions.push({
    type: 'schedule',
    icon: '⏰',
    title: 'Peak Performance Window',
    score: 'high',
    scoreLabel: '89% Confidence',
    desc: `Your target audience is most active between ${peakHour}:00 – ${peakEnd}:00. Scheduling ads in this window can increase impressions by 47%.`,
    items: [`${peakHour}:00 – ${peakEnd}:00 daily`, 'Weekends: +23% engagement', 'Avoid: 2:00 – 6:00 AM (lowest activity)'],
    action: 'Schedule Now'
  });

  // Audience expansion
  suggestions.push({
    type: 'audience',
    icon: '🎯',
    title: 'Audience Expansion',
    score: 'medium',
    scoreLabel: '76% Opportunity',
    desc: `Consider expanding to adjacent audiences for greater reach while maintaining relevance.`,
    items: getAudienceExpansions(campaign.audience),
    action: 'Expand Audience'
  });

  // Budget optimization
  if (spendRatio > 0.8) {
    suggestions.push({
      type: 'budget',
      icon: '💰',
      title: 'Budget Increase Recommended',
      score: 'high',
      scoreLabel: 'Urgent',
      desc: `Your campaign has consumed ${(spendRatio*100).toFixed(0)}% of its budget with strong performance. Increasing by $${Math.round(budget * 0.5)} could yield 3x more conversions.`,
      items: [`Current CTR: ${ctr}% (above average)`, `Projected new conversions: +${Math.round(campaign.conversions * 0.4)}`, 'ROI estimate: 180%'],
      action: 'Increase Budget'
    });
  } else if (ctr < 2) {
    suggestions.push({
      type: 'creative',
      icon: '🎨',
      title: 'Creative Refresh Needed',
      score: 'medium',
      scoreLabel: '72% Impact',
      desc: `Your CTR of ${ctr}% is below the ${audience.ctr}% average for this audience. Try refreshing your ad creative.`,
      items: ['Use high-contrast images', 'Add a clear call-to-action', 'Test video format (avg +62% CTR)', 'Personalize headline copy'],
      action: 'Get Templates'
    });
  }

  // Retargeting
  suggestions.push({
    type: 'retargeting',
    icon: '🔄',
    title: 'Retargeting Opportunity',
    score: 'medium',
    scoreLabel: '81% Potential',
    desc: `${Math.round(campaign.clicks * 0.7)} visitors clicked but didn't convert. Retargeting them can boost conversion by 150%.`,
    items: ['Custom audience from clickers', '7-day retargeting window', 'Use dynamic product ads', 'Offer first-time discount'],
    action: 'Set Up Retargeting'
  });

  return suggestions;
}

function getRelevantKeywords(campaign) {
  const kws = new Set();
  const audience = campaign.audience || '';
  const title    = (campaign.title || '').toLowerCase();

  if (audience.includes('tech') || title.includes('tech') || title.includes('pro') || title.includes('x1'))
    KEYWORD_BANK.tech.forEach(k => kws.add(k));
  if (audience.includes('fashion') || title.includes('sale') || title.includes('summer'))
    KEYWORD_BANK.fashion.forEach(k => kws.add(k));
  if (audience === 'families' || title.includes('holiday') || title.includes('gift'))
    KEYWORD_BANK.general.forEach(k => kws.add(k));
  if (audience === 'professionals')
    KEYWORD_BANK.finance.forEach(k => kws.add(k));
  if (audience === 'gen-z')
    KEYWORD_BANK.gaming.forEach(k => kws.add(k));

  if (kws.size === 0) KEYWORD_BANK.general.forEach(k => kws.add(k));

  // Also include campaign-specified keywords
  (campaign.keywords || []).forEach(k => kws.add(k));
  return [...kws];
}

function getAudienceExpansions(audience) {
  const expansions = {
    millennials:        ['Gen-Z (18-24)', 'Young professionals (25-34)', 'Digital natives'],
    'gen-z':            ['Millennials (25-35)', 'College students', 'Content creators'],
    'tech-enthusiasts': ['Early adopters', 'Professionals (30-45)', 'Gaming community'],
    families:           ['Parents (28-40)', 'Home owners', 'Education seekers'],
    professionals:      ['Entrepreneurs', 'Senior management', 'Finance professionals'],
    seniors:            ['Active retirees', 'Health-conscious 45+', 'Travel enthusiasts']
  };
  return expansions[audience] || ['Lookalike audiences', 'Interest-based expansion', 'Geographic expansion'];
}
