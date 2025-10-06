// Constants
const TOP_WORKERS_COUNT = 3; // Number of top workers to fetch
const WORKER_BASE_URL = process.env.BASE_URL || process.env.API_URL || "http://localhost:3000";

/**
 * This script will go through each worker and count how many shifts
 * they've completed. It will then output the top n workers in order of
 * most shifts completed, with ties broken by name (alphabetical).
 */
async function getTopWorkers(n: number) {
  // Fetch all pages of workers and shifts
  let workers = await workerFetchAllPages(`${WORKER_BASE_URL}/workers`);
  const shifts = await workerFetchAllPages(`${WORKER_BASE_URL}/shifts`);

  // Filter to include only active workers (status = 0)
  workers = workers.filter((worker: any) => worker.status === 0);

  // Counter map to track shifts per worker
  const shiftCounter = new Map<number, number>();
  shifts.forEach((shift: any) => {
    if (shift.cancelledAt === null && shift.workerId !== null) {
      shiftCounter.set(shift.workerId, (shiftCounter.get(shift.workerId) || 0) + 1);
    }
  });

  // Sort workers in descending order based on shifts completed, then name as a tiebreaker
  workers.sort((a: any, b: any) => {
    const shiftsA = shiftCounter.get(a.id) || 0;
    const shiftsB = shiftCounter.get(b.id) || 0;

    // First, sort by shifts completed (descending)
    if (shiftsB !== shiftsA) {
      return shiftsB - shiftsA;
    }

    // Finally, sort by name (alphabetical order)
    return a.name.localeCompare(b.name);
  });

  // Grab the top n workers
  let topWorkers = [];
  for (let i = 0; i < Math.min(n, workers.length); i++) {
    const worker = workers[i];
    topWorkers.push({
      name: worker.name,
      shifts: shiftCounter.get(worker.id) || 0,
    });
  }

  console.log(topWorkers);
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
async function workerFetchAllPages(url: string): Promise<any[]> {
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

// Run the script for the top workers
getTopWorkers(TOP_WORKERS_COUNT);
