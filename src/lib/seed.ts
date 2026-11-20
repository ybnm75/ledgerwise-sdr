import type { Evidence, Lead } from "@/lib/types";

const capturedAt = "2026-11-20T10:00:00.000Z";
const jobsUrl = "https://dtcmvp.com/jobs/?department=Finance+/+Accounting";

type SeedCompany = {
  company: string;
  domain: string;
  category: string;
  location: string;
  role: string;
  siteClaim: string;
  jobClaim: string;
};

const companies: SeedCompany[] = [
  { company: "Naked Wardrobe", domain: "nakedwardrobe.com", category: "Apparel", location: "Los Angeles, CA", role: "Chief Financial Officer", siteClaim: "The brand sells apparel directly through its online store.", jobClaim: "Chief Financial Officer" },
  { company: "Bobo's", domain: "eatbobos.com", category: "Food", location: "Loveland, CO", role: "Chief Financial Officer", siteClaim: "The brand sells oat bars and snacks online.", jobClaim: "Chief Financial Officer" },
  { company: "Nulo", domain: "nulo.com", category: "Pet food", location: "Austin, TX", role: "Finance Director", siteClaim: "The company sells pet nutrition products online.", jobClaim: "Finance Director" },
  { company: "Evvy", domain: "evvy.com", category: "Women's health", location: "New York, NY", role: "VP Finance", siteClaim: "The company sells at-home health tests online.", jobClaim: "VP Finance" },
  { company: "Ingrid & Isabel", domain: "ingridandisabel.com", category: "Apparel", location: "San Francisco, CA", role: "Director, Finance & Accounting", siteClaim: "The brand sells maternity apparel online.", jobClaim: "Director, Finance & Accounting" },
  { company: "Sakara Life", domain: "sakara.com", category: "Food", location: "New York, NY", role: "Senior Manager of Finance and Operations", siteClaim: "The company sells meal programs and wellness products online.", jobClaim: "Senior Manager of Finance and Operations" },
  { company: "Olivela", domain: "olivela.com", category: "Fashion marketplace", location: "New York, NY", role: "Financial Controller", siteClaim: "The company operates an online luxury fashion store.", jobClaim: "Financial Controller" },
  { company: "Lakanto", domain: "lakanto.com", category: "Food", location: "Orem, UT", role: "Payroll & Accounting Specialist", siteClaim: "The brand sells sweeteners and food products online.", jobClaim: "Payroll & Accounting Specialist" },
  { company: "Case-Mate", domain: "case-mate.com", category: "Accessories", location: "Atlanta, GA", role: "Financial Controller", siteClaim: "The brand sells device cases and accessories online.", jobClaim: "Financial Controller" },
  { company: "hiyo", domain: "drinkhiyo.com", category: "Beverage", location: "United States", role: "Assistant Controller", siteClaim: "The brand sells non-alcoholic beverages online.", jobClaim: "Assistant Controller" },
  { company: "BikesOnline US", domain: "bikesonline.com", category: "Sporting goods", location: "San Clemente, CA", role: "Financial Controller", siteClaim: "The retailer sells bicycles directly online.", jobClaim: "Financial Controller" },
  { company: "Azalea Wang", domain: "azaleawang.com", category: "Apparel", location: "Chicago, IL", role: "Assistant Controller", siteClaim: "The brand sells footwear and apparel online.", jobClaim: "Assistant Controller" },
  { company: "Rookwood Pottery", domain: "rookwood.com", category: "Home", location: "Cincinnati, OH", role: "Controller", siteClaim: "The studio sells pottery and tile through its online store.", jobClaim: "Controller" },
  { company: "Lucy", domain: "lucy.co", category: "Consumer wellness", location: "United States", role: "Controller", siteClaim: "The brand sells nicotine alternatives online.", jobClaim: "Controller" },
  { company: "Minky Couture", domain: "softminkyblankets.com", category: "Home", location: "Ogden, UT", role: "Payroll / Accounting Assistant", siteClaim: "The brand sells blankets online.", jobClaim: "Payroll / Accounting Assistant" },
  { company: "MZ Wallace", domain: "mzwallace.com", category: "Accessories", location: "New York, NY", role: "Accounting Intern", siteClaim: "The brand sells bags directly through its online store.", jobClaim: "Accounting Intern Winter 2026" },
  { company: "Tori Richard", domain: "toririchard.com", category: "Apparel", location: "Honolulu, HI", role: "Controller", siteClaim: "The company sells resort apparel online.", jobClaim: "Controller" },
  { company: "Far Bank Enterprises", domain: "farbank.com", category: "Outdoor", location: "Seattle, WA", role: "Accounting Manager", siteClaim: "The company sells fly-fishing brands through online channels.", jobClaim: "Accounting Manager" },
  { company: "TONYMOLY USA", domain: "tonymoly.us", category: "Beauty", location: "Brooklyn, NY", role: "Accounting Associate", siteClaim: "The beauty brand sells skincare online in the US.", jobClaim: "Accounting Associate" },
  { company: "Magnolia", domain: "magnolia.com", category: "Home", location: "Waco, TX", role: "FP&A Manager", siteClaim: "The company sells home goods through an online store.", jobClaim: "Accounting & Finance, FP&A Manager" },
  { company: "Uproot Clean", domain: "uprootclean.com", category: "Pet care", location: "United States", role: "Finance Manager", siteClaim: "The consumer brand sells pet-hair cleaning products online.", jobClaim: "Finance Manager, CPA Required" },
  { company: "Maxine's Heavenly", domain: "maxinesheavenly.com", category: "Food", location: "Los Angeles, CA", role: "Finance leader", siteClaim: "The brand sells clean-label cookies online.", jobClaim: "Raised nearly $3M to scale production in June 2026" },
  { company: "Rivalz", domain: "rivalzsnacks.com", category: "Food", location: "United States", role: "Finance leader", siteClaim: "The brand sells protein snack products online.", jobClaim: "Raised $5M and launched a puff snack line in June 2026" },
  { company: "Bawi", domain: "drinkbawi.com", category: "Beverage", location: "Austin, TX", role: "Finance leader", siteClaim: "The brand sells agua fresca online and through retail.", jobClaim: "Closed a $6M round for West Coast retail and foodservice expansion" },
  { company: "Smash Foods", domain: "smashfoods.com", category: "Food", location: "United States", role: "Finance leader", siteClaim: "The brand sells packaged food products online.", jobClaim: "Raised $5M in May 2026" },
  { company: "Campo Grande", domain: "eatcampogrande.com", category: "Food", location: "United States", role: "Finance leader", siteClaim: "The brand sells Iberico pork online in the US.", jobClaim: "Raised $4M to expand in US grocery" },
  { company: "Olyra", domain: "olyrafoods.com", category: "Food", location: "United States", role: "Finance leader", siteClaim: "The brand sells breakfast biscuits online.", jobClaim: "Secured $3.5M in financing in February 2026" },
  { company: "Just Ice Tea", domain: "justicetea.com", category: "Beverage", location: "Bethesda, MD", role: "Finance leader", siteClaim: "The brand sells bottled tea online and in retail.", jobClaim: "Reported a $9M funding round in February 2026" },
  { company: "Throne Sport Coffee", domain: "thronesportcoffee.com", category: "Beverage", location: "United States", role: "Finance leader", siteClaim: "The brand sells ready-to-drink coffee online.", jobClaim: "Reported a $10M funding round in February 2026" },
  { company: "FoodNerd", domain: "foodnerdinc.com", category: "Food", location: "Buffalo, NY", role: "Finance leader", siteClaim: "The brand sells sprouted food products online.", jobClaim: "Reported a $7.5M funding round in January 2026" }
];

function evidenceFor(company: SeedCompany, index: number): Evidence[] {
  const fundingSource = index >= 21;
  return [
    {
      id: `e-${index}-commerce`,
      kind: "commerce",
      claim: company.siteClaim,
      quote: company.siteClaim,
      url: `https://${company.domain}`,
      sourceTitle: `${company.company} online store`,
      capturedAt
    },
    {
      id: `e-${index}-trigger`,
      kind: "trigger",
      claim: fundingSource ? company.jobClaim : `${company.company} is recruiting for ${company.role}.`,
      quote: company.jobClaim,
      url: fundingSource
        ? "https://taylorsicard.com/the-index/consumer-brand-funding-rounds"
        : jobsUrl,
      sourceTitle: fundingSource ? "Consumer Brand Funding Rounds" : "DTC finance and accounting jobs",
      capturedAt
    },
    {
      id: `e-${index}-location`,
      kind: "location",
      claim: `${company.company} operates in ${company.location}.`,
      quote: company.location,
      url: fundingSource ? `https://${company.domain}` : jobsUrl,
      sourceTitle: fundingSource ? `${company.company} website` : "DTC finance and accounting jobs",
      capturedAt
    }
  ];
}

function draftFor(company: SeedCompany, evidence: Evidence[]) {
  const trigger = evidence.find((item) => item.kind === "trigger")?.claim ?? "your recent growth";
  return {
    subject: `${company.company} finance operations`,
    body: `Hi there,\n\nI saw that ${trigger} ${company.siteClaim} Channel reconciliation and month-end work can get complicated quickly.\n\nLedgerwise handles monthly bookkeeping for ecommerce brands. Would it be useful to compare notes on your current close?\n\nBest,\nLedgerwise`,
    status: "pending" as const
  };
}

export const seedLeads: Lead[] = companies.map((company, index) => {
  const evidence = evidenceFor(company, index);
  const score = index < 21 ? 70 : 70;
  return {
    id: `lead-${String(index + 1).padStart(2, "0")}`,
    company: company.company,
    domain: company.domain,
    category: company.category,
    location: company.location,
    contactName: null,
    contactRole: company.role,
    score,
    status: "review",
    rationale: "US ecommerce evidence and a current finance or funding trigger are sourced. Company size and revenue still need verification before outreach.",
    gaps: ["Employee count", "Revenue range", "Named decision-maker"],
    evidence,
    draft: draftFor(company, evidence)
  };
});
