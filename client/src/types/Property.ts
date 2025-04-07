export interface Property {
  id: string;
  latitude: number;
  longitude: number;
  property_address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  year_built: number;
  created_at: string;
  // New fields
  occupancy_rate?: number;
  parking_spaces?: number;
  has_ev_charging?: boolean;
  redevelopment_opportunities?: string;
}