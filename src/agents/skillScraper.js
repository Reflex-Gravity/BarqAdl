const axios = require('axios');
const cheerio = require('cheerio');
const { invokeModel, MODELS } = require('../config/bedrock');
const { loadPrompt } = require('../utils/promptLoader');
const { readJSON, writeJSON } = require('../config/db');
const { safeJsonParse } = require('../utils/helpers');

const SCRAPER_PROMPT = loadPrompt('skill-scraper');

const SEARCH_QUERIES = {
  labor: [
    'UAE labor law MOHRE complaint process',
    'Federal Decree-Law 33 2021 UAE employment rights',
    'UAE wage protection system WPS rules',
    'end of service gratuity calculation UAE',
    'UAE termination notice period labor law',
  ],
  tenancy: [
    'Dubai rental dispute RERA process',
    'Dubai tenancy law eviction rules',
    'RERA rent calculator Dubai increase',
    'security deposit return Dubai law',
    'Ejari registration process Dubai',
  ],
  commercial: [
    'UAE business setup mainland vs freezone',
    'Dubai trade license DED application',
    'UAE commercial companies law 2021',
    'DMCC company formation process',
    'UAE corporate tax 2023 rules',
  ],
  visa: [
    'UAE work permit process MOHRE',
    'UAE golden visa requirements 2024',
    'UAE visa cancellation grace period rules',
    'UAE residence visa dependent application',
    'overstay fine calculation UAE',
  ],
};

const getSearchQueries = (domain) => {
  return SEARCH_QUERIES[domain] || [`UAE ${domain} law regulations`];
};

const searchWeb = async (query) => {
  // Use a simple approach — try to fetch search results
  // For hackathon, we fall back to pre-cached skills if this fails
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BarqAdl/1.0)' },
    });
    const $ = cheerio.load(response.data);
    const results = [];
    $('.result__a').each((i, el) => {
      if (i < 3) {
        results.push({
          title: $(el).text(),
          url: $(el).attr('href'),
        });
      }
    });
    return results;
  } catch {
    return [];
  }
};

const extractContent = async (url) => {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BarqAdl/1.0)' },
      maxRedirects: 3,
    });
    const $ = cheerio.load(response.data);
    // Remove scripts, styles, nav, footer
    $('script, style, nav, footer, header, .sidebar, .cookie-banner').remove();
    const text = $('main, article, .content, body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000); // Limit to 5k chars
    return text;
  } catch {
    return '';
  }
};

const equip = async (domain, trace) => {
  const span = trace.span({ name: `skill-scraper-${domain}` });

  // First, check if we have pre-cached skills
  const cached = readJSON(`skills/${domain}.json`);
  if (cached && cached.skills && cached.skills.length > 0) {
    console.log(`[SkillScraper] Using cached skills for "${domain}" (${cached.skills.length} skills)`);
    span.end({ output: { skills_count: cached.skills.length, source: 'cache' } });
    trace.event({ name: 'skills_loaded_from_cache', metadata: { domain, count: cached.skills.length } });
    return cached;
  }

  // Try web scraping
  const queries = getSearchQueries(domain);
  const rawContent = [];

  for (const query of queries) {
    try {
      const results = await searchWeb(query);
      if (results.length > 0 && results[0].url) {
        const content = await extractContent(results[0].url);
        if (content) {
          rawContent.push(`Source: ${query}\n${content}`);
        }
      }
    } catch (e) {
      console.error(`[SkillScraper] Scrape failed for: ${query}`, e.message);
    }
  }

  let skills;

  if (rawContent.length > 0) {
    // Use Bedrock to structure raw content into skills
    try {
      const raw = await invokeModel(SCRAPER_PROMPT,
        `Domain: ${domain}\n\nRaw content:\n${rawContent.join('\n---\n')}\n\nExtract and structure skills.`,
        { model: MODELS.scraper, temperature: 0.2, maxTokens: 4096 }
      );
      skills = safeJsonParse(raw);
    } catch (e) {
      console.error(`[SkillScraper] Bedrock structuring failed for "${domain}":`, e.message);
      skills = null;
    }
  }

  // If scraping failed, use fallback skills
  if (!skills || !skills.skills) {
    skills = generateFallbackSkills(domain);
  }

  // Save skills
  writeJSON(`skills/${domain}.json`, skills);

  const count = skills.skills?.length || 0;
  span.end({ output: { skills_count: count, source: rawContent.length > 0 ? 'web' : 'fallback' } });
  trace.event({ name: 'new_skills_acquired', metadata: { domain, count } });

  return skills;
};

const generateFallbackSkills = (domain) => {
  const fallbacks = {
    labor: {
      domain: 'labor',
      skills_found: 5,
      skills: [
        {
          skill_id: 'labor_complaint_001',
          domain: 'labor',
          topic: 'mohre_complaint',
          title: 'MOHRE Labor Complaint Process',
          content: 'Employees can file labor complaints through MOHRE app, website (mohre.gov.ae), or by calling 600590000. MOHRE attempts mediation within 14 working days. If mediation fails, case is referred to labor court.',
          law_references: [{ law: 'Federal Decree-Law No. 33 of 2021', articles: ['54', '55'] }],
          procedures: ['File complaint via MOHRE app/website', 'MOHRE attempts mediation (14 days)', 'If unresolved, referral to labor court'],
          authorities: ['MOHRE', 'Labor Court'],
          confidence: 'high',
        },
        {
          skill_id: 'labor_wages_002',
          domain: 'labor',
          topic: 'unpaid_wages',
          title: 'Wage Protection System (WPS)',
          content: 'UAE Wage Protection System requires employers to pay wages through approved banks/exchange houses. Employers must pay within 10 days of due date per Article 54. WPS violations strengthen employee complaints.',
          law_references: [{ law: 'Federal Decree-Law No. 33 of 2021', articles: ['19', '54'] }, { law: 'Ministerial Resolution No. 43/2022', articles: [] }],
          procedures: ['Check if employer is WPS-compliant', 'Report WPS violation to MOHRE', 'Use WPS non-compliance as evidence in complaint'],
          authorities: ['MOHRE', 'Central Bank'],
          confidence: 'high',
        },
        {
          skill_id: 'labor_gratuity_003',
          domain: 'labor',
          topic: 'end_of_service_gratuity',
          title: 'End-of-Service Gratuity Calculation',
          content: 'Under Article 51: Less than 1 year = no gratuity. 1-5 years = 21 calendar days of basic salary per year. Over 5 years = 30 calendar days per year for years beyond 5. Maximum total = 2 years salary. Pro-rated for partial years.',
          law_references: [{ law: 'Federal Decree-Law No. 33 of 2021', articles: ['51', '52', '53'] }],
          procedures: ['Calculate based on basic salary only', 'Pro-rate for partial years', 'Deduct any outstanding loans to employer'],
          authorities: ['MOHRE', 'Labor Court'],
          confidence: 'high',
        },
        {
          skill_id: 'labor_termination_004',
          domain: 'labor',
          topic: 'termination_rules',
          title: 'Employment Termination Rules',
          content: 'Under the 2021 law, all contracts are fixed-term (max 3 years, renewable). Notice period: 30-90 days as per contract (minimum 30 days). Employer must provide written notice. Immediate termination allowed under Article 44 for gross misconduct.',
          law_references: [{ law: 'Federal Decree-Law No. 33 of 2021', articles: ['42', '43', '44', '45'] }],
          procedures: ['Review contract for notice period', 'Serve written notice', 'Calculate final settlement (gratuity + unused leave + pending salary)'],
          authorities: ['MOHRE'],
          confidence: 'high',
        },
        {
          skill_id: 'labor_legal_aid_005',
          domain: 'labor',
          topic: 'legal_aid',
          title: 'Free Legal Aid Resources',
          content: 'Tawafuq Legal Aid Centers provide free legal consultation. Legal Aid Department at Dubai Courts offers free representation for those who qualify. MOHRE complaints are free to file. Labor court cases under AED 100,000 are fee-exempt.',
          law_references: [],
          procedures: ['Contact Tawafuq (800-TAWAFUQ)', 'Visit Legal Aid Department at Dubai Courts', 'File free MOHRE complaint'],
          authorities: ['Tawafuq', 'Legal Aid Department', 'MOHRE'],
          confidence: 'high',
        },
      ],
      sources_accessed: ['mohre.gov.ae', 'moj.gov.ae'],
      scrape_timestamp: new Date().toISOString(),
    },
    tenancy: {
      domain: 'tenancy',
      skills_found: 5,
      skills: [
        {
          skill_id: 'tenancy_dispute_001',
          domain: 'tenancy',
          topic: 'rental_dispute',
          title: 'RERA Rental Dispute Process',
          content: 'Rental disputes in Dubai are handled by the Rental Dispute Settlement Centre (RDSC) under Dubai Land Department. Filing fee is 3.5% of annual rent (min AED 500, max AED 20,000). Cases can be filed online through DLD website.',
          law_references: [{ law: 'Law No. 26 of 2007', articles: ['4', '25', '26'] }],
          procedures: ['Attempt direct resolution with landlord', 'File case at RDSC', 'Pay filing fee (3.5% annual rent)', 'Attend hearing', 'Receive judgment'],
          authorities: ['RERA', 'RDSC', 'Dubai Land Department'],
          confidence: 'high',
        },
        {
          skill_id: 'tenancy_eviction_002',
          domain: 'tenancy',
          topic: 'eviction_rules',
          title: 'Dubai Eviction Rules',
          content: 'Landlord can only evict for specific reasons: personal use (12 months notice via notary), demolition/renovation (12 months + municipality approval), non-payment (30 days notice), illegal use (immediate). All notices must be via notary public or registered mail.',
          law_references: [{ law: 'Law No. 26 of 2007', articles: ['25', '26'] }, { law: 'Law No. 33 of 2008', articles: [] }],
          procedures: ['Verify if eviction notice was served properly (notary/registered mail)', 'Check if reason is legally valid', 'If invalid, file dispute at RDSC', 'Request stay if needed'],
          authorities: ['RDSC', 'RERA'],
          confidence: 'high',
        },
        {
          skill_id: 'tenancy_rent_increase_003',
          domain: 'tenancy',
          topic: 'rent_increase',
          title: 'RERA Rent Increase Calculator',
          content: 'Rent increases governed by RERA Rent Index. 0% if up to 10% below index. 5% if 11-20% below. 10% if 21-30% below. 15% if 31-40% below. 20% if more than 40% below. Landlord must give 90 days written notice.',
          law_references: [{ law: 'Decree No. 43 of 2013', articles: [] }],
          procedures: ['Check current rent vs RERA index (rera.gov.ae/rental-increase)', 'Calculate maximum allowed increase', 'If landlord exceeds, refuse and file at RDSC'],
          authorities: ['RERA'],
          confidence: 'high',
        },
        {
          skill_id: 'tenancy_deposit_004',
          domain: 'tenancy',
          topic: 'security_deposit',
          title: 'Security Deposit Rules',
          content: 'Standard security deposit is 5% of annual rent for unfurnished, 10% for furnished. Must be returned within 30 days of lease end minus legitimate deductions. Deductions require documented proof of damage beyond normal wear and tear.',
          law_references: [{ law: 'Law No. 26 of 2007', articles: ['20'] }],
          procedures: ['Document property condition at move-in and move-out', 'Request deposit return in writing', 'If refused, file at RDSC'],
          authorities: ['RDSC'],
          confidence: 'high',
        },
        {
          skill_id: 'tenancy_ejari_005',
          domain: 'tenancy',
          topic: 'ejari_registration',
          title: 'Ejari Registration',
          content: 'All Dubai tenancy contracts must be registered in Ejari. Registration is required for DEWA connection, visa processing, and legal standing in disputes. Contracts not registered in Ejari may not be enforceable.',
          law_references: [{ law: 'Law No. 26 of 2007', articles: [] }],
          procedures: ['Register at Ejari typing center or online', 'Provide: passport, visa, Emirates ID, contract, DEWA bill', 'Fee: ~AED 220'],
          authorities: ['Ejari', 'Dubai Land Department'],
          confidence: 'high',
        },
      ],
      sources_accessed: ['rera.gov.ae', 'dubailand.gov.ae'],
      scrape_timestamp: new Date().toISOString(),
    },
    commercial: {
      domain: 'commercial',
      skills_found: 4,
      skills: [
        {
          skill_id: 'commercial_setup_001',
          domain: 'commercial',
          topic: 'business_setup',
          title: 'Mainland vs Free Zone Business Setup',
          content: 'Mainland (DED): 100% foreign ownership since 2021 FDI law, can trade anywhere in UAE, requires local office/Ejari. Free Zone: 100% foreign ownership always, trade restricted to free zone + international, package deals available, faster setup.',
          law_references: [{ law: 'Federal Decree-Law No. 32 of 2021', articles: [] }, { law: 'Federal Decree-Law No. 19 of 2018 (FDI)', articles: [] }],
          procedures: ['Determine business activity', 'Choose mainland vs free zone', 'Apply for initial approval', 'Prepare MOA/AOA', 'Get trade license', 'Register with authorities'],
          authorities: ['DED', 'DMCC', 'DIFC', 'ADGM'],
          confidence: 'high',
        },
        {
          skill_id: 'commercial_tax_002',
          domain: 'commercial',
          topic: 'corporate_tax',
          title: 'UAE Corporate Tax Rules',
          content: '9% corporate tax on profits above AED 375,000 (effective June 2023). Free zone entities may qualify for 0% on qualifying income. VAT at 5% since 2018. Annual filing required.',
          law_references: [{ law: 'Federal Decree-Law No. 47 of 2022', articles: [] }],
          procedures: ['Register for corporate tax with FTA', 'Maintain proper accounting records', 'File annual tax return', 'Pay within 9 months of financial year end'],
          authorities: ['Federal Tax Authority'],
          confidence: 'high',
        },
        {
          skill_id: 'commercial_license_003',
          domain: 'commercial',
          topic: 'trade_license',
          title: 'Trade License Application',
          content: 'DED trade license types: Commercial, Professional, Industrial. Process: choose activity → get initial approval → choose trade name → prepare MOA → get external approvals → pay fees → receive license.',
          law_references: [{ law: 'Federal Decree-Law No. 32 of 2021', articles: [] }],
          procedures: ['Select business activity from DED list', 'Get initial approval', 'Reserve trade name', 'Submit documents', 'Pay fees (~AED 15,000-30,000)', 'Collect license'],
          authorities: ['DED', 'Municipality'],
          confidence: 'high',
        },
        {
          skill_id: 'commercial_ubo_004',
          domain: 'commercial',
          topic: 'compliance',
          title: 'UBO Disclosure & ESR',
          content: 'Ultimate Beneficial Owner (UBO) disclosure required for all UAE entities. Economic Substance Regulations (ESR) require entities with relevant activities to demonstrate adequate substance in UAE.',
          law_references: [{ law: 'Cabinet Resolution No. 58 of 2020', articles: [] }],
          procedures: ['Submit UBO disclosure within 60 days of incorporation', 'File annual ESR notification', 'Maintain substance requirements if applicable'],
          authorities: ['Ministry of Economy', 'National Assessing Authority'],
          confidence: 'medium',
        },
      ],
      sources_accessed: ['ded.ae', 'mof.gov.ae'],
      scrape_timestamp: new Date().toISOString(),
    },
    visa: {
      domain: 'visa',
      skills_found: 5,
      skills: [
        {
          skill_id: 'visa_work_permit_001',
          domain: 'visa',
          topic: 'work_permit',
          title: 'UAE Work Permit Process',
          content: 'Employer applies through MOHRE. Process: job offer → MOHRE approval → entry permit → medical + Emirates ID → work permit + residence visa stamped. Total processing: 2-4 weeks.',
          law_references: [{ law: 'Federal Decree-Law No. 29 of 2020', articles: [] }],
          procedures: ['Employer submits application to MOHRE', 'MOHRE issues work permit', 'Employee enters on entry permit', 'Medical fitness test', 'Emirates ID application', 'Visa stamping'],
          authorities: ['MOHRE', 'GDRFA', 'ICA'],
          confidence: 'high',
        },
        {
          skill_id: 'visa_golden_002',
          domain: 'visa',
          topic: 'golden_visa',
          title: 'Golden Visa Requirements',
          content: '10-year residence visa. Categories: Investors (AED 2M+ property/business), Specialized Talent (doctors, engineers, scientists), Entrepreneurs (AED 500K+ project), Outstanding Students (3.8+ GPA from UAE universities), Humanitarian workers.',
          law_references: [{ law: 'Cabinet Resolution No. 65 of 2022', articles: [] }],
          procedures: ['Determine eligibility category', 'Prepare supporting documents', 'Apply through ICP smart services or GDRFA', 'Attend biometrics if required', 'Receive visa within 30 days'],
          authorities: ['ICP', 'GDRFA'],
          confidence: 'high',
        },
        {
          skill_id: 'visa_cancellation_003',
          domain: 'visa',
          topic: 'visa_cancellation',
          title: 'Visa Cancellation & Grace Period',
          content: 'Employment visa: 30-day grace period after cancellation. During grace period, can find new employer or exit. Overstay after grace: AED 50/day fine. Employer-initiated cancellation requires settling all dues.',
          law_references: [{ law: 'Federal Decree-Law No. 29 of 2020', articles: [] }],
          procedures: ['Employer initiates cancellation through GDRFA', 'Employee receives 30-day grace period', 'Find new sponsor or prepare to exit', 'Return Emirates ID upon exit'],
          authorities: ['GDRFA', 'MOHRE'],
          confidence: 'high',
        },
        {
          skill_id: 'visa_overstay_004',
          domain: 'visa',
          topic: 'overstay_fines',
          title: 'Overstay Fines & Penalties',
          content: 'Visit visa: 10-day grace after expiry, then AED 50/day. Residence visa: 30-day grace after cancellation. Accumulated fines can result in travel ban. Amnesty periods occasionally offered.',
          law_references: [{ law: 'Federal Decree-Law No. 29 of 2020', articles: [] }],
          procedures: ['Check visa status on ICA smart services', 'Calculate accumulated fines', 'Pay fines at immigration or airport', 'Apply for amnesty if available'],
          authorities: ['GDRFA', 'ICA'],
          confidence: 'high',
        },
        {
          skill_id: 'visa_ban_005',
          domain: 'visa',
          topic: 'ban_types',
          title: 'UAE Ban Types',
          content: 'Labor ban: MOHRE-imposed, largely abolished under new law for most cases. Immigration ban: GDRFA-imposed for violations. Absconding ban: employer reports worker as absconding, can be contested at MOHRE. Check status via MOHRE app or ICA services.',
          law_references: [{ law: 'Federal Decree-Law No. 33 of 2021', articles: [] }, { law: 'Federal Decree-Law No. 29 of 2020', articles: [] }],
          procedures: ['Check ban status through MOHRE/ICA', 'If wrongful absconding report, file counter-complaint at MOHRE', 'Obtain clearance letter if resolved', 'Labor ban can be lifted by new employer request'],
          authorities: ['MOHRE', 'GDRFA', 'ICA'],
          confidence: 'high',
        },
      ],
      sources_accessed: ['icp.gov.ae', 'gdrfa.gov.ae', 'mohre.gov.ae'],
      scrape_timestamp: new Date().toISOString(),
    },
  };

  return fallbacks[domain] || {
    domain,
    skills_found: 1,
    skills: [{
      skill_id: `${domain}_general_001`,
      domain,
      topic: 'general',
      title: `General ${domain} Law Overview`,
      content: `General UAE ${domain} law information. For specific guidance, consult official government portals.`,
      law_references: [],
      procedures: ['Consult relevant government authority', 'Seek professional legal advice'],
      authorities: ['Ministry of Justice'],
      confidence: 'low',
    }],
    sources_accessed: [],
    scrape_timestamp: new Date().toISOString(),
  };
};

module.exports = { equip, getSearchQueries, generateFallbackSkills };
