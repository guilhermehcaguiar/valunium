export interface HealthResponse {
  data: { status: 'ok'; service: 'valunium-api'; version: 'v1' };
}

export interface ApiErrorResponse {
  error: { code: string; message: string };
  requestId: string;
}

/** Accept only an HTTP(S) origin, without credentials, path, query or fragment. */
export function parseHttpOrigin(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash || url.origin === 'null') {
    throw new Error('Invalid HTTP origin');
  }
  return url.origin;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  locale: string;
  timeZone: string;
}
export interface PortfolioSummary {
  id: string;
  name: string;
  description: string;
  baseCurrency: 'BRL';
  isPrimary: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Financial API transport values are decimal strings, never JS money numbers. */
export interface PositionView {assetId:string;quantity:string;cost:string;averagePrice:string;realized:string;income:string;marketValue:null;unrealized:null;quoteStatus:'UNAVAILABLE'}

export interface DashboardRow { label:string; [key:string]:string }
export interface DashboardGroup {
 currency:string;complete:boolean;cost:string|null;realized:string|null;income:string|null;openAssets:number|null;
 positions:{portfolioId:string;assetId:string;ticker:string;assetClass:string;quantity:string;cost:string;averagePrice:string}[];
 byClass:DashboardRow[];byAsset:DashboardRow[];capital:DashboardRow[];incomeSeries:DashboardRow[];realizedSeries:DashboardRow[];
}
export interface DashboardData {
 portfolios:{id:string;name:string;currency:string;incomplete:boolean;eventCount:number}[];
 totalPortfolios:number;eventCount:number;status:string;groups:DashboardGroup[];
 recentTransactions:DashboardRecent[];recentIncome:DashboardRecent[];
 from:string;to:string;quoteStatus:'UNAVAILABLE';
}
export interface DashboardRecent {id:string;portfolioId:string;portfolio:string;currency:string;ticker:string;date:string;kind:string;gross:string;total:string}
