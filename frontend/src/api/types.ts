import type { components } from './schema'

export type Filing = components['schemas']['Filing']
export type Digest = components['schemas']['Digest']
export type DigestWindow = components['schemas']['DigestWindow']
export type RoutineGroup = components['schemas']['RoutineGroup']
export type Alert = components['schemas']['Alert']
export type AlertKind = components['schemas']['AlertKind']
export type Category = components['schemas']['Category']
export type Priority = components['schemas']['Priority']
export type ResultsCard = components['schemas']['ResultsCard']
export type BioCard = components['schemas']['BioCard']
export type OneLiner = components['schemas']['OneLiner']
export type ResultsMetric = components['schemas']['ResultsMetric']
export type PriceReaction = components['schemas']['PriceReaction']
export type PriceSnapshot = components['schemas']['PriceSnapshot']
export type Company = components['schemas']['Company']
export type CompanyList = components['schemas']['CompanyList']
export type CompanySummary = components['schemas']['CompanySummary']
export type CompanyFilings = components['schemas']['CompanyFilings']
export type Health = components['schemas']['Health']

export type Research = components['schemas']['Research']
export type PvDItem = components['schemas']['PvDItem']
export type Claim = components['schemas']['Claim']
export type Source = components['schemas']['Source']
export type SourceDoc = components['schemas']['SourceDoc']
export type Verdict = components['schemas']['Verdict']
export type FinancialSnapshot = components['schemas']['FinancialSnapshot']
export type LlmStats = components['schemas']['LlmStats']
export type AskRequest = components['schemas']['AskRequest']
export type AskContext = components['schemas']['AskContext']
export type AskResponse = components['schemas']['AskResponse']

export interface PortfolioStock {
  nse_symbol: string
  bse_scrip_code?: string
  name: string
  sector?: string
  source?: string
}

export interface SnapshotMeta {
  as_of: string
  portfolio_size: number
  research_symbols: string[]
}

export interface Settings {
  volume_multiple: number
  volume_lookback_days: number
  price_move_pct: number
  categories_of_interest: Category[]
  muted_categories: Category[]
  default_window: '24h' | '3d' | '7d' | '30d' | 'custom'
}

export const ALL_CATEGORIES: { id: Category; label: string }[] = [
  { id: 'results', label: 'Financial Results' },
  { id: 'm_and_a', label: 'M&A / Acquisitions' },
  { id: 'fund_raise', label: 'Fund Raise' },
  { id: 'management_change', label: 'Management Change' },
  { id: 'litigation', label: 'Litigation / Legal' },
  { id: 'insider_trading', label: 'Insider Trading' },
  { id: 'earnings_call', label: 'Earnings Call' },
  { id: 'investor_meetings', label: 'Investor Meetings' },
  { id: 'credit_rating', label: 'Credit Rating' },
  { id: 'dividend', label: 'Dividend' },
  { id: 'bonus_split', label: 'Bonus / Split' },
  { id: 'capex', label: 'Capex' },
  { id: 'press_release', label: 'Press Release' },
  { id: 'postal_ballot', label: 'Postal Ballot' },
  { id: 'agm_egm', label: 'AGM / EGM' },
  { id: 'pledging', label: 'Promoter Pledging' },
  { id: 'unclassified', label: 'Unclassified' },
]

export const DEFAULT_SETTINGS: Settings = {
  volume_multiple: 2.0,
  volume_lookback_days: 20,
  price_move_pct: 5.0,
  categories_of_interest: [
    'results',
    'm_and_a',
    'management_change',
    'fund_raise',
    'litigation',
    'pledging',
  ],
  muted_categories: ['unclassified'],
  default_window: '24h',
}

// Network (the investor's contacts; the demo network is SYNTHETIC)
export type NetworkPerson = components['schemas']['NetworkPerson']
export type NetworkJob = components['schemas']['NetworkJob']
export type NetworkEdu = components['schemas']['NetworkEdu']
export type PersonMatch = components['schemas']['PersonMatch']
export type NetworkInsight = components['schemas']['NetworkInsight']
export type WarmNudge = components['schemas']['WarmNudge']
export type ExpertiseTheme = components['schemas']['ExpertiseTheme']
export type NetworkAskResponse = components['schemas']['NetworkAskResponse']
export type AgentStep = components['schemas']['AgentStep']
