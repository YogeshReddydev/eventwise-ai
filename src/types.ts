export type Priority = 'High' | 'Medium' | 'Low';
export type VendorStatus = 'Not contacted' | 'Contacted' | 'Quote received' | 'Booked' | 'Paid';

export interface BudgetCategory {
  name: string;
  amount: number;
  essential: boolean;
}

export interface PlanningTask {
  title: string;
  category?: string;
  due_date: string;
  priority: Priority;
  done: boolean;
}

export interface VendorItem {
  category: string;
  vendor: string;
  quote: number;
  status: VendorStatus;
}

export interface EventPlan {
  event_type: string;
  budget: number;
  guests: number;
  days_until_event: number;
  per_guest_budget: number;
  categories: BudgetCategory[];
  tasks: PlanningTask[];
  vendors: VendorItem[];
  assumptions: string[];
  recovery_notes?: string[];
  requires_user_approval?: boolean;
}

export interface AssistantResponse {
  mode: 'gemini' | 'demo' | 'fallback';
  answer: string;
}
