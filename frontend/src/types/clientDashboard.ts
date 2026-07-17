export interface ClientDashboardKPIs {
  totalRevenue: number;
  prevRevenue: number;
  revenueGrowth: number;
  approvedCount: number;
  prevApprovedCount: number;
  countGrowth: number;
  averageTicket: number;
  prevAverageTicket: number;
  ticketGrowth: number;
  maxRevenueOS: {
    valor: number;
    numero: string;
    data: string;
  } | null;
}

export interface MonthlyData {
  mes: string;
  receita: number;
  quantidade: number;
  ano: number;
  mesIndex: number;
}

export interface RevenueByService {
  name: string;
  value: number;
}

export interface RevenueByUnit {
  name: string;
  value: number;
}

export interface ClientRanking {
  position: number;
  percentageOfCompany: number;
  totalClients: number;
}

export interface DashboardTableData {
  id: string;
  numero: string;
  tipo: string;
  data: string;
  valor: number;
  status: string;
}

export interface ClientDashboardResponse {
  kpis: ClientDashboardKPIs;
  monthlyData: MonthlyData[];
  revenueByService: RevenueByService[];
  revenueByUnit: RevenueByUnit[];
  ranking: ClientRanking;
  tableData: DashboardTableData[];
}
