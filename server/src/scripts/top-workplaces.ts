// Constants
const TOP_WORKPLACES_COUNT = 3; // Number of top workplaces to fetch
const WORKPLACE_BASE_URL = process.env.BASE_URL || process.env.API_URL || "http://localhost:3000"; // try to catch a env var first

/**
 * This script will go through each workplace and count how many shifts
 * have been completed there. It will then output the top n workplaces in order of
 * most shifts completed, with ties broken by name (alphabetical).
 */
async function getTopWorkplaces(n: number) {
  // Fetch all pages of workplaces and shifts
  let workplaces = await workplacesFetchAllPages(`${WORKPLACE_BASE_URL}/workplaces`);
  const shifts = await workplacesFetchAllPages(`${WORKPLACE_BASE_URL}/shifts`);

  // Filter to include only active workplaces (status = 0)
  workplaces = workplaces.filter((workplace: any) => workplace.status === 0);

  // Counter map to track shifts per workplace
  const shiftCounter = new Map<number, number>();
  shifts.forEach((shift: any) => {
    if (shift.cancelledAt === null && shift.workplaceId !== null) {
      shiftCounter.set(shift.workplaceId, (shiftCounter.get(shift.workplaceId) || 0) + 1);
    }
  });

  // Sort workplaces in descending order based on shifts completed, then name as a tiebreaker
  workplaces.sort((a: any, b: any) => {
    const shiftsA = shiftCounter.get(a.id) || 0;
    const shiftsB = shiftCounter.get(b.id) || 0;

    // First, sort by shifts completed (descending)
    if (shiftsB !== shiftsA) {
      return shiftsB - shiftsA;
    }

    // Finally, sort by name (alphabetical order)
    return a.name.localeCompare(b.name);
  });

  // Grab the top n workplaces
  let topWorkplaces = [];
  for (let i = 0; i < Math.min(n, workplaces.length); i++) {
    const workplace = workplaces[i];
    topWorkplaces.push({
      name: workplace.name,
      shifts: shiftCounter.get(workplace.id) || 0,
    });
  }

  console.log(topWorkplaces);
}

/**
 *
 * @param url - the initial URL to fetch data from
 *
 * @returns all pages of data from the given API request
 *
 * This function handles pagination by following 'next' links in the API response
 * until there are no more pages left to fetch. And returns a combined array of all data.
 */
async function workplacesFetchAllPages(url: string): Promise<any[]> {
  let allData: any[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    try {
      const response: Response = await fetch(nextUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }

      const data: { data: any[]; links?: { next?: string } } = await response.json();

      allData = allData.concat(data.data);

      // Update the next URL if it exists, otherwise set it to null to exit the loop
      nextUrl = data.links?.next || null;
    } catch (error) {
      // Narrow the type of `error`
      if (error instanceof Error) {
        console.error(`Error fetching data from ${nextUrl}:`, error.message);
        throw new Error(`Unable to fetch data from API: ${error.message}`);
      } else {
        console.error(`Unknown error fetching data from ${nextUrl}:`, error);
        throw new Error(`Unable to fetch data from API: ${String(error)}`);
      }
    }
  }

  return allData;
}

// Run the script for the top workplaces
getTopWorkplaces(TOP_WORKPLACES_COUNT);
