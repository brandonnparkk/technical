import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { Property } from '../types/Property';

export const uploadCsv = async (file: File) => {
  const formData = new FormData();
  formData.append('csvFile', file);
  const response = await axios.post(`/api/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const fetchData = async () => {
  const response = await axios.get(`/api/data`);
  return response.data;
};

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const fetchProperties = async (): Promise<Property[]> => {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('updated_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

export const updateProperty = async (property: Partial<Property>) => {
  const { data, error } = await supabase
    .from('properties')
    .update(property)
    .eq('id', property.id)
    .select();
  
  if (error) throw error;
  return data[0];
};

export const fetchGeocodingData = async (address: string, city: string, state: string) => {
  const response = await axios.get(
    '/api/census/geocode',
    {
      params: { street: address, city, state }
    }
  );
  return response.data;
};

export const fetchCensusData = async (state: string, county: string) => {
  const response = await axios.get(
    '/api/census/census-data',
    {
      params: { state, county }
    }
  );
  return response.data;
};