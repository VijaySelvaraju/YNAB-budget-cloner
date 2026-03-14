import * as ynab from 'ynab'

function makeClient(token: string) {
  return new ynab.API(token)
}

export interface Budget {
  id: string
  name: string
}

/** Validates the token and returns the list of budgets (plans in v4). */
export async function fetchBudgets(token: string): Promise<Budget[]> {
  const client = makeClient(token)
  const resp = await client.plans.getPlans()
  return resp.data.plans.map((p) => ({ id: p.id, name: p.name }))
}

/** Returns all open, non-deleted accounts for a budget. */
export async function fetchAccounts(
  token: string,
  budgetId: string,
): Promise<ynab.Account[]> {
  const client = makeClient(token)
  const resp = await client.accounts.getAccounts(budgetId)
  return resp.data.accounts.filter((a) => !a.deleted && !a.closed)
}
