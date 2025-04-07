export interface GeocodingResponse {
  result: {
    addressMatches: Array<{
      geographies: {
        'Census Block Groups': Array<{
          STATE: string;
          COUNTY: string;
          TRACT: string;
          BLKGRP: string;
        }>;
      };
    }>;
  };
}

export interface CensusResponse {
  data: Array<Array<string | number>>;
}
