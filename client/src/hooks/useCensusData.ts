import { useState } from 'react';
import { fetchGeocodingData, fetchCensusData } from '../api/api';

interface CensusData {
  name: string;
  totalHousingUnits: number;
  ownerOccupied: number;
  renterOccupied: number;
}

export const useCensusData = () => {
  const [data, setData] = useState<CensusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (address: string, city: string, state: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const geocodingResponse = await fetchGeocodingData(address, city, state);
      if (!geocodingResponse.result.addressMatches.length) {
        throw new Error('No address matches found');
      }

      const blockGroup = geocodingResponse.result.addressMatches[0].geographies['Census Block Groups'][0];

      const censusResponse = await fetchCensusData(blockGroup.STATE, blockGroup.COUNTY);

      // Process response (headers are in first array element)
      const censusData = censusResponse[1]; // Actual data is in second element
      setData({
        name: censusData[0] as string,
        totalHousingUnits: Number(censusData[1]),
        ownerOccupied: Number(censusData[2]),
        renterOccupied: Number(censusData[3])
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch census data');
    } finally {
      setLoading(false);
    }
  };

  const resetData = () => {
    setData(null);
    setError(null);
    setLoading(false);
  };

  return { data, loading, error, fetchData, resetData };
};