// Shape of the Jolpica/Ergast driverStandings response. If you repoint API_BASE
// at your own SportsFusion backend, redefine these (or map your response into
// DriverStanding) and the screen keeps working unchanged.

export interface Driver {
  driverId: string;
  permanentNumber?: string;
  code?: string;
  givenName: string;
  familyName: string;
  nationality?: string;
}

export interface Constructor {
  constructorId: string;
  name: string;
  nationality?: string;
}

export interface DriverStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Driver: Driver;
  Constructors: Constructor[];
}

export interface ErgastStandingsResponse {
  MRData?: {
    StandingsTable?: {
      season?: string;
      StandingsLists?: Array<{
        season: string;
        round: string;
        DriverStandings: DriverStanding[];
      }>;
    };
  };
}
