export function FreshStartContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>
        A Fresh Start creates a brand new budget that has all your accounts and category groups already in place, but with no transaction history. Your real budget is completely untouched.
      </p>
      <ul className="space-y-2">
        <li className="flex gap-2 text-green-700">
          <span className="font-bold">✅</span>
          <span><strong>DO</strong> understand that Fresh Start creates a brand new separate budget. Your real budget stays exactly as it is — every transaction, every balance, every category remains untouched.</span>
        </li>
        <li className="flex gap-2 text-green-700">
          <span className="font-bold">✅</span>
          <span><strong>DO</strong> think of it like making a structural copy. The Fresh Start budget will have all the same accounts and category groups as your real budget, but with no transaction history. This tool will then fill in the transactions.</span>
        </li>
        <li className="flex gap-2 text-green-700">
          <span className="font-bold">✅</span>
          <span><strong>DO</strong> give your sandbox budget an obvious name like "Sandbox – [today's date]" so you can always tell which budget you are looking at inside YNAB.</span>
        </li>
        <li className="flex gap-2 text-green-700">
          <span className="font-bold">✅</span>
          <span><strong>DO</strong> switch between budgets freely at any time by clicking the budget name in the top left corner of YNAB.</span>
        </li>
        <li className="flex gap-2 text-red-700">
          <span className="font-bold">❌</span>
          <span><strong>DO NOT</strong> create a brand new blank budget. A blank budget has none of your categories or accounts. This tool cannot create categories via the API, so it will have nothing to match against.</span>
        </li>
        <li className="flex gap-2 text-red-700">
          <span className="font-bold">❌</span>
          <span><strong>DO NOT</strong> confuse Fresh Start with losing your data. Fresh Start does not archive, reset, or affect your real budget in any way. It only creates something new.</span>
        </li>
        <li className="flex gap-2 text-red-700">
          <span className="font-bold">❌</span>
          <span><strong>DO NOT</strong> skip this step. If your sandbox budget does not have matching account names and category names, transactions will fail to copy and be skipped.</span>
        </li>
      </ul>
      <div className="pt-2">
        <p className="font-semibold mb-2">Steps:</p>
        <ol className="list-decimal list-inside space-y-1 ml-1 text-slate-800">
          <li>Open YNAB and make sure you are inside your real budget</li>
          <li>Click your budget name in the top left corner</li>
          <li>Select "Start Fresh" from the menu</li>
          <li>Follow the prompts and give the new budget a clear sandbox name</li>
          <li>Come back here and continue</li>
        </ol>
      </div>
      <div className="pt-2">
        <a
          href="https://support.ynab.com/plan-resets-and-fresh-starts-HkXYR_c0q"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline font-medium"
        >
          Open YNAB — Fresh Start documentation ↗
        </a>
      </div>
    </div>
  )
}
